/**
 * Configuration options for the Enumify Vite plugin.
 */
export interface EnumifyOptions {
  /**
   * PHP binary path.
   * @default "php"
   */
  artisanBin?: string;

  /**
   * Path to the artisan file.
   * @default "artisan"
   */
  artisanFile?: string;

  /**
   * Artisan command to run for syncing enums.
   * @default "enumify:sync"
   */
  syncCommand?: string;

  /**
   * Working directory for the command.
   * @default process.cwd()
   */
  cwd?: string;

  /**
   * Whether to watch for changes in development mode.
   * Defaults to the Laravel enumify config runtime.watch setting.
   */
  watch?: boolean;

  /**
   * Additional environment variables for the command.
   * @default {}
   */
  env?: Record<string, string>;
}

/**
 * Resolved configuration with defaults applied.
 */
export interface ResolvedEnumifyOptions {
  artisanBin: string;
  artisanFile: string;
  syncCommand: string;
  cwd: string;
  watch: boolean;
  env: Record<string, string>;
}
