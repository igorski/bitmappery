const fs       = require( "fs" );
const execSync = require( "child_process" ).execSync;

const BUILD_FOLDER = "dist";

// 1. read the generated index.html file from the output folder
const indexData = fs.readFileSync( `${BUILD_FOLDER}/index.html`, { encoding: "utf8", flag: "r" });

// 2. collect scripts, links and divs from the file
// "thou shall have a hard time parsing tags from HTML strings", luckily this suffices fur our purposes
const scripts = indexData.match( /<script[^<]*(<\/script>|\/>)/g ) || [];
const divs    = indexData.match( /<div[^<]*(<\/div>|\/>)/g ) || [];
// only collect stylesheets
const links   = indexData.match( /<link[^<]*(rel="stylesheet">|rel="prefetch">|as="style">|as="script">|fonts.gstatic.com">)/g ) || [];
// the below collects stylesheets, favicons and manifests too
//const links   = indexData.match( /<link[^<]*(<\/link>|\/>|rel="stylesheet">|rel="prefetch">|as="style">|as="script">|fonts.gstatic.com">)/g ) || [];

// 3. generate new file containing only the scripts, links and divs
const output = `${[ ...links, ...divs, ...scripts ].join( "\n" )}`;

console.log( `Collected the following tags:\n${output}` );

fs.writeFileSync( `${BUILD_FOLDER}/app.html`, output, { encoding: "utf8", flag: "w" });
