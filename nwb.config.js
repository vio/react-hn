var StatsWebpackPlugin = require('stats-webpack-plugin')

module.exports = {
  type: 'react-app',
  babel: {
    loose: 'all'
  },
  webpack: {
    plugins: {
      define: {
        __VERSION__: JSON.stringify(require('./package.json').version)
      }
    },
    extra: {
      plugins: [
        new StatsWebpackPlugin('../../stats/webpack.json', {
          assets: true,
          performance: true,
          timings: true,
          children: false,
          source: false,
          modules: false,
          chunks: false
        })
      ]
    }
  }
}
