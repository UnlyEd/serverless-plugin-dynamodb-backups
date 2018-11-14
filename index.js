'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var AWS = require('aws-sdk');
var filter = require('lodash/filter');
var moment = require('moment');
var axios = require('axios');

var Dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var SLACK_WEBHOOK = process.env.SLACK_WEBHOOK;
var REGION = process.env.AWS_DEFAULT_REGION;
var CONSOLE_ENDPOINT = 'https://console.aws.amazon.com/dynamodb/home?region=' + REGION + '#backups:';
var BACKUP_RETENTION_DAYS = process.env.BACKUP_RETENTION_DAYS;
var BACKUP_REMOVAL_ENABLED = process.env.BACKUP_REMOVAL_ENABLED;
var TABLE_REGEX = process.env.TABLE_REGEX;

var dynamodbAutoBackups = function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(event, context) {
    var tables, results, message;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return getTablesToBackup();

          case 3:
            tables = _context.sent;

            if (!(BACKUP_REMOVAL_ENABLED === 'true')) {
              _context.next = 13;
              break;
            }

            _context.prev = 5;
            _context.next = 8;
            return removeStaleBackup(tables);

          case 8:
            _context.next = 13;
            break;

          case 10:
            _context.prev = 10;
            _context.t0 = _context['catch'](5);

            console.log('Error removing stale backups. Error: ' + JSON.stringify(_context.t0));

          case 13:
            _context.next = 15;
            return tablesToBackup(tables);

          case 15:
            results = _context.sent;


            if (SLACK_WEBHOOK) {
              message = formatMessage(results);

              sendToSlack(message);
            }

            _context.next = 22;
            break;

          case 19:
            _context.prev = 19;
            _context.t1 = _context['catch'](0);

            console.log(_context.t1);

          case 22:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined, [[0, 19], [5, 10]]);
  }));

  return function dynamodbAutoBackups(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

/**
 *
 * @param TableName
 * @returns {Promise<*>}
 */
var createBackup = function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(TableName) {
    var BackupName, params;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            BackupName = TableName + moment().format('_YYYY_MM_DD_HH-mm-ss');
            params = {
              BackupName: BackupName,
              TableName: TableName
            };
            return _context2.abrupt('return', Dynamodb.createBackup(params).promise());

          case 3:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, undefined);
  }));

  return function createBackup(_x3) {
    return _ref2.apply(this, arguments);
  };
}();

/**
 *
 * @returns {Promise<Array|*>}
 */
var getTablesToBackup = function () {
  var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3() {
    var data;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return Dynamodb.listTables({}).promise();

          case 2:
            data = _context3.sent;
            return _context3.abrupt('return', process.env.TABLE_REGEX ? filter(data.TableNames, function (val) {
              return new RegExp(TABLE_REGEX).test(val);
            }) : data.TableNames);

          case 4:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, undefined);
  }));

  return function getTablesToBackup() {
    return _ref3.apply(this, arguments);
  };
}();

/**
 *
 * @param tables
 * @returns {Promise<void>}
 */
var removeStaleBackup = function () {
  var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(tables) {
    var _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, tableName, backupSummaries, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, table, params;

    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _iteratorNormalCompletion = true;
            _didIteratorError = false;
            _iteratorError = undefined;
            _context4.prev = 3;
            _iterator = tables[Symbol.iterator]();

          case 5:
            if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
              _context4.next = 41;
              break;
            }

            tableName = _step.value;
            _context4.next = 9;
            return listBackups(tableName);

          case 9:
            backupSummaries = _context4.sent;
            _iteratorNormalCompletion2 = true;
            _didIteratorError2 = false;
            _iteratorError2 = undefined;
            _context4.prev = 13;
            _iterator2 = backupSummaries[Symbol.iterator]();

          case 15:
            if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
              _context4.next = 24;
              break;
            }

            table = _step2.value;
            params = {
              BackupArn: table.BackupArn
            };
            _context4.next = 20;
            return Dynamodb.deleteBackup(params).promise();

          case 20:
            console.log('Deleted Backups done for ' + tableName);

          case 21:
            _iteratorNormalCompletion2 = true;
            _context4.next = 15;
            break;

          case 24:
            _context4.next = 30;
            break;

          case 26:
            _context4.prev = 26;
            _context4.t0 = _context4['catch'](13);
            _didIteratorError2 = true;
            _iteratorError2 = _context4.t0;

          case 30:
            _context4.prev = 30;
            _context4.prev = 31;

            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }

          case 33:
            _context4.prev = 33;

            if (!_didIteratorError2) {
              _context4.next = 36;
              break;
            }

            throw _iteratorError2;

          case 36:
            return _context4.finish(33);

          case 37:
            return _context4.finish(30);

          case 38:
            _iteratorNormalCompletion = true;
            _context4.next = 5;
            break;

          case 41:
            _context4.next = 47;
            break;

          case 43:
            _context4.prev = 43;
            _context4.t1 = _context4['catch'](3);
            _didIteratorError = true;
            _iteratorError = _context4.t1;

          case 47:
            _context4.prev = 47;
            _context4.prev = 48;

            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }

          case 50:
            _context4.prev = 50;

            if (!_didIteratorError) {
              _context4.next = 53;
              break;
            }

            throw _iteratorError;

          case 53:
            return _context4.finish(50);

          case 54:
            return _context4.finish(47);

          case 55:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, undefined, [[3, 43, 47, 55], [13, 26, 30, 38], [31,, 33, 37], [48,, 50, 54]]);
  }));

  return function removeStaleBackup(_x4) {
    return _ref4.apply(this, arguments);
  };
}();

