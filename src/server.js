const http = require('http');
const express = require('express');
const port = 8080;

// This function creates an Express app to emulate Google Cloud
// Platform's Cloud Function httpsTrigger[s] then registers all of
// the Cloud Function handlers with the Express app. We'll be passing in
// all of the exports from our index.js file as the "functions" parameter
// below.
const setUpApp = functions => {
  const newApp = express();

  for (let func in functions) {
    console.log(`registered http://localhost:${port}/${func}`);

    // Create a fake "httpsTrigger" for every export, handling get
    // requests.
    newApp.get(`/${func}`, functions[func]);
  }
  return newApp;
};

// Create the Express app with all of the Cloud Function handlers
// and add it as a listner on our Cloud Function emulation server.
const myApp = setUpApp(require('../index.js'));
const server = http.createServer(myApp);
server.listen(port);
