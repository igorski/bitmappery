const CopyWebpackPlugin = require("copy-webpack-plugin");

const dirSrc    = `./src`;
const dirAssets = `${dirSrc}/assets`;

module.exports = {
    lintOnSave: false,
    productionSourceMap: false,
    publicPath: "./",
    pages: {
        // self contained page
        index: {
            entry: `${dirSrc}/main.js`,
            template: "public/index.html",
        },
        // application assets only (e.g. HTML <body />)
        app: {
            entry: `${dirSrc}/main.js`,
            template: "public/index-app.html",
        }
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
	},
    configureWebpack: {
        plugins: [
            new CopyWebpackPlugin([
                { from: `${dirAssets}`, to: "assets", flatten: false }
            ]),
        ]
    }
};
