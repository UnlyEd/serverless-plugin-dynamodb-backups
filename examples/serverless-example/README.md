# serverless-plugin-dynamodb-backups-serverless-example

## AWS Credentials with serverless

If you already have a proper Serverless environment configured, then you can skip this.

See https://serverless.com/framework/docs/providers/aws/guide/credentials/

## Usage

1. Clone this repository
1. `yarn install`
1. Update the `serverless.yml` and look out for `TODO`, that's where you're likely to have things to change to match your serverless configuration
1. `yarn run deploy`
1. `yarn run logs:backups` will display the logs when a backup is made
1. `yarn run invoke:listBackups` will display the list of backups that have been made

> Don't forget to `sls remove` your stack once you've done playing with it, or it's gonna make backups indefinitely!
