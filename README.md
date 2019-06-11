## Node-SMS-API and Node-SMS-APP
Node and Cordova projects to create a SMS Gateway using android phones.

## Is there a live example?
You can go to https://node-sms-api.herokuapp.com/admin and register your applications and phones. This website is for test only. All data will be erased without any notice. There is also an API to send SMS and get phones and messages status at: http://iscrapper.herokuapp.com/api-docs

## About the app
Actually, there are two separated apps. The Cordova APP and the Backend (in Node/Express).

## How to run the Backend
1. Navigate to the `api` directory.
2. Change the `.env` file to your desired configuration.
3. Open a terminal.
4. Run `npm install` to install all dependencies.
5. Run `npm start` to start the app or `npm run dev` to run gulp and nodemon.

## How to build the App
1. Navigate to the `app` directory.
2. Run `phonegap build android` or use Adobe Phonegap build online at https://build.phonegap.com


## Backend .env configuration
```
APPLICATION_INSIGHTS_KEY  # Azure application insights instrumentation key
ENCRYPTION_KEY            # Key used to encryption
TOKEN_KEY                 # Key used to sign jwt tokens
```

##App configuration
```
APPLICATION_INSIGHTS_KEY  # Azure application insights instrumentation key defined in the index.html
```