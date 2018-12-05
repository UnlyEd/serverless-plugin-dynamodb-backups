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
 * @param message
 */
const log = (message) => {
  console.log('@unly/serverless-plugin-dynamodb-backups:', message);
};

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

  try {
    const data = await Dynamodb.listBackups(params).promise();
    return data.BackupSummaries || [];
  } catch (err) {
    log(`Error could not list backups on table ${TableName}`);
  }
};

/**
 *
 * @param tables
 * @returns {Promise<void>}
 */
const removeStaleBackup = async (tables) => {
  log(`Removing backups before the following date: ${moment().subtract(BACKUP_RETENTION_DAYS, 'days').format('LL')}`);

  const backupSummaries = tables.map((tableName) => listBackups(tableName));

  const resolveBackupSummaries = await Promise.all(backupSummaries);

  const deleteBackupsPromise = resolveBackupSummaries.map((backupLogs) => backupLogs.map((backup) => {
    const params = {
      BackupArn: backup.BackupArn,
    };

    return Dynamodb.deleteBackup(params).promise()
      .then(({ BackupDescription }) => ({
        name: BackupDescription.BackupDetails.BackupName,
        deleted: true,
      })).catch((err) => ({
        deleted: false,
        error: err,
      }));
  }));

  const results = deleteBackupsPromise.reduce((acc, el) => acc.concat(el), []);

  return Promise.all(results).then((res) => {
    const success = filter(res, 'deleted');
    const failure = filter(res, ['deleted', false]);

    return { success, failure };
  }).catch((err) => log(JSON.stringify(err, null, 2)));
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

  if (!results.success.length && !results.failure.length) {
    return '@unly/serverless-plugin-dynamodb-backups: Tried running DynamoDB backup, but no tables were specified.\nPlease check your configuration.';
  }

  if (results.failure.length) {
    msg += '\n@unly/serverless-plugin-dynamodb-backups:\n';
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
  const promises = tables.map(async (tableName) => createBackup(tableName).then(({ BackupDetails }) => ({
    name: BackupDetails.BackupName,
    created: true,
    status: BackupDetails.BackupStatus,
  })).catch((err) => ({
    created: false,
    error: err,
  })));
  return Promise.all(promises).then((res) => {
    const success = filter(res, 'created');
    const failure = filter(res, ['created', false]);

    return { success, failure };
  }).catch((err) => log(JSON.stringify(err, null, 2)));
};

const dynamodbAutoBackups = async (event, context) => {
  try {
    const tables = await getTablesToBackup();

    if (BACKUP_REMOVAL_ENABLED === 'true') {
      try {
        const removeStaleBackupResults = await removeStaleBackup(tables);
        console.log(removeStaleBackupResults);
      } catch (err) {
        log(`Error removing stale backups. Error: ${JSON.stringify(err)}`);
      }
    }

    if (process.env.CLEAN === 'true') {
      const tablesToBackupResults = await tablesToBackup(tables);
      console.log(tablesToBackupResults);

      if (SLACK_WEBHOOK && tablesToBackupResults.failure.length) {
        const message = formatMessage(tablesToBackupResults);
        sendToSlack(message);
      }

      log(JSON.stringify(tablesToBackupResults, null, 2));
    }
  } catch (err) {
    log(err);
  }
};

module.exports = dynamodbAutoBackups;
