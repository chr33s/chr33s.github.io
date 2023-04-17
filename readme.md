# Github Portfolio

## Instructions

1. create a private github repo named `[username].github.io` (the `[username]` must match your github username).
2. click settings > Pages > Build and deployment > Source = github actions
3. run `cd [username].github.io`
4. replace `public/assets/icon.svg` with a `250x250` icon
5. run `npx svg-to-ico ./public/assets/icon.svg ./public/favicon.ico --yes`
6. edit `src/data.json` with your details
7. ...

## Setup

```sh
npm run install
npm run dev # build
open http://localhost:8080/
```
