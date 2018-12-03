const Serverless = require('serverless');


const customs = [
  {
    dynamodbAutoBackups: {
      backupRate: 'rate(5 minutes)',
      source: 'src/backups.handler',
    },
  },
  {
    dynamodbAutoBackups: {
    },
  },
  {
    dynamodbAutoBackups: {
      source: 'src/backups.handler',
      backupRemovalEnabled: true,
    },
  },
  {
    dynamodbAutoBackups: {
      backupRate: 'rate(5 minutes)',
      source: 'src/backups.handler',
      backupRemovalEnabled: true,
    },
  },
  {
    dynamodbAutoBackups: {
      backupRate: 'rate(5 minutes)',
      source: 'src/backups.handler',
      backupRemovalEnabled: true,
      backupRetentionDays: 15,
    },
  },
  {
    dynamodbAutoBackups: {
      backupRate: 'rate(5 minutes)',
      source: 'src/backups.handler',
      backupRemovalEnabled: true,
      backupRetentionDays: 15,
    },
  },
];

const serverless = (number) => {
  const sls = new Serverless();
  sls.service.custom = customs[number];
  return sls;
};

module.exports = serverless;
