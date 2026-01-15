# @devwizard/vite-plugin-enumify

[![NPM Version](https://img.shields.io/npm/v/@devwizard/vite-plugin-enumify.svg?style=flat-square)](https://www.npmjs.com/package/@devwizard/vite-plugin-enumify)
[![NPM Downloads](https://img.shields.io/npm/dt/@devwizard/vite-plugin-enumify.svg?style=flat-square)](https://www.npmjs.com/package/@devwizard/vite-plugin-enumify)
[![Latest Version on Packagist](https://img.shields.io/packagist/v/devwizardhq/laravel-enumify.svg?style=flat-square)](https://packagist.org/packages/devwizardhq/laravel-enumify)
[![Packagist Downloads](https://img.shields.io/packagist/dt/devwizardhq/laravel-enumify.svg?style=flat-square)](https://packagist.org/packages/devwizardhq/laravel-enumify)
[![GitHub](https://img.shields.io/badge/repo-devwizardhq%2Flaravel--enumify-181717?style=flat-square&logo=github)](https://github.com/devwizardhq/laravel-enumify)

Vite plugin for [Laravel Enumify](https://github.com/devwizardhq/laravel-enumify) — automatically sync PHP enums to TypeScript during development and builds.

## Features

- Runs `php artisan enumify:sync --force --quiet` before Vite compiles
- Watches enum directories in dev mode (debounced)
- Reads `config/enumify.php` to discover paths and watch config
- Ignores changes inside the output directory to avoid infinite loops
- Cross-platform: Windows/macOS/Linux

## Package Links

- NPM: https://www.npmjs.com/package/@devwizard/vite-plugin-enumify
- Repository: https://github.com/devwizardhq/laravel-enumify
- Composer (Laravel package): https://packagist.org/packages/devwizardhq/laravel-enumify

## Installation

```bash
npm install @devwizard/vite-plugin-enumify --save-dev
# or
pnpm add -D @devwizard/vite-plugin-enumify
# or
yarn add -D @devwizard/vite-plugin-enumify
```

## Package Manager Support

This plugin is package-manager agnostic and works with npm, pnpm, or yarn. The runtime behavior is identical regardless of how you install it.

## Usage

Add the plugin to your `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import enumify from "@devwizard/vite-plugin-enumify";

export default defineConfig({
  plugins: [
    enumify(),
    laravel({
      input: ["resources/js/app.ts"],
      refresh: true,
    }),
  ],
});
```

## How It Works

1. **On Build Start**: runs `php artisan enumify:sync --force --quiet` before Vite compiles TypeScript.
2. **Watch Mode**: watches the enum paths from `config/enumify.php` and re-syncs on changes.
3. **Safe Output**: ignores changes under the output directory to avoid re-trigger loops.

## Options

```ts
enumify({
  // PHP binary path (default: "php")
  artisanBin: "php",

  // Path to the artisan file (default: "artisan")
  artisanFile: "artisan",

  // Command to run (default: "enumify:sync")
  syncCommand: "enumify:sync",

  // Working directory (default: process.cwd())
  cwd: process.cwd(),

  // Enable watch mode in development (default: runtime.watch from config/enumify.php)
  watch: true,

  // Additional environment variables
  env: {},
});
```

The plugin reads `config/enumify.php` to discover enum paths and output paths so it can watch the right files and avoid feedback loops.

## Example

Given this PHP enum:

```php
// app/Enums/OrderStatus.php
enum OrderStatus: string
{
    case PENDING = 'pending';
    case PROCESSING = 'processing';
    case SHIPPED = 'shipped';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::PROCESSING => 'Processing',
            self::SHIPPED => 'Shipped',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::PENDING => 'yellow',
            self::PROCESSING => 'blue',
            self::SHIPPED => 'green',
        };
    }
}
```

The plugin generates:

```ts
// resources/js/enums/order-status.ts
export const OrderStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderStatusUtils = {
  label(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return "Pending";
      case OrderStatus.PROCESSING:
        return "Processing";
      case OrderStatus.SHIPPED:
        return "Shipped";
    }
  },

  color(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return "yellow";
      case OrderStatus.PROCESSING:
        return "blue";
      case OrderStatus.SHIPPED:
        return "green";
    }
  },

  options(): OrderStatus[] {
    return Object.values(OrderStatus);
  },
};
```

## Git Workflow

1. Create a feature branch from `main`
2. Make changes with focused commits
3. Run `npm run build` and `npm run typecheck`
4. Open a PR and ensure CI passes

Release tip: tag releases after merging to `main`, then publish to NPM.

## Requirements

- Node.js >= 18.0.0
- Vite >= 4.0.0 (including Vite 7)
- PHP >= 8.2
- Laravel Enumify package installed

## License

MIT
