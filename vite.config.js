import { defineConfig, normalizePath } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

const dirSrc    = `./src`;
const dirPublic = normalizePath( path.resolve( import.meta.dirname, "public" ));

// https://vitejs.dev/config/
export default defineConfig({
    base: "./",
    plugins: [
        vue(),
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
});
