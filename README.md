# This repo demonstrate a minimal Teams video app.

## Install the video app in Teams
1. Host the app directory in a public accessible HTTPS server. You can use github page as the host.
2. Replace the `name`, `appId`, and `contentUrl` in `meta/manifest.json`.
    1. The contentUrl should point to your app directory, like `https://lubobill1990.github.io/Teams-VideoApp-example/app/`
    2. appId can be any unique GUID
3. zip the meta directory, choose the zip file after clicking Upload a custom app
4. Go to a teams meeting, enable the video, and activate the video app.


## Develop video app in browser

1. open terminal
2. `cd` to the directory of README.md
3. run `yarn install`
4. run `yarn start-app`
5. run `yarn start-container`
6. open `https://localhost:9000/index.html` in your browser
7. change `videoFrameHandler` function in `app/index.js`
