<a href="https://unly.org"><img src="https://storage.googleapis.com/unly/images/ICON_UNLY.png" align="right" height="20" alt="Unly logo" title="Unly logo" /></a>
[![Build Status](https://travis-ci.com/UnlyEd/serverless-plugin-dynamodb-backups.svg?branch=master)](https://travis-ci.com/UnlyEd/serverless-plugin-dynamodb-backups) 
[![Maintainability](https://api.codeclimate.com/v1/badges/980404446e29f74f95fd/maintainability)](https://codeclimate.com/github/UnlyEd/serverless-plugin-dynamodb-backups/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/980404446e29f74f95fd/test_coverage)](https://codeclimate.com/github/UnlyEd/serverless-plugin-dynamodb-backups/test_coverage)
[![Known Vulnerabilities](https://snyk.io/test/github/UnlyEd/serverless-plugin-dynamodb-backups/badge.svg?targetFile=package.json)](https://snyk.io/test/github/UnlyEd/serverless-plugin-dynamodb-backups?targetFile=package.json)

# Serverless plugin DynamoDB backups

## Introduction

> If you want to automate your AWS DynamoDB database backups, this plugin may be what you need.

As we build various services on AWS using the "serverless" design, we need reusable backups services, both scalable and easy to implement.
We therefore created this plugin, to make sure that each project can create its own DynamoDB automated backup solution.

This is a plugin which simplifies **DynamoDB backups** creation automation for all the resources created in
`serverless.yml` when using the [Serverless Framework](https://serverless.com) and AWS Cloud provider.


This plugin officially supports Node.js **6.10** and **8.10**.

This plugin officially supports Serverless Framework `>=1.12.0`.

## Benefits

* Automated Backups on your configured resources (`serverless.yml`)
* Report Error on slack channel _(see configuration)_
* Delete old Backups automatically (AKA "managed backups retention") _(see configuration)_

## Installation

Install the plugin using either Yarn or NPM. (we use Yarn)

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

> Must be declared **before** `serverless-webpack`, despite what their officially doc says

```yaml
plugins:
  - '@unly/serverless-plugin-dynamodb-backups' # Must be first, even before "serverless-webpack", see https://github.com/UnlyEd/serverless-plugin-dynamodb-backups
  - serverless-webpack # Must be second, see https://github.com/99xt/serverless-dynamodb-local#using-with-serverless-offline-and-serverless-webpack-plugin
```

### Step 2: Create the backups handler function:

Create a file, which will be called when performing a DynamoDB backup _(we named it `src/backups.js` in our `examples` folder)_:

```javascript
import dynamodbAutoBackups from 'serverless-plugin-db-backups/lib';

export const handler = dynamodbAutoBackups;
```

### Step 3: Configure your `serverless.yml`

Set the `dynamodbAutoBackups` object configuration as follows (list of all available options below):

```yaml
custom:
  dynamodbAutoBackups:
    backupRate: rate(40 minutes) # Every 5 minutes, from the time it was deployed
    source: src/backups.js # Path to the handler function we created in step #2
    active: true
```

## Configuration of `dynamodbAutoBackups` object:

| Attributes           | Type    | Required | Default | Description                                                                                                                                                                                                                                                         |
|----------------------|---------|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| source               | String  | True     |         | Path to your handler function                                                                                                                                                                                                                                       |
| backupRate           | String  | True     |         | The schedule on which you want to backup your table. You can use either `rate` syntax (`rate(1 hour)`) or `cron` syntax (`cron(0 12 * * ? *)`). See [here](https://serverless.com/framework/docs/providers/aws/events/schedule/) for more details on configuration. |
| name                 | String  | False    | auto    | Automatically set, but you could provide your own name for this lambda                                                                                                                                                                                              |
| slackWebhook         | String  | False    |         | A HTTPS endpoint for an [incoming webhook](https://api.slack.com/incoming-webhooks) to Slack. If provided, it will send error messages to a Slack channel.                                                                                                          |
| backupRemovalEnabled | Boolean | False    | false   | Enables cleanup of old backups. See the below option "backupRetentionDays" to specify the retention period. By default, backup removal is disabled.                                                                                                                 |
| backupRetentionDays  | Integer | False    |         | Specify the number of days to retain old backups. For example, setting the value to 2 will remove all backups that are older than 2 days. Required if `backupRemovalEnabled` is `true`.                                                                             |
| backupType           | String  | False    | "ALL"   | * `USER` - On-demand backup created by you. * `SYSTEM` - On-demand backup automatically created by DynamoDB. * `ALL` - All types of on-demand backups (USER and SYSTEM).                                                                                            |
| active               | Boolean | False    | true    | You can disable this plugin, useful to disable the plugin on a non-production environment, for instance                                                                                                                                                             |

_Generated by https://www.tablesgenerator.com/markdown_tables_

---

### Examples of configurations:

#### 1. Creates backups every 40 minutes, delete all backups older than 15 days, send slack notifications if backups are not created.

```yaml
custom:
  dynamodbAutoBackups:
    backupRate: rate(40 minutes) # Every 40 minutes, from the time it was deployed
    source: src/backups.js
    slackWebhook: https://hooks.slack.com/services/T4XHXX5C6/TT3XXXM0J/XXXXXSbhCXXXX77mFBr0ySAm
    backupRemovalEnabled: true # Enable backupRetentionDays
    backupRetentionDays: 15 # If backupRemovalEnabled is not provided, then backupRetentionDays is not used
```

#### 2. Creates some backups every friday at 2:00 am, delete all backups created by USER longer than 3 days, be warned if backups are not created.
```yaml
custom:
  dynamodbAutoBackups:
    backupRate: cron(0 2 ? * FRI *) # Every friday at 2:00 am
    source: src/backups.js
    slackWebhook: https://hooks.slack.com/services/T4XHXX5C6/TT3XXXM0J/XXXXXSbhCXXXX77mFBr0ySAm
    backupRemovalEnabled: true # Enable backupRetentionDays
    backupRetentionDays: 3 # If backupRemovalEnabled is not provided, then backupRetentionDays is not used
    backupType: USER  # Delete all backups created by a user, not the system backups
```

### Try it out yourself

To test this plugin, you can clone this repository.
Go to `examples/serverless-example`, and follow the README.

---

# Vulnerability disclosure

[See our policy](https://github.com/UnlyEd/Unly).

---

# Contributors and maintainers

This project is being maintained by:
- [Unly] Ambroise Dhenain ([Vadorequest](https://github.com/vadorequest)) **(active)**

Thanks to our contributors:
- Anthony Troupenat ([Fukoyamashisu](https://github.com/Fukoyamashisu))

---

# **[ABOUT UNLY]** <a href="https://unly.org"><img src="https://storage.googleapis.com/unly/images/ICON_UNLY.png" height="40" align="right" alt="Unly logo" title="Unly logo" /></a>

> [Unly](https://unly.org) is a socially responsible company, fighting inequality and facilitating access to higher education. 
> Unly is committed to making education more inclusive, through responsible funding for students. 
We provide technological solutions to help students find the necessary funding for their studies. 

We proudly participate in many TechForGood initiatives. To support and learn more about our actions to make education accessible, visit : 
- https://twitter.com/UnlyEd
- https://www.facebook.com/UnlyEd/
- https://www.linkedin.com/company/unly
- [Interested to work with us?](https://jobs.zenploy.io/unly/about)

Tech tips and tricks from our CTO on our [Medium page](https://medium.com/unly-org/tech/home)!

#TECHFORGOOD #EDUCATIONFORALL
