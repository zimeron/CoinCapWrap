## Description

Uses Nest.JS to wrap and extend the CoinCap data api (https://docs.coincap.io).

Allows registration and authentication of users, creates and manages wallets for these users, and dynamically updates users on the value of their wallet based on CoinCap's live data.

Authored by Andrew Fisher

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## App Documentation 

```
Once running locally, the app can be seen at localhost:3000.  Swagger is used to document the API's endpoints and should be viewable at the root path (localhost:3000/).
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## License

Provided under [MIT license](LICENSE).
