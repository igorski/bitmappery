const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require( "path" );

const dirSrc    = `./src`;
const dirAssets = `${dirSrc}/assets`;
const dest      = `${__dirname}/dist`;

module.exports = {
    lintOnSave: false,
    productionSourceMap: false,
    publicPath: "./",
    pages: {
        index: {
            entry: `${dirSrc}/main.js`,
            template: "public/index.html",
        }
    },
    configureWebpack: {
        plugins: [
            new CopyWebpackPlugin({
                patterns: [
                    { from: `${dirAssets}`, to: path.resolve( dest, "assets" ) }
                ]
            }),
        ],
        resolve: {
            fallback: {
                "buffer" : require.resolve( "buffer" ),
                "crypto" : require.resolve( "crypto-browserify" ),
                "util"   : require.resolve( "util/" ),
                "stream" : require.resolve( "stream-browserify" ),
            }
        }
    },
    chainWebpack: config => {
        // this solves an issue with hot module reload on Safari...
        config.plugins.delete( "preload" );
    },
};
