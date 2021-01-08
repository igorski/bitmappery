const CopyWebpackPlugin = require('copy-webpack-plugin');

const dirSrc    = `./src`;
const dirAssets = `${dirSrc}/assets`;

module.exports = {
    lintOnSave: false,
    productionSourceMap: false,
    publicPath: './',
    pages: {
        // self contained page
        index: {
            entry: `${dirSrc}/main.js`,
            template: 'public/index.html',
        },
        // application assets only (e.g. HTML <body />)
        app: {
            entry: `${dirSrc}/main.js`,
            template: 'public/index-app.html',
        }
    },
    configureWebpack: {
        module: {
            rules: [{
                // inline Workers as Blobs
                test: /\.worker\.js$/,
                use: { loader: 'worker-loader', options: { inline: true, fallback: false } }
            }]
       },
       plugins: [
           new CopyWebpackPlugin([
               { from: `${dirAssets}`, to: 'assets', flatten: false }
           ]),
       ]
   }
};
