module.exports = [
  {
    name: 'prod',
    entry: './src/index.js',
    output: {
      filename: './app.js',
    },
    mode: 'production',
    node: {
      fs: 'empty',
      net: 'empty',
    },
    target: 'node',
  },
  {
    name: 'dev',
    entry: {
      // Contains all modules
      actions: './src/index.js',
      // Mock GCloud API for local dev
      server: './src/server.js',
      // Contains all tests
      spec: './spec/indexSpec.js',
    },
    output: {
      filename: '[name].js',
      path: `${__dirname}/dist`,
      libraryTarget: 'umd',
      library: '[name]',
    },
    mode: 'development',
    node: {
      fs: 'empty',
      net: 'empty',
    },
    target: 'node',
  },
  {
    name: 'test',
    entry: {
      spec: './spec/indexSpec.js',
    },
    output: {
      filename: '[name].js',
      path: `${__dirname}/dist`,
    },
    mode: 'development',
    node: {
      fs: 'empty',
      net: 'empty',
    },
    target: 'node',
  },
];
