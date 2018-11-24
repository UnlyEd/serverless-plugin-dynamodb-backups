# Serverless plugin db backups _(for the Serverless Framework on AWS)_

## Introduction

> If you want to automate your DynamoDB database backups, then this plugin may be what you need.

As we build various services on AWS using the serverless design, we need reusable backups services, both scalable and easy to implement.
We therefore created this plugin, to make sure that each project can create its own DynamoDB automated backup solution.

This is a plugin which simplifies **DynamoDB backups** creation automation for all the resources created in
`serverless.yml` when using the [Serverless Framework](https://serverless.com) and AWS Cloud provider.


We officially support **Node.js 6.10** and **Node.js 8.10**.

## Benefits

* Automated Backups on your configured resources (`serverless.yml`)
* Easy configuration
* Report Error on slack channel _(see configuration)_
* Delete old Backups automatically (retention) _(see configuration)_

## Installation 

TODO: 
- Use npm instead!
- show full configuration example (serverless.yml)


Install the plugin
```bash
yarn add https://bitbucket.org/studylink_team/serverless-plugin-db-backups.git -D
```


## Usage

### Step 1: Load the Plugin 

**_This plugin must be the first of your list_**

The plugin determines your environment during deployment and adds all environment variables to your Lambda function. 
All you need to do is to load the plugin:

```yaml
plugins:
  - serverless-plugin-db-backups
```

### Step 2: declare handler:

Create a file:

```javascript
import dynamodbAutoBackups from 'serverless-plugin-db-backups';

export const handler = dynamodbAutoBackups;
```

### Step 3: Custom config `serverless.yml`

Set the `dynamodbAutoBackups` configuration option as follows:

```yaml
custom:
  dynamodbAutoBackups:
    backupRate: 'your_schedule' # TODO Add values examples
    source: path/to/your_handler_file
```

### Step 4: iamRoleStatements `serverless.yml`

```yaml
provider:
    iamRoleStatements:
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

TODO Add explanations

### Configuration in `serverless.yml`:
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
* `backupType` (default ALL)
  > **optional** - The backups from the table specified by BackupType are listed.

   Where backupType can be:
   * `USER` - On-demand backup created by you.
   * `SYSTEM` - On-demand backup automatically created by DynamoDB.
   * `ALL` - All types of on-demand backups (USER and SYSTEM).

TODO: Add example
