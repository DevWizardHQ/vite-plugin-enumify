import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
    clean: true,
    declaration: true,
    externals: ['rollup', 'vite'],
    failOnWarn: false,
    rollup: {
        emitCJS: true,
        cjsBridge: true,
        output: {
            entryFileNames: '[name].js',
        },
    },
});
