# Donkeybot

A bot that watches a webpage, scrapes its content, and reports to slack when it changes.

Requires [serverless framework](https://serverless.com/) and [yarn](https://yarnpkg.com/en/).

## Configuration

Create a `secrets.yml` file that looks like:
```yml
default:
  webpageURI: "https://some.page/with-text"
  slackUsername: "donkeybot"
  slackAvatar: "https://website.url/avatar.png"
  slackChannel: "#channel-name"
  slackURL: "https://hooks.slack.com/services/...."
```

## Test locally

```
yarn                           # install dependencies (first time only)
sls dynamodb start --migrate   # start a local database
sls invoke local -f check      # see result
```

## Deployment

```
sls deploy            # create database, users, lambda function, API gateway
sls invoke -f check   # invoke production function
```
