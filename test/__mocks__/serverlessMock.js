const Serverless = require('serverless');

const scenarios = {
  classic: {
    dynamodbAutoBackups: {
      backupRate: 'rate(5 minutes)',
      source:
        'src/backups.handler',
    }
    ,
  },
  empty: {
    dynamodbAutoBackups: {}
    ,
  },
  missed: {
    dynamodbAutoBackups: {
      source: 'src/backups.handler',
      backupRemovalEnabled:
        true,
    }
    ,
  },
  all: {
    dynamodbAutoBackups: {
      backupRate: 'rate(5 minutes)',
      source:
        'src/backups.handler',
      backupRemovalEnabled:
        true,
      backupRetentionDays:
        15,
    }
    ,
  },
  disabled: {
    dynamodbAutoBackups: {
      backupRate: 'rate(5 minutes)',
      source:
        'src/backups.handler',
      backupRemovalEnabled:
        true,
      backupRetentionDays:
        15,
      active: false,
    },
  },
};

const serverless = (scenarioName) => {
  const sls = new Serverless();
  sls.service.custom = scenarios[scenarioName];
  return sls;
};

module.exports = serverless;
