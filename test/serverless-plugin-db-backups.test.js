const serverless = require('./__mocks__/serverlessMock');
const DynamodbBackups = require('../serverless-plugin-db-backups');

describe('@unly/serverless-plugin-dynamodb-backups init', () => {
  global.console = {
    warn: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  };
  let slsPlugin;

  test('check if serverless version is >= 1.12', () => {
    slsPlugin = new DynamodbBackups(serverless('classic'));
    try {
      slsPlugin.serverless.version = '1.9.0';
      slsPlugin.validate();
    } catch (err) {
      expect(err.message).toEqual('Serverless version must be >= 1.12.0');
    }
  });

  test('custom config with no key source should throw error', () => {
    slsPlugin = new DynamodbBackups(serverless('empty'));
    try {
      slsPlugin.checkConfigPlugin();
    } catch (err) {
      expect(err.message).toEqual('dynamodbAutoBackups source must be set !');
    }
  });

  test('custom config with no key backupRate should throw error', () => {
    slsPlugin = new DynamodbBackups(serverless('missed'));
    try {
      slsPlugin.checkConfigPlugin();
    } catch (err) {
      expect(err.message).toEqual('dynamodbAutoBackups backupRate must be set !');
    }
  });

  test('custom config with key backupRemovalEnabled === true and no key backupRetentionDays should throw error', () => {
    try {
      slsPlugin.checkConfigPlugin();
    } catch (err) {
      expect(err.message).toEqual('if backupRemovalEnabled, backupRetentionDays must be set !');
    }
  });

  test('should provide function dynamodbAutoBackups', () => {
    slsPlugin = new DynamodbBackups(serverless('all'));

    const afterPackageInit = slsPlugin.hooks['after:package:initialize'];

    afterPackageInit().then(() => {
      expect(slsPlugin.functionBackup).toHaveProperty('name');
      expect(slsPlugin.functionBackup).toHaveProperty('events');
      expect(slsPlugin.functionBackup).toHaveProperty('handler');
      expect(slsPlugin.functionBackup).toHaveProperty('environment');
      expect(slsPlugin.serverless.service.provider.iamRoleStatements.length).toEqual(2);
      expect(slsPlugin.serverless.service.functions.dynamodbAutoBackups).toMatchObject(slsPlugin.functionBackup);
    });
  });

  test('if iamRoleStatements in serverles should merge it', () => {
    slsPlugin = new DynamodbBackups(serverless('all'));
    slsPlugin.serverless.service.provider.iamRoleStatements = [
      {
        Effect: 'Allow',
        Action:
          [
            'dynamodb:ListTables',
            'dynamodb:ListBackups',
            'dynamodb:DeleteBackup',
          ],
        Resource: '*',
      },
    ];

    const afterPackageInit = slsPlugin.hooks['after:package:initialize'];

    afterPackageInit().then(() => {
      expect(slsPlugin.functionBackup).toHaveProperty('name');
      expect(slsPlugin.functionBackup).toHaveProperty('events');
      expect(slsPlugin.functionBackup).toHaveProperty('handler');
      expect(slsPlugin.functionBackup).toHaveProperty('environment');
      expect(slsPlugin.serverless.service.provider.iamRoleStatements.length).toEqual(3);
      expect(global.console.log).toHaveBeenCalled();
    });
  });

  test('if iamRoleStatements in serverles should merge it', () => {
    slsPlugin = new DynamodbBackups(serverless('all'));
    slsPlugin.serverless.service.provider.iamRoleStatements = [
      {
        Effect: 'Allow',
        Action:
          [
            'dynamodb:ListTables',
            'dynamodb:ListBackups',
            'dynamodb:DeleteBackup',
          ],
        Resource: '*',
      },
    ];

    const afterPackageInit = slsPlugin.hooks['after:package:initialize'];

    afterPackageInit().then(() => {
      expect(slsPlugin.functionBackup).toHaveProperty('name');
      expect(slsPlugin.functionBackup).toHaveProperty('events');
      expect(slsPlugin.functionBackup).toHaveProperty('handler');
      expect(slsPlugin.functionBackup).toHaveProperty('environment');
      expect(slsPlugin.serverless.service.provider.iamRoleStatements.length).toEqual(3);
      expect(global.console.log).toHaveBeenCalled();
    });
  });

  test('should disabled plugin and not provide function dynamodbAutoBackups', () => {
    slsPlugin = new DynamodbBackups(serverless('disabled'));

    const afterPackageInit = slsPlugin.hooks['after:package:initialize'];

    afterPackageInit().then(() => {
      expect(slsPlugin.serverless.service.functions.dynamodbAutoBackups).toBeUndefined();
    });
  });
});
