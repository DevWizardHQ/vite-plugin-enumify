import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import type { Logger, Plugin, ResolvedConfig } from "vite";
import { EnumifyOptions, ResolvedEnumifyOptions } from "./types";

const DEFAULT_ENUM_PATHS = ["app/Enums"];
const DEFAULT_OUTPUT_PATH = "resources/js/enums";
const DEFAULT_WATCH = true;
const WATCH_DEBOUNCE_MS = 250;

interface EnumifyConfig {
  enumPaths: string[];
  outputPath: string;
  watch: boolean;
}

/**
 * Resolve options with defaults and Laravel enumify config values.
 */
function resolveOptions(options: EnumifyOptions = {}): {
  options: ResolvedEnumifyOptions;
  config: EnumifyConfig;
} {
  const cwd = options.cwd ?? process.cwd();
  const config = readEnumifyConfig(cwd);

  return {
    options: {
      artisanBin: options.artisanBin ?? "php",
      artisanFile: options.artisanFile ?? "artisan",
      syncCommand: options.syncCommand ?? "enumify:sync",
      cwd,
      watch: options.watch ?? config.watch,
      env: options.env ?? {},
    },
    config,
  };
}

function readEnumifyConfig(cwd: string): EnumifyConfig {
  const defaults: EnumifyConfig = {
    enumPaths: DEFAULT_ENUM_PATHS,
    outputPath: DEFAULT_OUTPUT_PATH,
    watch: DEFAULT_WATCH,
  };

  const configPath = path.join(cwd, "config", "enumify.php");

  if (!fs.existsSync(configPath)) {
    return defaults;
  }

  try {
    const contents = fs.readFileSync(configPath, "utf8");

    return {
      enumPaths: extractStringArray(contents, "enums") ?? defaults.enumPaths,
      outputPath: extractString(contents, "output") ?? defaults.outputPath,
      watch: extractBoolean(contents, "watch") ?? defaults.watch,
    };
  } catch {
    return defaults;
  }
}

function extractStringArray(contents: string, key: string): string[] | null {
  const match = new RegExp(
    `['"]${key}['"]\\s*=>\\s*\\[([\\s\\S]*?)\\]`,
    "m",
  ).exec(contents);

  if (!match) {
    return null;
  }

  const items: string[] = [];
  const itemRegex = /['"]([^'"]+)['"]/g;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemRegex.exec(match[1])) !== null) {
    items.push(itemMatch[1]);
  }

  return items.length > 0 ? items : null;
}

function extractString(contents: string, key: string): string | null {
  const match = new RegExp(
    `['"]${key}['"]\\s*=>\\s*['"]([^'"]+)['"]`,
    "m",
  ).exec(contents);

  return match ? match[1] : null;
}

function extractBoolean(contents: string, key: string): boolean | null {
  const match = new RegExp(`['"]${key}['"]\\s*=>\\s*(true|false)`, "mi").exec(
    contents,
  );

  if (!match) {
    return null;
  }

  return match[1].toLowerCase() === "true";
}

function toAbsolutePath(cwd: string, value: string): string {
  return path.isAbsolute(value) ? value : path.join(cwd, value);
}

function isPathInside(filePath: string, dirPath: string): boolean {
  const relative = path.relative(dirPath, filePath);

  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Laravel Enumify Vite plugin.
 */
export function enumify(options: EnumifyOptions = {}): Plugin {
  const { options: resolved, config } = resolveOptions(options);
  const enumDirs = config.enumPaths.map((enumPath) =>
    toAbsolutePath(resolved.cwd, enumPath),
  );
  const outputDir = toAbsolutePath(resolved.cwd, config.outputPath);

  let viteConfig: ResolvedConfig | null = null;
  let logger: Logger = console as unknown as Logger;
  let running = false;
  let rerunRequested = false;
  let initialSyncDone = false;

  const spawnSync = (): Promise<void> =>
    new Promise((resolve, reject) => {
      const args = [
        resolved.artisanFile,
        resolved.syncCommand,
        "--force",
        "--quiet",
      ];
      const child = spawn(resolved.artisanBin, args, {
        cwd: resolved.cwd,
        env: { ...process.env, ...resolved.env },
        stdio: "inherit",
      });

      child.on("error", (error) => reject(error));
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`Enumify sync failed with exit code ${code}`));
      });
    });

  const runSync = async (): Promise<void> => {
    if (running) {
      rerunRequested = true;
      return;
    }

    running = true;

    do {
      rerunRequested = false;
      await spawnSync();
      logger.info(
        "[plugin @devwizard/vite-plugin-enumify] Enum types generated successfully",
      );
    } while (rerunRequested);

    running = false;
  };

  const debouncedSync = debounce(() => {
    runSync().catch((error: Error) =>
      logger.error(`[enumify] ${error.message}`),
    );
  }, WATCH_DEBOUNCE_MS);

  return {
    name: "@devwizard/vite-plugin-enumify",
    enforce: "pre",

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig;
      logger = resolvedConfig.logger;
    },

    buildStart() {
      if (viteConfig?.command === "serve") {
        if (initialSyncDone) {
          return;
        }

        initialSyncDone = true;
      }

      return runSync().catch((error: Error) => {
        this.error(`[enumify] ${error.message}`);
      });
    },

    configureServer(server) {
      if (!resolved.watch) {
        return;
      }

      for (const enumDir of enumDirs) {
        server.watcher.add(enumDir);
      }
    },

    handleHotUpdate({ file }) {
      if (!resolved.watch) {
        return;
      }

      const filePath = path.resolve(file);

      if (isPathInside(filePath, outputDir)) {
        return;
      }

      for (const enumDir of enumDirs) {
        if (isPathInside(filePath, enumDir)) {
          debouncedSync();
          break;
        }
      }
    },
  };
}

// Default export
export default enumify;
