# serverless-plugin-dynamodb-backups-serverless-example

## AWS Credentials with serverless

If you already have a proper Serverless environment configured, then you can skip this.

See https://serverless.com/framework/docs/providers/aws/guide/credentials/

## Usage

1. Clone this repository
2. `yarn install`
3. Update the `serverless.yml` and look out for `TODO`, that's where you're likely to have things to change to match your serverless configuration
4. `yarn run deploy`
5. Go to `http://localhost:3000/listBackups` to see the list of backups for the `Book` table. (one backup is made every minute)
5. Alternatively, you can also run `yarn run logs:backups`

> Don't forget to `sls remove` your stack once you've done playing with it, or it's gonna make backups indefinitely!
