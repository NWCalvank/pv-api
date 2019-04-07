module.exports = [
  {
    name: 'prod',
    entry: {
      app: './src/index.js',
    },
    output: {
      filename: '[name].js',
      path: `${__dirname}/dist`,
      libraryTarget: 'umd',
      library: '[name]',
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
      app: './src/index.js',
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
      // Contains all modules
      app: './src/index.js',
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
    optimization: { nodeEnv: 'test' },
    node: {
      fs: 'empty',
      net: 'empty',
    },
    target: 'node',
  },
];
