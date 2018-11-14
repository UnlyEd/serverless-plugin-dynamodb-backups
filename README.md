# Serverless plugin db backups

## About

This serverless plugin simplifies backup creation automation, for all the resources created in
serverless.yml with the popular [Serverless Framework](https://serverless.com) and AWS Lambda.

Currently we support **Node.js 6.10**, **Node.js 8.10**.

## Why :grey_question:


As we build various services on aws in :zap: serverless mode, we need reusable backup service, scalable and easy to implement.
For that we created this plugin, to make sure that each project can create its own dynamodb automatic backup solution.

## Installation

* Install the plugin
  ```bash
  yarn add https://bitbucket.org/studylink_team/serverless-plugin-db-backups.git -D
  ```

## Benefits

* Automated Backups on your resources (serverless.yml)
* Easy configuration
* Report Error on slack channel (see configuration)
* Delete old Backups (see configuration)


## Usage
This plugin allows configuration of the library through the `serverless.yml`

> Step 1: Load the Plugin (this plugin must be the first)

The plugin determines your environment during deployment and adds all
environment variables to your Lambda function. All you need to
do is to load the plugin:

```yaml
plugins:
  - serverless-plugin-db-backups
```

> Step 2: declare handler:

Create a file:

```javascript
import { dynamodbAutoBackups } from 'serverless-plugin-db-backups';

export const handler = dynamodbAutoBackups(event, context);
```

> Step 3: Custom config `serverless.yml`

Set the `dynamodbAutoBackups` configuration option as follows:

```yaml
custom:
  dynamodbAutoBackups:
    backupRate: 'your_schedule'
    source: path/to/your_handler_file
```

> Step 4: iamRoleStatements `serverless.yml`

```yaml
provider:
    .....
    - Effect: "Allow"
      Action:
      - dynamodb:ListTables
      - dynamodb:ListBackups
      - dynamodb:DeleteBackup
        Resource: "*"
    - Effect: "Allow"
      Action:
      - dynamodb:CreateBackup
      Resource:
        Fn::Join:
        - ":"
        - - "arn:aws:dynamodb"
          - Ref: 'AWS::Region'
          - Ref: 'AWS::AccountId'
          - "table/*"
```

### Configuration `serverless.yml`:
* `source`
  > **required** - path to your handler function.
* `backupRate`
  > **required** - The schedule on which you want to backup your table. You can use either `rate` syntax (`rate(1 hour)`) or `cron` syntax (`cron(0 12 * * ? *)`). See [here](https://serverless.com/framework/docs/providers/aws/events/schedule/) for more details on configuration.
* `slackWebhook`
  > **optional** - An HTTPS endpoint for an [incoming webhook](https://api.slack.com/incoming-webhooks) to Slack. If provided, it will error messages to a Slack channel when it runs.
* `backupRemovalEnabled`
  > **optional** - Setting this value to true will enable cleanup of old backups. See the below option, backupRetentionDays, to specify the retention period. By default, backup removal is disabled.
* `backupRetentionDays`
  > **optional** - Specify the number of days to retain old snapshots. For example, setting the value to 2 will remove all snapshots that are older then 2 days from today.