/**
 *
 * @param TableName
 * @returns {Promise<*|Array>}
 */
var listBackups = function () {
  var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(TableName) {
    var TimeRangeUpperBound, params, data;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            TimeRangeUpperBound = moment().subtract(BACKUP_RETENTION_DAYS, 'days').unix();
            params = {
              TableName: TableName,
              BackupType: process.env.BACKUP_TYPE || 'ALL',
              TimeRangeUpperBound: TimeRangeUpperBound
            };


            console.log('Removing backups before the following date: ' + moment(TimeRangeUpperBound).format('LL'));

            _context5.next = 5;
            return Dynamodb.listBackups(params).promise();

          case 5:
            data = _context5.sent;
            return _context5.abrupt('return', data.BackupSummaries || []);

          case 7:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, undefined);
  }));

  return function listBackups(_x5) {
    return _ref5.apply(this, arguments);
  };
}();

/**
 *
 * @param results
 * @returns {string}
 */
var formatMessage = function formatMessage(results) {
  var msg = '';
  var success = results.success.length;
  var failure = results.failure.length;

  if (!results['success'].length && !results['failure'].length) {
    return 'Tried running DynamoDB backup, but no tables were specified.\nPlease check your configuration.';
  }
  msg += 'Tried to backup ' + results.success.length + ' DynamoDB tables. ' + success + ' succeeded, and ' + failure + ' failed. \n  See all backups' + ('<' + CONSOLE_ENDPOINT + '|here>') + '.';

  if (results.success.length) {
    msg += '\nThe following tables were successful:\n - ' + results.success.join('\n - ');
  }

  if (results.failure.length) {
    msg += '\nThe following tables failed:\n - ' + results.failure.join('\n - ');
  }
  return msg;
};

/**
 *
 * @param message
 * @returns {AxiosPromise<any>}
 */
var sendToSlack = function sendToSlack(message) {
  return axios.post(SLACK_WEBHOOK, { text: message });
};

/**
 *
 * @param tables
 * @returns {Promise<{success: Array, failure: Array}>}
 */
var tablesToBackup = function () {
  var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(tables) {
    var results, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, tableName;

    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            results = {
              success: [],
              failure: []
            };
            _iteratorNormalCompletion3 = true;
            _didIteratorError3 = false;
            _iteratorError3 = undefined;
            _context6.prev = 4;
            _iterator3 = tables[Symbol.iterator]();

          case 6:
            if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
              _context6.next = 21;
              break;
            }

            tableName = _step3.value;
            _context6.prev = 8;
            _context6.next = 11;
            return createBackup(tableName);

          case 11:
            results.success.push(tableName);
            _context6.next = 18;
            break;

          case 14:
            _context6.prev = 14;
            _context6.t0 = _context6['catch'](8);

            console.log('Error creating backup for table ' + tableName + '.\n. Error: ' + JSON.stringify(_context6.t0));
            results.failure.push(tableName);

          case 18:
            _iteratorNormalCompletion3 = true;
            _context6.next = 6;
            break;

          case 21:
            _context6.next = 27;
            break;

          case 23:
            _context6.prev = 23;
            _context6.t1 = _context6['catch'](4);
            _didIteratorError3 = true;
            _iteratorError3 = _context6.t1;

          case 27:
            _context6.prev = 27;
            _context6.prev = 28;

            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }

          case 30:
            _context6.prev = 30;

            if (!_didIteratorError3) {
              _context6.next = 33;
              break;
            }

            throw _iteratorError3;

          case 33:
            return _context6.finish(30);

          case 34:
            return _context6.finish(27);

          case 35:
            return _context6.abrupt('return', results);

          case 36:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, undefined, [[4, 23, 27, 35], [8, 14], [28,, 30, 34]]);
  }));

  return function tablesToBackup(_x6) {
    return _ref6.apply(this, arguments);
  };
}();

exports.default = dynamodbAutoBackups;
