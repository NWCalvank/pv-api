## Development

### Getting Started

Start build in watch mode, run unit tests on-change, and expose endpoints for
local development:

```
$ npm run docker:start
$ npm run docker:server
```

Stop running app and clean up images:

```
$ npm run docker:stop
$ npm run docker:clean
```

Running on host without Docker:

```
$ npm install
$ npm run start
$ npm run server
```
