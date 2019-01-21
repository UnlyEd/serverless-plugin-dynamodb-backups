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

const hooks = [
  'after:package:initialize',
  'before:deploy:deploy',
  'before:invoke:local:invoke',
  'before:offline:start:init',
  'before:remove:remove',
  'before:logs:logs',
];

// iamRole Helpers
const iamRoleStatements = require('./helpers/iamRole');

/**
 *
 */
class DynamodbAutoBackup {
  constructor(serverless) {
    this.serverless = serverless;

    this.custom = this.serverless.service.custom;

    this.dynamodbAutoBackups = {};

    this.isInstantiate = false;

    this.chainPromises = () => BbPromise.bind(this)
      .then(this.validate)
      .then(this.checkConfigPlugin)
      .then(this.populateEnv)
      .then(this.generateBackupFunction)
      .then(this.manageIamRole);

    this.hooks = hooks.reduce((initialValue, hook) => assign(initialValue, { [hook]: () => this.init() }), {});
  }

  /**
   * Validate dynamodbAutoBackups options
   * @returns {Promise.resolve}
   */
  checkConfigPlugin() {
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
      DynamodbAutoBackup.consoleLog('@unly/serverless-plugin-dynamodb-backups: -----------------------------------------------------------');
      DynamodbAutoBackup.consoleLog('         Warning: slackWebhook is not provide, you will not be notified of errors !');
      console.log();
    }

    this.functionBackup = {
      name: this.dynamodbAutoBackups.name || 'dynamodbAutoBackups',
      handler: this.dynamodbAutoBackups.source,
      events: [],
      environment: {},
    };

    return BbPromise.resolve();
  }

  /**
   *
   * check the compatibility of serverless version
   * @returns {Promise.resolve}
   */
  validate() {
    // Check required serverless version
    if (SemVer.gt('1.12.0', this.serverless.getVersion())) {
      return BbPromise.reject(new this.serverless.classes.Error('Serverless version must be >= 1.12.0'));
    }

    return BbPromise.resolve();
  }

  /**
   * add the schedule event
   * @returns {Promise.resolve}
   */
  setCronEvent() {
    const events = [];

    if (isString(this.dynamodbAutoBackups.backupRate)) {
      const cron = {
        schedule: this.dynamodbAutoBackups.backupRate,
      };
      events.push(cron);
    }

    console.log(this.functionBackup);
    this.functionBackup.events = events;

    return BbPromise.resolve();
  }

  /**
   * Check config for variables and set them to dynamodbBackup function
   * @returns {Promise.resolve}
   */
  populateEnv() {
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

  /**
   * Assign dynamodbBackup function to serverless service
   * @returns {Promise.resolve}
   */
  generateBackupFunction() {
    const dynamodbAutoBackups = clone(this.functionBackup);
    dynamodbAutoBackups.events = uniqWith(this.functionBackup.events, isEqual);

    if (isPlainObject(dynamodbAutoBackups)) {
      assign(this.serverless.service.functions, { [this.dynamodbAutoBackups.name || 'dynamodbAutoBackups']: dynamodbAutoBackups });
    }

    DynamodbAutoBackup.consoleLog('@unly/serverless-plugin-dynamodb-backups: -----------------------------------------------------------');
    DynamodbAutoBackup.consoleLog(`     function:        ${this.functionBackup.name}`);
    console.log();
    return BbPromise.resolve();
  }

  /**
   * Provide iam access
   * @returns {Promise.resolve}
   */
  manageIamRole() {
    if (this.serverless.service.provider.iamRoleStatements) {
      iamRoleStatements.map((role) => this.serverless.service.provider.iamRoleStatements.push(role));
    } else {
      this.serverless.service.provider.iamRoleStatements = iamRoleStatements;
    }
    this.isInstantiate = true;
    return BbPromise.resolve();
  }

  /**
   * check if an instance of the class is already running
   * @returns {function}
   */
  isAlreadyInInstance() {
    if (this.isInstantiate) {
      return BbPromise.resolve();
    }
    return this.isActivated(this.chainPromises);
  }

  /**
   * check if the plugin config is activated
   * Default to true
   * @returns {function}
   */
  isActivated(cb) {
    DynamodbAutoBackup.consoleLog(`@unly/serverless-plugin-dynamodb-backups is ${this.dynamodbAutoBackups.active ? 'enabled' : 'disabled'}`);
    console.log();

    if (!this.dynamodbAutoBackups.active) {
      return BbPromise.resolve();
    }
    return cb();
  }

  /**
   * check if dynamodbAutoBackups options is provide
   * @returns {function}
   */
  init() {
    // if no dynamodbAutoBackups key at custom in serverless.yml or invalid format (throw error)
    if (!has(this.custom, 'dynamodbAutoBackups') || !isPlainObject(this.custom.dynamodbAutoBackups)) {
      return BbPromise.reject(
        new this.serverless.classes.Error('Invalid configuration, see https://www.npmjs.com/package/@unly/serverless-plugin-dynamodb-backups'),
      );
    }

    assign(this.dynamodbAutoBackups, this.custom.dynamodbAutoBackups);

    // if dynamodbAutoBackups.active is not provide, default value to true
    if (!has(this.dynamodbAutoBackups, 'active')) {
      set(this.dynamodbAutoBackups, 'active', true);
    }

    return this.isAlreadyInInstance();
  }

  /**
   *
   * @param message
   */
  static consoleLog(message) {
    console.log(chalk.yellow.bold(message));
  }
}

module.exports = DynamodbAutoBackup;
