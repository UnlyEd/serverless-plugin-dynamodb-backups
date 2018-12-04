# serverless-plugin-example

## AWS Credentials with serverless

see https://serverless.com/framework/docs/providers/aws/guide/credentials/

## Usage

Setup:

> configure your credentials (with a profile or not), add config to serverless.yml

Deploy:

```
yarn run deploy
```

Test:

After deploy, this example provide one endpoint for list all Book Table backups.
Just wait 5 minutes, check this endpoint.


> You could also see logs on your terminal: `yarn run logs:backups` and wait 5 minutes to see logs :)