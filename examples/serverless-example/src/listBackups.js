const filter = require('lodash.filter');
const moment = require('moment');
const AWS = require('aws-sdk');

/**
 * @param TableName
 * @returns {Promise<*|Array>}
 */
const listBackups = async (TableName) => {
  const Dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
  const TimeRangeLowerBound = moment().subtract(2, 'days').toISOString();
  const params = {
    TableName,
    BackupType: 'USER',
    TimeRangeLowerBound,
  };
  const data = await Dynamodb.listBackups(params).promise();

  return data.BackupSummaries || [];
};

export const handler = async (event, context) => {

  const data = await listBackups(process.env.TABLE_NAME);

  const backupsFiltered = filter(data, ['BackupType', 'USER']);

  return {
    statusCode: 200,
    body: JSON.stringify({ backupsFiltered }),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
};
