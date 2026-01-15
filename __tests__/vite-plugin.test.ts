import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enumify } from "../src/vite-plugin-enumify";

vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

const spawnMock = spawn as unknown as ReturnType<typeof vi.fn>;

function createTempProject(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "enumify-"));
  fs.mkdirSync(path.join(tempDir, "config"), { recursive: true });
  return tempDir;
}

function writeEnumifyConfig(cwd: string, contents: string): void {
  fs.writeFileSync(path.join(cwd, "config", "enumify.php"), contents, "utf8");
}

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    hasWarned: false,
    hasErrorLogged: false,
    clearScreen: vi.fn(),
  };
}

function mockSpawnExit(code = 0) {
  spawnMock.mockImplementation(() => ({
    on(event: string, handler: (value?: unknown) => void) {
      if (event === "close") {
        handler(code);
      }
      if (event === "error" && code !== 0) {
        handler(new Error("spawn error"));
      }
      return this;
    },
  }));
}

describe("vite-plugin-enumify", () => {
  beforeEach(() => {
    spawnMock.mockReset();
    mockSpawnExit(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs enum sync on build with defaults", async () => {
    const cwd = createTempProject();
    const plugin = enumify({ cwd });
    const logger = createLogger();

    plugin.configResolved?.({ command: "build", logger } as any);
    await plugin.buildStart?.call({ error: vi.fn() });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock).toHaveBeenCalledWith(
      "php",
      ["artisan", "enumify:sync", "--force", "--quiet"],
      expect.objectContaining({
        cwd,
        stdio: "inherit",
      }),
    );
  });

  it("respects configured enum paths for watching", () => {
    const cwd = createTempProject();
    writeEnumifyConfig(
      cwd,
      `<?php
return [
    'paths' => [
        'enums' => ['app/Enums', 'domain/Enums'],
        'output' => 'resources/js/enums',
    ],
    'runtime' => [
        'watch' => true,
    ],
];
`,
    );

    const plugin = enumify({ cwd });
    const logger = createLogger();
    const watcher = { add: vi.fn() };

    plugin.configResolved?.({ command: "serve", logger } as any);
    plugin.configureServer?.({ watcher } as any);

    expect(watcher.add).toHaveBeenCalledWith(path.join(cwd, "app/Enums"));
    expect(watcher.add).toHaveBeenCalledWith(path.join(cwd, "domain/Enums"));
  });

  it("ignores changes in output directory", () => {
    vi.useFakeTimers();
    const cwd = createTempProject();
    const plugin = enumify({ cwd });
    const logger = createLogger();

    plugin.configResolved?.({ command: "serve", logger } as any);
    plugin.handleHotUpdate?.({
      file: path.join(cwd, "resources/js/enums/Status.ts"),
    } as any);

    vi.advanceTimersByTime(300);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("triggers sync on enum changes when watching", () => {
    vi.useFakeTimers();
    const cwd = createTempProject();
    const plugin = enumify({ cwd });
    const logger = createLogger();

    plugin.configResolved?.({ command: "serve", logger } as any);
    plugin.handleHotUpdate?.({
      file: path.join(cwd, "app/Enums/Status.php"),
    } as any);

    vi.advanceTimersByTime(300);
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("does not watch when runtime.watch is false", () => {
    vi.useFakeTimers();
    const cwd = createTempProject();
    writeEnumifyConfig(
      cwd,
      `<?php
return [
    'paths' => [
        'enums' => ['app/Enums'],
        'output' => 'resources/js/enums',
    ],
    'runtime' => [
        'watch' => false,
    ],
];
`,
    );

    const plugin = enumify({ cwd });
    const logger = createLogger();
    const watcher = { add: vi.fn() };

    plugin.configResolved?.({ command: "serve", logger } as any);
    plugin.configureServer?.({ watcher } as any);
    plugin.handleHotUpdate?.({
      file: path.join(cwd, "app/Enums/Status.php"),
    } as any);

    vi.advanceTimersByTime(300);
    expect(watcher.add).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });
});
