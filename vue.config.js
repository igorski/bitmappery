const CopyWebpackPlugin = require('copy-webpack-plugin');

const dirSrc    = `./src`;
const dirAssets = `${dirSrc}/assets`;

module.exports = {
    lintOnSave: false,
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
        plugins: [
            new CopyWebpackPlugin([
                { from: `${dirAssets}`, to: 'assets', flatten: false }
            ]),
        ]
    }
};
