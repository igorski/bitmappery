import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import vue from "@vitejs/plugin-vue2";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import path from "path";

const dirSrc    = `./src`;
const dirPublic = `${dirSrc}/public`;
const dirAssets = `${dirSrc}/assets`;
const dest      = `${__dirname}/dist`;

// https://vitejs.dev/config/
export default defineConfig({
    base: "./",
    plugins: [
        vue(),
        viteStaticCopy({
            targets: [{
                src: dirPublic,
                dest: path.resolve( dest ),
            }, {
                src: dirAssets,
                dest: path.resolve( dest ),
            }]
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve( __dirname, "./src" ),
            "@@": path.resolve( __dirname, "./public/assets" ),
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
               })
           ]
        }
    },
});
