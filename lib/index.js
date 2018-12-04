const AWS = require('aws-sdk');
const filter = require('lodash.filter');
const moment = require('moment');
const axios = require('axios');

const Dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
const {
  SLACK_WEBHOOK,
  REGION,
  BACKUP_RETENTION_DAYS,
  BACKUP_REMOVAL_ENABLED,
  TABLE_REGEX,
} = process.env;
const CONSOLE_ENDPOINT = `https://console.aws.amazon.com/dynamodb/home?region=${REGION}#backups:`;

/**
 *
 * @param TableName
 * @returns {Promise<*>}
 */
const createBackup = (TableName) => {
  const BackupName = TableName + moment().format('_YYYY_MM_DD_HH-mm-ss');
  const params = {
    BackupName,
    TableName,
  };
  return Dynamodb.createBackup(params).promise();
};

/**
 *
 * @returns {Promise<Array|*>}
 */
const getTablesToBackup = async () => {
  // Default return all of the tables associated with the current AWS account and endpoint.*/
  const data = await Dynamodb.listTables({}).promise();

  // If TABLE_REGEX environment variable is provide, return tables that match;
  return process.env.TABLE_REGEX ? filter(data.TableNames, (val) => new RegExp(TABLE_REGEX).test(val)) : data.TableNames;
};

/**
 *
 * @param TableName
 * @returns {Promise<*|Array>}
 */
const listBackups = async (TableName) => {
  const TimeRangeUpperBound = moment().subtract(BACKUP_RETENTION_DAYS, 'days').toISOString();
  const params = {
    TableName,
    BackupType: process.env.BACKUP_TYPE || 'ALL',
    TimeRangeUpperBound,
  };

  console.log('@unly/serverless-plugin-db-backups:', `Removing backups before the following date: ${moment(TimeRangeUpperBound).format('LL')}`);

  const data = await Dynamodb.listBackups(params).promise();

  return data.BackupSummaries || [];
};

/**
 *
 * @param tables
 * @returns {Promise<void>}
 */
const removeStaleBackup = (tables) => tables.map(async (tableName) => {
  const backupSummaries = await listBackups(tableName);

  backupSummaries.map(async (table) => {
    const params = {
      BackupArn: table.BackupArn,
    };
    await Dynamodb.deleteBackup(params).promise();
    console.log(`Deleted Backups done for ${tableName}`);
  });
});

/**
 *
 * @param results
 * @returns {string}
 */
const formatMessage = (results) => {
  let msg = '';
  const success = results.success.length;
  const failure = results.failure.length;

  if (!results.success.length && !results.failure.length) {
    return '@unly/serverless-plugin-db-backups: Tried running DynamoDB backup, but no tables were specified.\nPlease check your configuration.';
  }

  if (results.failure.length) {
    msg += '\n@unly/serverless-plugin-db-backups:\n';
    msg += `\nThe following tables failed:\n - ${results.failure.join('\n - ')}`;
    msg += `Tried to backup ${results.success.length} DynamoDB tables. ${success} succeeded, and ${failure} failed. 
  See all backups${`<${CONSOLE_ENDPOINT}|here>`}.`;
  }

  return msg;
};

/**
 *
 * @param message
 * @returns {AxiosPromise<any>}
 */
const sendToSlack = (message) => axios.post(SLACK_WEBHOOK, { text: message });

/**
 *
 * @param tables
 * @returns {Promise<{success: Array, failure: Array}>}
 */
const tablesToBackup = async (tables) => {
  const results = {
    success: [],
    failure: [],
  };

  await tables.map(async (tableName) => {
    try {
      await createBackup(tableName);
      results.success.push(tableName);
    } catch (err) {
      console.log(`@unly/serverless-plugin-db-backups: Error creating backup for table ${tableName}.\n. Error: ${JSON.stringify(err)}`);
      results.failure.push(tableName);
    }
  });
  return results;
};

const dynamodbAutoBackups = async (event, context) => {
  try {
    const tables = await getTablesToBackup();

    if (BACKUP_REMOVAL_ENABLED === 'true') {
      try {
        await removeStaleBackup(tables);
      } catch (err) {
        console.log(`@unly/serverless-plugin-db-backups: Error removing stale backups. Error: ${JSON.stringify(err)}`);
      }
    }

    const results = await tablesToBackup(tables);

    if (SLACK_WEBHOOK && results.failure.length) {
      const message = formatMessage(results);
      sendToSlack(message);
    }

    console.log(`@unly/serverless-plugin-db-backups: ${JSON.stringify(results, null, 2)}`);
  } catch (err) {
    console.log(err);
  }
};

module.exports = dynamodbAutoBackups;
