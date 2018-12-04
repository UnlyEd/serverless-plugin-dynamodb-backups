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

After deploy, serverless provide one endpoint for list all Book Table backups.

> You could also see cloudwatch on aws for logs.