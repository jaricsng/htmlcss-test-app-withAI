import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/__tests__/**/*.test.ts'],
        // Run files sequentially — prevents multiple workers racing to open the same DB file
        fileParallelism: false,
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: ['src/__tests__/**', 'src/index.ts'],
        },
    },
});
