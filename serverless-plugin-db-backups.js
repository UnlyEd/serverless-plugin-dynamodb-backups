'use strict';

const isString = require('lodash.isstring');
const clone = require('lodash.clone');
const has = require('lodash.has');
const isPlainObject = require('lodash.isplainobject');
const set = require('lodash.set');
const assign = require('lodash.assign');
const uniqWith = require('lodash.uniqwith');
const isEqual = require('lodash.isequal');
const BbPromise = require('bluebird');
const SemVer = require('semver');
const chalk = require('chalk');

// iamRole Helpers
const iamRoleStatements = require('./helpers/iamRole');

/**
 *
 */
class DynamodbAutoBackup {
  constructor(serverless) {
    this.serverless = serverless;
    this.custom = this.serverless.service.custom;

    this.hooks = {
      'before:package:initialize': () => BbPromise.bind(this)
        .then(this.validate),

      'after:package:initialize': () => BbPromise.bind(this)
        .then(this.validate)
        .then(this.constructFunctionObject)
        .then(this.populateEnv)
        .then(this.generateBackupFunction)
        .then(this.manageIamRole),

      'before:deploy:deploy': () => BbPromise.bind(this)
        .then(this.validate)
        .then(this.constructFunctionObject)
        .then(this.populateEnv)
        .then(this.generateBackupFunction)
        .then(this.instrumentFunctions)
        .then(this.manageIamRole),

      'before:invoke:local:invoke': () => BbPromise.bind(this)
        .then(this.validate)
        .then(this.constructFunctionObject)
        .then(this.populateEnv)
        .then(this.generateBackupFunction)
        .then(this.manageIamRole),

      'before:offline:start:init': () => BbPromise.bind(this)
        .then(this.validate)
        .then(this.constructFunctionObject)
        .then(this.populateEnv)
        .then(this.generateBackupFunction)
        .then(this.instrumentFunctions)
        .then(this.manageIamRole),

      'before:remove:remove': () => BbPromise.bind(this)
        .then(this.validate)
        .then(this.constructFunctionObject)
        .then(this.populateEnv)
        .then(this.generateBackupFunction)
        .then(this.instrumentFunctions)
        .then(this.manageIamRole),

      'before:logs:logs': () => BbPromise.bind(this)
        .then(this.validate)
        .then(this.constructFunctionObject)
        .then(this.populateEnv)
        .then(this.generateBackupFunction)
        .then(this.instrumentFunctions)
        .then(this.manageIamRole),
    };
  }

  configPlugin() {
    if (this.ready) {
      return BbPromise.resolve();
    }

    this.dynamodbAutoBackups = {};

    if (has(this.custom, 'dynamodbAutoBackups') && isPlainObject(this.custom.dynamodbAutoBackups)) {
      assign(this.dynamodbAutoBackups, this.custom.dynamodbAutoBackups);
    }

    // Set configuration
    // Validate dynamodbAutoBackups options
    if (!has(this.dynamodbAutoBackups, 'active')) {
      set(this.dynamodbAutoBackups, 'active', true);
    }

    console.log(chalk.yellow.bold('@unly/serverless-plugin-dynamodb-backups is'), this.dynamodbAutoBackups.active ? 'enabled' : 'disabled');
    console.log();

    if (!this.dynamodbAutoBackups.source) {
      return BbPromise.reject(new this.serverless.classes.Error('dynamodbAutoBackups source must be set !'));
    }

    if (!this.dynamodbAutoBackups.backupRate) {
      return BbPromise.reject(new this.serverless.classes.Error('dynamodbAutoBackups backupRate must be set !'));
    }

    if (has(this.dynamodbAutoBackups, 'backupRemovalEnabled') && !has(this.dynamodbAutoBackups, 'backupRetentionDays')) {
      return BbPromise.reject(
        new this.serverless.classes.Error('if backupRemovalEnabled, backupRetentionDays must be set !'),
      );
    }

    if (!has(this.dynamodbAutoBackups, 'slackWebhook') && this.dynamodbAutoBackups.active) {
      console.log(chalk.yellow.bold('@unly/serverless-plugin-dynamodb-backups: -----------------------------------------------------------'));
      console.log('         Warning: slackWebhook is not provide, you will not be notified of errors !');
      console.log();
    }

    this.functionBackup = {
      name: this.dynamodbAutoBackups.name || 'dynamodbAutoBackups',
      handler: this.dynamodbAutoBackups.source,
      events: [],
      environment: {},
    };

    this.ready = true;

    return BbPromise.resolve();
  }

