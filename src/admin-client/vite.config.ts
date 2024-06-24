/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgr from 'vite-plugin-svgr';
import ckeditor5 from '@ckeditor/vite-plugin-ckeditor5';
// https://vitejs.dev/config/
export default defineConfig({
    build: {
        outDir: 'build'
    },
    base: '/editor/',
    server: {
        port: 3000,
    },
    test: {
        globals: true,
        environment: 'happy-dom',
        coverage: {
            provider: 'v8'
        },
        server: {
            deps: {
                inline: [
                    /@ckeditor\/.*/i, /ckeditor5\/.*/i
                ]
            }
        }
    },
    plugins: [
        react(),
        viteTsconfigPaths(),
        svgr({
            include: '**/*.svg?react',
        }),
        ckeditor5( { theme: require.resolve( '@ckeditor/ckeditor5-theme-lark' ) } ),
    ],
});
//    "test": "jest --runInBand --detectOpenHandles --forceExit --collect-coverage",
