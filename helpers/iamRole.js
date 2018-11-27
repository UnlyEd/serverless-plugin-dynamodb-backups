module.exports = [
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
  {
    Effect: 'Allow',
    Action: ['dynamodb:CreateBackup'],
    Resource: {
      'Fn::Join': [
        ':', [
          'arn:aws:dynamodb',
          { Ref: 'AWS::Region' },
          { Ref: 'AWS::AccountId' },
          'table/*',
        ],
      ],
    },
  },
];

