import AWS from 'aws-sdk';
import filter from 'lodash/filter';
import moment from 'moment';
import axios from 'axios';

const Dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK;
const REGION = process.env.AWS_DEFAULT_REGION;
const CONSOLE_ENDPOINT = `https://console.aws.amazon.com/dynamodb/home?region=${REGION}#backups:`;
const BACKUP_RETENTION_DAYS = process.env.BACKUP_RETENTION_DAYS;
const BACKUP_REMOVAL_ENABLED = process.env.BACKUP_REMOVAL_ENABLED;
const TABLE_REGEX = process.env.TABLE_REGEX;

export const handler = async (event, context) => {
  try {
    const tables = await getTablesToBackup();

    if (BACKUP_REMOVAL_ENABLED === 'true') {
      try {
        await removeStaleBackup(tables);
      } catch (err) {
        console.log(`Error removing stale backups. Error: ${JSON.stringify(err)}`);
      }
    }

    const results = await tablesToBackup(tables);

    if (SLACK_WEBHOOK) {
      const message = formatMessage(results);
      sendToSlack(message);
    }

  } catch (err) {
    console.log(err);
  }
};

/**
 *
 * @param TableName
 * @returns {Promise<*>}
 */
const createBackup = async (TableName) => {
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
  //Default return all of the tables associated with the current AWS account and endpoint.*/
  const data = await Dynamodb.listTables({}).promise();

  // If TABLE_REGEX environment variable is provide, return tables that match;
  return process.env.TABLE_REGEX ? filter(data.TableNames, val => new RegExp(TABLE_REGEX).test(val)) : data.TableNames;
};

/**
 *
 * @param tables
 * @returns {Promise<void>}
 */
const removeStaleBackup = async (tables) => {
  for (const tableName of tables) {
    const backupSummaries = await listBackups(tableName);

    for (const table of backupSummaries) {
      const params = {
        BackupArn: table.BackupArn,
      };
      await Dynamodb.deleteBackup(params).promise();
      console.log(`Deleted Backups done for ${tableName}`);
    }
  }
};

/**
 *
 * @param TableName
 * @returns {Promise<*|Array>}
 */
const listBackups = async (TableName) => {

  const TimeRangeUpperBound = moment().subtract(BACKUP_RETENTION_DAYS, 'days').unix();
  const params = {
    TableName,
    BackupType: process.env.BACKUP_TYPE || 'ALL',
    TimeRangeUpperBound,
  };

  console.log(`Removing backups before the following date: ${moment(TimeRangeUpperBound).format('LL')}`);

  const data = await Dynamodb.listBackups(params).promise();

  return data.BackupSummaries || [];
};

/**
 *
 * @param results
 * @returns {string}
 */
const formatMessage = (results) => {
  let msg = '';
  const success = results.success.length;
  const failure = results.failure.length;

  if (!results['success'].length && !results['failure'].length) {
    return 'Tried running DynamoDB backup, but no tables were specified.\nPlease check your configuration.';
  }
  msg += `Tried to backup ${results.success.length} DynamoDB tables. ${success} succeeded, and ${failure} failed. 
  See all backups${'<' + CONSOLE_ENDPOINT + '|here>'}.`;

  if (results.success.length) {
    msg += `\nThe following tables were successful:\n - ${results.success.join('\n - ')}`;
  }

  if (results.failure.length) {
    msg += `\nThe following tables failed:\n - ${results.failure.join('\n - ')}`;
  }
  return msg;
};

/**
 *
 * @param message
 * @returns {AxiosPromise<any>}
 */
const sendToSlack = (message) => {
  return axios.post(SLACK_WEBHOOK, { text: message });
};

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
  for (const tableName of tables) {
    try {
      await createBackup(tableName);
      results.success.push(tableName);
    } catch (err) {
      console.log(`Error creating backup for table ${tableName}.\n. Error: ${JSON.stringify(err)}`);
      results.failure.push(tableName);
    }
  }
  return results;
};