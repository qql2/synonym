import builtins from 'builtin-modules'
import commonjs from "@rollup/plugin-commonjs";
import { defineConfig } from "vite";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { resolve } from "path";
import typescript from "@rollup/plugin-typescript";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    build: {
        lib: {
            entry: resolve(__dirname, "main.ts"),
            name: "MyLib",
            // the proper extensions will be added
            fileName: "main",
            formats: ["cjs"],
        },
        cssCodeSplit: false,
        rollupOptions: {
            output: {
                dir: undefined,
                file: resolve(__dirname, "main.js"),
                sourcemap: "inline",
                sourcemapExcludeSources: true,
                format: "cjs",
                exports: "default",
                globals: {
                    vue: "Vue",
                },
                assetFileNames: (chunkInfo) => {
                    if (chunkInfo.name === "style.css") return "styles.css";
                },
            },
            external: [
                'obsidian',
                'electron',
                '@codemirror/autocomplete',
                '@codemirror/closebrackets',
                '@codemirror/collab',
                '@codemirror/commands',
                '@codemirror/comment',
                '@codemirror/fold',
                '@codemirror/gutter',
                '@codemirror/highlight',
                '@codemirror/history',
                '@codemirror/language',
                '@codemirror/lint',
                '@codemirror/matchbrackets',
                '@codemirror/panel',
                '@codemirror/rangeset',
                '@codemirror/rectangular-selection',
                '@codemirror/search',
                '@codemirror/state',
                '@codemirror/stream-parser',
                '@codemirror/text',
                '@codemirror/tooltip',
                '@codemirror/view',
                '*.test.ts',
                '*.test.js',
                "node:*",
                ...builtins
            ],
            plugins: [typescript(), nodeResolve({ browser: true }), commonjs()],
        },
    },
});