  validate() {
    if (this.validated && this.ready) {
      // Already setup and running
      return BbPromise.resolve();
    }

    // Check required serverless version
    if (SemVer.gt('1.12.0', this.serverless.getVersion())) {
      return BbPromise.reject(new this.serverless.classes.Error('Serverless version must be >= 1.12.0'));
    }

    this.validated = true;

    return this.configPlugin();
  }

  constructFunctionObject() {
    if (!this.dynamodbAutoBackups.active) {
      return BbPromise.resolve();
    }
    const events = [];

    if (isString(this.dynamodbAutoBackups.backupRate)) {
      const cron = {
        schedule: this.dynamodbAutoBackups.backupRate,
      };
      events.push(cron);
    }

    this.functionBackup.events = events;

    return BbPromise.resolve();
  }

  populateEnv() {
    if (!this.dynamodbAutoBackups.active) {
      return BbPromise.resolve();
    }
    // Environment variables have to be a string in order to be processed properly
    if (has(this.dynamodbAutoBackups, 'backupRemovalEnabled') && has(this.dynamodbAutoBackups, 'backupRetentionDays')) {
      set(this.functionBackup, 'environment.BACKUP_REMOVAL_ENABLED', String(this.dynamodbAutoBackups.backupRemovalEnabled));
      set(this.functionBackup, 'environment.BACKUP_RETENTION_DAYS', String(this.dynamodbAutoBackups.backupRetentionDays));
    }
    if (has(this.dynamodbAutoBackups, 'slackWebhook')) {
      set(this.functionBackup, 'environment.SLACK_WEBHOOK', String(this.dynamodbAutoBackups.slackWebhook));
    }
    if (has(this.dynamodbAutoBackups, 'backupType')) {
      set(this.functionBackup, 'environment.BACKUP_TYPE', String(this.dynamodbAutoBackups.backupType).toUpperCase());
    }
    if (has(this.dynamodbAutoBackups, 'tableRegex')) {
      set(this.functionBackup, 'environment.TABLE_REGEX', String(this.dynamodbAutoBackups.tableRegex));
    }
    return BbPromise.resolve();
  }

  generateBackupFunction() {
    if (!this.dynamodbAutoBackups.active) {
      return BbPromise.resolve();
    }
    const dynamodbAutoBackups = clone(this.functionBackup);
    dynamodbAutoBackups.events = uniqWith(this.functionBackup.events, isEqual);

    if (isPlainObject(dynamodbAutoBackups)) {
      assign(this.serverless.service.functions, { [this.dynamodbAutoBackups.name || 'dynamodbAutoBackups']: dynamodbAutoBackups });
    }

    console.log(chalk.yellow.bold('@unly/serverless-plugin-dynamodb-backups:'), ` ${this.functionBackup.name} was created`);
    console.log();
    return BbPromise.resolve();
  }

  instrumentFunctions() {
    if (!this.dynamodbAutoBackups.active) {
      return BbPromise.resolve();
    }
    const allFunctions = this.serverless.service.getAllFunctionsNames();

    console.log(chalk.yellow.bold('@unly/serverless-plugin-dynamodb-backups: -----------------------------------------------------------'));
    return BbPromise.map(allFunctions, (functionName) => DynamodbAutoBackup.consoleLog(functionName));
  }

  manageIamRole() {
    if (!this.dynamodbAutoBackups.active) {
      return BbPromise.resolve();
    }
    if (this.serverless.service.provider.iamRoleStatements) {
      iamRoleStatements.map((role) => this.serverless.service.provider.iamRoleStatements.push(role));
    } else {
      this.serverless.service.provider.iamRoleStatements = iamRoleStatements;
    }
    return BbPromise.resolve();
  }

  static consoleLog(functionName) {
    console.log(chalk.yellow(`     function:        ${functionName}`));
  }
}

module.exports = DynamodbAutoBackup;
