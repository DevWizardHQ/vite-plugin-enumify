import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['__tests__/**/*.test.ts'],
        setupFiles: ['__tests__/setup.ts'],
        clearMocks: true,
    },
});
