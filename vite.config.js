import { defineConfig, normalizePath } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import vue from "@vitejs/plugin-vue";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import path from "path";

const dirSrc    = `./src`;
const dirPublic = normalizePath( path.resolve( import.meta.dirname, "public" ));
const dirAssets = normalizePath( path.resolve( import.meta.dirname, "src/assets" ));

// https://vitejs.dev/config/
export default defineConfig({
    base: "./",
    plugins: [
        vue(),
        viteStaticCopy({
            targets: [
                {
                    src: dirAssets,
                    dest: "assets",
                },
            ]
        }), 
    ],
    build: {
        cssCodeSplit: false, // inline CSS into JS chunk
    },
    resolve: {
        alias: {
            "@": path.resolve( import.meta.dirname, dirSrc ),
            "@@": path.resolve( import.meta.dirname, `${dirPublic}/assets` ),
        },
    },
    optimizeDeps: {
        esbuildOptions: {
            // Node.js global to browser globalThis
            define: {
                global: "globalThis"
            },
            plugins: [
               NodeGlobalsPolyfillPlugin({
                   buffer: true,
                   crypto: true,
                   util: true,
                   stream: true
               }),
           ],
        }
    },
});
