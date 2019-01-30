module.exports = [
  {
    name: 'prod',
    entry: './src/index.js',
    output: {
      filename: './app.js',
    },
    mode: 'production',
  },
  {
    name: 'dev',
    entry: {
      app: './src/index.js',
      spec: './spec/indexSpec.js',
    },
    output: {
      filename: '[name].js',
      path: `${__dirname}/dist`,
    },
    mode: 'development',
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
  },
];
