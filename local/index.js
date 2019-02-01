const main = require('../dist/app.js');

exports.render = function(request, response) {
  response.send('Hello from the clouds!');
};
