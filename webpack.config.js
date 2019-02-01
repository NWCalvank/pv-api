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
      app: './src/index.js',
      server: './src/server.js',
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
