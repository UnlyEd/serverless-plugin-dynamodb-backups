# Serverless plugin db backups _(for the Serverless Framework on AWS)_

## Introduction

> If you want to automate your DynamoDB database backups, then this plugin may be what you need.

As we build various services on AWS using the serverless design, we need reusable backups services, both scalable and easy to implement.
We therefore created this plugin, to make sure that each project can create its own DynamoDB automated backup solution.

This is a plugin which simplifies **DynamoDB backups** creation automation for all the resources created in
`serverless.yml` when using the [Serverless Framework](https://serverless.com) and AWS Cloud provider.


We officially support **Node.js 6.10** and **Node.js 8.10**.

We officially support Serverless Framework `>=1.12.0`.

## Benefits

* Automated Backups on your configured resources (`serverless.yml`)
* Easy configuration
* Report Error on slack channel _(see configuration)_
* Delete old Backups automatically (retention) _(see configuration)_

## Installation

Install the plugin

NPM:
```bash
npm install @unly/serverless-plugin-dynamodb-backups
```

YARN:
```bash
yarn add @unly/serverless-plugin-dynamodb-backups
```

## Usage

### Step 1: Load the Plugin

The plugin determines your environment during deployment and adds all environment variables to your Lambda function. 
All you need to do is to load the plugin:

```yaml
plugins:
  - '@unly/serverless-plugin-dynamodb-backups'
```

### Step 2: declare handler:

Create a file:

```javascript
import dynamodbAutoBackups from 'serverless-plugin-db-backups/lib';

export const handler = dynamodbAutoBackups;
```

### Step 3: Custom config `serverless.yml`

Set the `dynamodbAutoBackups` configuration option as follows:

```yaml
custom:
  dynamodbAutoBackups:
    backupRate: rate(5 minutes) # XXX see backupRate configuration
    source: path/to/your_handler_file
```

### Configuration in `serverless.yml`:
* `source`
  > **required** - path to your handler function.
* `backupRate`
  > **required** - The schedule on which you want to backup your table. You can use either `rate` syntax (`rate(1 hour)`) or `cron` syntax (`cron(0 12 * * ? *)`). See [here](https://serverless.com/framework/docs/providers/aws/events/schedule/) for more details on configuration.
* `name`
  > **optional** - automatically set, but you could provide your own name for this lambda.
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


### Example Configuration:

We want to create some backups every 40 minutes, delete all backups longer than 15 days, be warned if backups are not created.

```yaml
custom:
  dynamodbAutoBackups:
    backupRate: rate(40 minutes)
    source: path/to/your_handler_file
    slackWebhook: https://xxxxxxxxxxxxx
    backupRemovalEnabled: true     # Enable backupRetentionDays
    backupRetentionDays: 15     # if backupRemovalEnabled is not provided, then backupRetentionDays is not used
```

We want to create some backups every friday at 2:00 am, delete all backups create by USER longer than 3 days, be warned if backups are not created.
```yaml
custom:
  dynamodbAutoBackups:
    backupRate: cron(0 2 ? * FRI *) # every friday at 2:00 am
    source: path/to/your_handler_file
    slackWebhook: https://xxxxxxxxxxxxx
    backupRemovalEnabled: true     # Enable backupRetentionDays
    backupRetentionDays: 3     # if backupRemovalEnabled is not provide, then backupRetentionDays is not used
    backupType: USER  # delete all backups created by an user, not system backups
```

### Example

To test this plugin, you can clone this repository.
Go to examples / serverless-example, and follow the README.

enjoy :)
