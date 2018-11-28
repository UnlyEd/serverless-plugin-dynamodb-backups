const Serverless = require('serverless');

const DynamodbBackups = require('./serverless-plugin-db-backups');

jest.mock('./serverless-plugin-db-backups');

describe('validate', () => {

  let serverless;

  beforeEach(() => {
    DynamodbBackups.mockClear();
    serverless = new Serverless();
  });

  it('check if we called the class Constructor', () => {
    const slsPlugin = new DynamodbBackups(serverless);
    expect(DynamodbBackups).toHaveBeenCalledTimes(1);
  });

  it('Show that mockClear() is working', () => {
    expect(DynamodbBackups).not.toHaveBeenCalled();
  });
});