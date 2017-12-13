const path = require('path');
const webpack = require('webpack');

var version = require('./package.json').version;
var banner = 'CARTO.js https://carto.com/\n';
banner += 'Version: ' + version + '\n';

module.exports = {
  entry: './src/api/v4/index.js',
  output: {
    path: path.resolve(__dirname, 'dist/public'),
    filename: 'carto.js',
    library: 'carto',
    libraryTarget: 'umd'
  },
  plugins: [
    // Include only the lastest camshaft-reference
    new webpack.IgnorePlugin(/^\.\/((?!0\.59\.4).)*\/reference\.json$/),
    new webpack.BannerPlugin(banner)
  ],
  // Do not to include Leaflet in the bundle
  externals: {
    leaflet: 'L'
  }
};
