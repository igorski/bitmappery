const CopyWebpackPlugin = require("copy-webpack-plugin");

const dirSrc    = `./src`;
const dirAssets = `${dirSrc}/assets`;

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
            new CopyWebpackPlugin([
                { from: `${dirAssets}`, to: "assets", flatten: false }
            ]),
        ]
    },
    chainWebpack: config => {
        // inline Workers as Blobs
        config.module
            .rule( "worker" )
            .test( /\.worker\.js$/ )
            .use( "worker-loader" )
            .loader( "worker-loader" )
            .end();

        config.module.rule( "js" ).exclude.add( /\.worker\.js$/ );

        // this solves an issue with hot module reload on Safari...
        config.plugins.delete( "preload" );
    },
};
