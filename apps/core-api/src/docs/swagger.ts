import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Banking Ledger API',
      version: '1.0.0',
      description: 'A comprehensive banking ledger API built with TigerBeetle and Node.js',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: 'http://localhost:7001',
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        Account: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: 'Unique account identifier',
              example: '1234567890',
            },
          },
        },
        LoanAccount: {
          allOf: [
            { $ref: '#/components/schemas/Account' },
            {
              type: 'object',
              properties: {
                monthlyPayment: {
                  type: 'string',
                  description: 'Monthly payment amount in cents',
                  example: '156789',
                },
              },
            },
          ],
        },
        Balance: {
          type: 'object',
          properties: {
            debits: {
              type: 'string',
              description: 'Total debits in cents',
              example: '1000000',
            },
            credits: {
              type: 'string',
              description: 'Total credits in cents',
              example: '2000000',
            },
            balance: {
              type: 'string',
              description: 'Net balance in cents',
              example: '1000000',
            },
          },
          required: ['debits', 'credits', 'balance'],
        },
        Transfer: {
          type: 'object',
          properties: {
            transferId: {
              type: 'string',
              description: 'Unique transfer identifier',
              example: '9876543210',
            },
          },
          required: ['transferId'],
        },
        CreateDepositAccount: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['DEPOSIT'],
              example: 'DEPOSIT',
            },
            customerId: {
              type: 'string',
              maxLength: 50,
              pattern: '^[A-Za-z0-9\\-_]+$',
              description:
                'Customer identifier (max 50 chars, letters, numbers, hyphens, underscores)',
              example: 'CUST-001',
            },
            currency: {
              type: 'string',
              enum: ['USD', 'EUR', 'GBP', 'NOK', 'SEK', 'DKK', 'JPY', 'CAD', 'AUD', 'CHF'],
              example: 'USD',
            },
            initialBalance: {
              type: 'string',
              description: 'Initial balance in cents (optional)',
              example: '100000',
            },
          },
          required: ['type', 'customerId', 'currency'],
        },
        CreateLoanAccount: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['LOAN'],
              example: 'LOAN',
            },
            customerId: {
              type: 'string',
              maxLength: 50,
              pattern: '^[A-Za-z0-9\\-_]+$',
              description:
                'Customer identifier (max 50 chars, letters, numbers, hyphens, underscores)',
              example: 'CUST-001',
            },
            currency: {
              type: 'string',
              enum: ['USD', 'EUR', 'GBP', 'NOK', 'SEK', 'DKK', 'JPY', 'CAD', 'AUD', 'CHF'],
              example: 'USD',
            },
            principalAmount: {
              type: 'string',
              description: 'Loan principal amount in cents',
              example: '20000000',
            },
            interestRate: {
              type: 'string',
              description: 'Annual interest rate (0-100)',
              example: '4.5',
            },
            termMonths: {
              type: 'string',
              description: 'Loan term in months (1-480)',
              example: '360',
            },
            loanType: {
              type: 'string',
              enum: ['ANNUITY', 'SERIAL'],
              description: 'Type of loan payment structure',
              example: 'ANNUITY',
            },
            paymentFrequency: {
              type: 'string',
              enum: ['WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY'],
              description: 'How often payments are due',
              example: 'MONTHLY',
            },
            fees: {
              type: 'array',
              description: 'Additional fees associated with the loan',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: [
                      'ORIGINATION',
                      'PROCESSING',
                      'INSURANCE',
                      'LATE_PAYMENT',
                      'PREPAYMENT',
                      'APPRAISAL',
                      'ADMINISTRATION',
                    ],
                    example: 'ORIGINATION',
                  },
                  amount: {
                    type: 'string',
                    description: 'Fee amount in cents',
                    example: '50000',
                  },
                  description: {
                    type: 'string',
                    description: 'Fee description',
                    example: 'Origination fee',
                  },
                },
                required: ['type', 'amount', 'description'],
              },
            },
          },
          required: [
            'type',
            'customerId',
            'currency',
            'principalAmount',
            'interestRate',
            'termMonths',
            'loanType',
            'paymentFrequency',
            'fees',
          ],
        },
        CreateCreditAccount: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['CREDIT'],
              example: 'CREDIT',
            },
            customerId: {
              type: 'string',
              maxLength: 50,
              pattern: '^[A-Za-z0-9\\-_]+$',
              description:
                'Customer identifier (max 50 chars, letters, numbers, hyphens, underscores)',
              example: 'CUST-001',
            },
            currency: {
              type: 'string',
              enum: ['USD', 'EUR', 'GBP', 'NOK', 'SEK', 'DKK', 'JPY', 'CAD', 'AUD', 'CHF'],
              example: 'USD',
            },
            creditLimit: {
              type: 'string',
              description: 'Credit limit in cents',
              example: '2500000',
            },
          },
          required: ['type', 'customerId', 'currency', 'creditLimit'],
        },
        CreateTransfer: {
          type: 'object',
          properties: {
            fromAccountId: {
              type: 'string',
              description: 'Source account identifier',
              example: '1234567890',
            },
            toAccountId: {
              type: 'string',
              description: 'Destination account identifier',
              example: '0987654321',
            },
            amount: {
              type: 'string',
              description: 'Transfer amount in cents',
              example: '100000',
            },
            currency: {
              type: 'string',
              enum: ['USD', 'EUR', 'NOK'],
              example: 'USD',
            },
          },
          required: ['fromAccountId', 'toAccountId', 'amount', 'currency'],
        },
        PaymentPlan: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: 'Associated account identifier',
              example: '1234567890',
            },
            principalAmount: {
              type: 'string',
              description: 'Loan principal amount in cents',
              example: '20000000',
            },
            interestRate: {
              type: 'number',
              description: 'Annual interest rate',
              example: 4.5,
            },
            termMonths: {
              type: 'integer',
              description: 'Loan term in months',
              example: 360,
            },
            monthlyPayment: {
              type: 'string',
              description: 'Payment amount in cents',
              example: '156789',
            },
            remainingPayments: {
              type: 'integer',
              description: 'Number of payments remaining',
              example: 350,
            },
            loanType: {
              type: 'string',
              enum: ['ANNUITY', 'SERIAL'],
              description: 'Type of loan payment structure',
              example: 'ANNUITY',
            },
            paymentFrequency: {
              type: 'string',
              enum: ['WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY'],
              description: 'How often payments are due',
              example: 'MONTHLY',
            },
            fees: {
              type: 'array',
              description: 'Fees associated with the loan',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: [
                      'ORIGINATION',
                      'PROCESSING',
                      'INSURANCE',
                      'LATE_PAYMENT',
                      'PREPAYMENT',
                      'APPRAISAL',
                      'ADMINISTRATION',
                    ],
                    example: 'ORIGINATION',
                  },
                  amount: {
                    type: 'string',
                    description: 'Fee amount in cents',
                    example: '50000',
                  },
                  description: {
                    type: 'string',
                    description: 'Fee description',
                    example: 'Origination fee',
                  },
                },
              },
            },
            totalLoanAmount: {
              type: 'string',
              description: 'Total loan amount including fees in cents',
              example: '20050000',
            },
          },
          required: [
            'accountId',
            'principalAmount',
            'interestRate',
            'termMonths',
            'monthlyPayment',
            'remainingPayments',
            'loanType',
            'paymentFrequency',
            'fees',
            'totalLoanAmount',
          ],
        },
        AmortizationSchedule: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: 'Associated account identifier',
              example: '1234567890',
            },
            totalPayments: {
              type: 'string',
              description: 'Total of all payments in cents',
              example: '56452440',
            },
            totalInterest: {
              type: 'string',
              description: 'Total interest paid in cents',
              example: '36452440',
            },
            schedule: {
              type: 'array',
              description: 'Payment schedule entries',
              items: {
                type: 'object',
                properties: {
                  paymentNumber: {
                    type: 'integer',
                    description: 'Payment number in sequence',
                    example: 1,
                  },
                  paymentDate: {
                    type: 'string',
                    format: 'date',
                    description: 'Payment due date',
                    example: '2024-02-01',
                  },
                  paymentAmount: {
                    type: 'string',
                    description: 'Total payment amount in cents',
                    example: '156789',
                  },
                  principalAmount: {
                    type: 'string',
                    description: 'Principal portion in cents',
                    example: '81789',
                  },
                  interestAmount: {
                    type: 'string',
                    description: 'Interest portion in cents',
                    example: '75000',
                  },
                  remainingBalance: {
                    type: 'string',
                    description: 'Remaining principal balance in cents',
                    example: '19918211',
                  },
                },
                required: [
                  'paymentNumber',
                  'paymentDate',
                  'paymentAmount',
                  'principalAmount',
                  'interestAmount',
                  'remainingBalance',
                ],
              },
            },
          },
          required: ['accountId', 'totalPayments', 'totalInterest', 'schedule'],
        },
        ACHCreditRequest: {
          type: 'object',
          properties: {
            targetAccountId: {
              type: 'string',
              description: 'Target account identifier for credit',
              example: '1234567890123456789',
            },
            amount: {
              type: 'string',
              description: 'Transaction amount in cents',
              example: '250000',
            },
            currency: {
              type: 'string',
              enum: ['USD'],
              description: 'Transaction currency (ACH only supports USD)',
              example: 'USD',
            },
            routingNumber: {
              type: 'string',
              pattern: '^[0-9]{9}$',
              description: 'US bank routing number (9 digits)',
              example: '021000021',
            },
            originatingBankName: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Name of the originating bank',
              example: 'JPMorgan Chase Bank, N.A.',
            },
            reference: {
              type: 'string',
              minLength: 1,
              maxLength: 140,
              description: 'Transaction reference description',
              example: 'Payroll deposit for employee #12345',
            },
            urgency: {
              type: 'string',
              enum: ['STANDARD', 'SAME_DAY', 'EXPRESS'],
              description: 'Processing urgency level',
              example: 'STANDARD',
            },
          },
          required: [
            'targetAccountId',
            'amount',
            'currency',
            'routingNumber',
            'originatingBankName',
            'reference',
            'urgency',
          ],
        },
        WireCreditRequest: {
          type: 'object',
          properties: {
            targetAccountId: {
              type: 'string',
              description: 'Target account identifier for credit',
              example: '1234567890123456789',
            },
            amount: {
              type: 'string',
              description: 'Transaction amount in cents',
              example: '750000',
            },
            currency: {
              type: 'string',
              enum: ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'],
              description: 'Transaction currency',
              example: 'EUR',
            },
            swiftCode: {
              type: 'string',
              minLength: 8,
              maxLength: 11,
              pattern: '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$',
              description: 'SWIFT/BIC code of originating bank',
              example: 'DEUTDEFF',
            },
            originatingBankName: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Name of the originating bank',
              example: 'Deutsche Bank AG',
            },
            correspondentBank: {
              type: 'string',
              maxLength: 100,
              description: 'Correspondent bank (optional)',
              example: 'Deutsche Bank Trust Company Americas',
            },
            reference: {
              type: 'string',
              minLength: 1,
              maxLength: 140,
              description: 'Transaction reference description',
              example: 'International business payment - Invoice #INV-2024-001',
            },
            urgency: {
              type: 'string',
              enum: ['STANDARD', 'EXPRESS', 'PRIORITY'],
              description: 'Processing urgency level',
              example: 'STANDARD',
            },
          },
          required: [
            'targetAccountId',
            'amount',
            'currency',
            'swiftCode',
            'originatingBankName',
            'reference',
            'urgency',
          ],
        },
        ExternalTransactionResponse: {
          type: 'object',
          properties: {
            transactionId: {
              type: 'string',
              description: 'Unique transaction identifier',
              example: 'ACH-STANDARD-1234567890-abc123',
            },
            status: {
              type: 'string',
              enum: ['SUCCESS', 'FAILED'],
              description: 'Transaction processing status',
              example: 'SUCCESS',
            },
            amount: {
              type: 'string',
              description: 'Transaction amount in cents',
              example: '250000',
            },
            currency: {
              type: 'string',
              description: 'Transaction currency',
              example: 'USD',
            },
            targetAccountId: {
              type: 'string',
              description: 'Target account identifier',
              example: '1234567890123456789',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Transaction processing timestamp',
              example: '2024-01-01T12:00:00.000Z',
            },
            estimatedSettlement: {
              type: 'string',
              format: 'date-time',
              description: 'Estimated settlement date/time',
              example: '2024-01-03T12:00:00.000Z',
            },
            errorDetails: {
              type: 'object',
              description: 'Error details (only present when status is FAILED)',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code',
                  example: 'ACH_PROCESSING_FAILED',
                },
                message: {
                  type: 'string',
                  description: 'Error message',
                  example: 'ACH network temporarily unavailable',
                },
                retryable: {
                  type: 'boolean',
                  description: 'Whether the transaction can be retried',
                  example: true,
                },
              },
            },
          },
          required: [
            'transactionId',
            'status',
            'amount',
            'currency',
            'targetAccountId',
            'timestamp',
          ],
        },
        TransactionStatusResponse: {
          type: 'object',
          properties: {
            transactionId: {
              type: 'string',
              description: 'Unique transaction identifier',
              example: 'WIRE-STANDARD-1234567890-xyz789',
            },
            status: {
              type: 'string',
              enum: ['SUCCESS', 'FAILED'],
              description: 'Transaction status',
              example: 'SUCCESS',
            },
            type: {
              type: 'string',
              enum: ['ACH_CREDIT', 'WIRE_CREDIT'],
              description: 'Transaction type',
              example: 'WIRE_CREDIT',
            },
            amount: {
              type: 'string',
              description: 'Transaction amount in cents',
              example: '750000',
            },
            currency: {
              type: 'string',
              description: 'Transaction currency',
              example: 'EUR',
            },
            targetAccountId: {
              type: 'string',
              description: 'Target account identifier',
              example: '1234567890123456789',
            },
            originatingBank: {
              type: 'string',
              description: 'Name of the originating bank',
              example: 'Deutsche Bank AG',
            },
            reference: {
              type: 'string',
              description: 'Transaction reference',
              example: 'International business payment - Invoice #INV-2024-001',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Transaction processing timestamp',
              example: '2024-01-01T12:00:00.000Z',
            },
            settlementDate: {
              type: 'string',
              format: 'date-time',
              description: 'Actual or estimated settlement date',
              example: '2024-01-02T12:00:00.000Z',
            },
            errorDetails: {
              type: 'object',
              description: 'Error details (only present when status is FAILED)',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code',
                  example: 'WIRE_PROCESSING_FAILED',
                },
                message: {
                  type: 'string',
                  description: 'Error message',
                  example: 'SWIFT network processing error',
                },
                retryable: {
                  type: 'boolean',
                  description: 'Whether the transaction can be retried',
                  example: true,
                },
              },
            },
          },
          required: [
            'transactionId',
            'status',
            'type',
            'amount',
            'currency',
            'targetAccountId',
            'originatingBank',
            'reference',
            'timestamp',
            'settlementDate',
          ],
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy', 'degraded'],
              example: 'healthy',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T12:00:00.000Z',
            },
            uptime: {
              type: 'number',
              description: 'Application uptime in seconds',
              example: 3600,
            },
            environment: {
              type: 'string',
              example: 'development',
            },
            version: {
              type: 'string',
              example: '1.0.0',
            },
            checks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  service: {
                    type: 'string',
                    example: 'database',
                  },
                  status: {
                    type: 'string',
                    enum: ['healthy', 'unhealthy', 'degraded'],
                    example: 'healthy',
                  },
                  responseTime: {
                    type: 'number',
                    description: 'Response time in milliseconds',
                    example: 25,
                  },
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid request data',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'customerId',
                  },
                  message: {
                    type: 'string',
                    example: 'Customer ID is required',
                  },
                  code: {
                    type: 'string',
                    example: 'invalid_type',
                  },
                },
              },
            },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Get application health status',
          description:
            'Returns comprehensive health information about the application and its dependencies',
          responses: {
            '200': {
              description: 'Application is healthy',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthResponse',
                  },
                },
              },
            },
            '503': {
              description: 'Application is unhealthy',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/health/ready': {
        get: {
          tags: ['Health'],
          summary: 'Get readiness status',
          description: 'Returns whether the application is ready to handle requests',
          responses: {
            '200': {
              description: 'Application is ready',
            },
            '503': {
              description: 'Application is not ready',
            },
          },
        },
      },
      '/health/live': {
        get: {
          tags: ['Health'],
          summary: 'Get liveness status',
          description: 'Returns whether the application is alive',
          responses: {
            '200': {
              description: 'Application is alive',
            },
            '503': {
              description: 'Application is not alive',
            },
          },
        },
      },
      '/accounts': {
        post: {
          tags: ['Accounts'],
          summary: 'Create a new account',
          description: 'Creates a new deposit, loan, or credit account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/CreateDepositAccount' },
                    { $ref: '#/components/schemas/CreateLoanAccount' },
                    { $ref: '#/components/schemas/CreateCreditAccount' },
                  ],
                },
                examples: {
                  deposit: {
                    summary: 'Create deposit account',
                    value: {
                      type: 'DEPOSIT',
                      customerId: 'CUST001',
                      currency: 'USD',
                      initialBalance: '100000',
                    },
                  },
                  loan: {
                    summary: 'Create loan account',
                    value: {
                      type: 'LOAN',
                      customerId: 'CUST001',
                      currency: 'USD',
                      principalAmount: '20000000',
                      interestRate: '4.5',
                      termMonths: '360',
                      loanType: 'ANNUITY',
                      paymentFrequency: 'MONTHLY',
                      fees: [
                        {
                          type: 'ORIGINATION',
                          amount: '50000',
                          description: 'Origination fee',
                        },
                      ],
                    },
                  },
                  credit: {
                    summary: 'Create credit account',
                    value: {
                      type: 'CREDIT',
                      customerId: 'CUST001',
                      currency: 'USD',
                      creditLimit: '2500000',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Account created successfully',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      { $ref: '#/components/schemas/Account' },
                      { $ref: '#/components/schemas/LoanAccount' },
                    ],
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request data',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/accounts/{accountId}/balance': {
        get: {
          tags: ['Accounts'],
          summary: 'Get account balance',
          description: 'Retrieves the current balance for the specified account',
          parameters: [
            {
              name: 'accountId',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'The account identifier',
              example: '1234567890',
            },
          ],
          responses: {
            '200': {
              description: 'Account balance retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Balance',
                  },
                },
              },
            },
            '400': {
              description: 'Invalid account ID',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/transfers': {
        post: {
          tags: ['Transfers'],
          summary: 'Create a transfer',
          description: 'Creates a transfer between two accounts',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateTransfer',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Transfer created successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Transfer',
                  },
                },
              },
            },
            '400': {
              description: 'Invalid transfer data',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/accounts/{accountId}/payment-plan': {
        get: {
          tags: ['Payment Plans'],
          summary: 'Get payment plan details',
          description: 'Retrieves the payment plan details for the specified loan account',
          parameters: [
            {
              name: 'accountId',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'The loan account identifier',
              example: '1234567890',
            },
          ],
          responses: {
            '200': {
              description: 'Payment plan retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/PaymentPlan',
                  },
                },
              },
            },
            '404': {
              description: 'Payment plan not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/accounts/{accountId}/amortization-schedule': {
        get: {
          tags: ['Payment Plans'],
          summary: 'Get amortization schedule',
          description:
            'Generates and retrieves the complete amortization schedule for the specified loan account',
          parameters: [
            {
              name: 'accountId',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'The loan account identifier',
              example: '1234567890',
            },
          ],
          responses: {
            '200': {
              description: 'Amortization schedule generated successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/AmortizationSchedule',
                  },
                },
              },
            },
            '404': {
              description: 'Payment plan not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/customers/{customerId}/accounts': {
        get: {
          tags: ['Customers'],
          summary: 'Get customer accounts',
          description: 'Retrieves all accounts associated with the specified customer',
          parameters: [
            {
              name: 'customerId',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                maxLength: 50,
                pattern: '^[A-Za-z0-9\\-_]+$',
              },
              description:
                'The customer identifier (max 50 chars, letters, numbers, hyphens, underscores)',
              example: 'CUST-001',
            },
          ],
          responses: {
            '200': {
              description: 'Customer accounts retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        accountId: {
                          type: 'string',
                          description: 'Unique account identifier',
                          example: '1234567890123456789',
                        },
                        customerId: {
                          type: 'string',
                          description: 'Customer identifier',
                          example: 'CUST001',
                        },
                        accountType: {
                          type: 'string',
                          enum: ['DEPOSIT', 'LOAN', 'CREDIT'],
                          description: 'Type of account',
                          example: 'DEPOSIT',
                        },
                        currency: {
                          type: 'string',
                          enum: ['USD', 'EUR', 'NOK'],
                          description: 'Account currency',
                          example: 'USD',
                        },
                        createdAt: {
                          type: 'string',
                          format: 'date-time',
                          description: 'Account creation timestamp',
                          example: '2024-01-01T12:00:00.000Z',
                        },
                        updatedAt: {
                          type: 'string',
                          format: 'date-time',
                          description: 'Account last update timestamp',
                          example: '2024-01-01T12:00:00.000Z',
                        },
                      },
                      required: [
                        'accountId',
                        'customerId',
                        'accountType',
                        'currency',
                        'createdAt',
                        'updatedAt',
                      ],
                    },
                  },
                  examples: {
                    multipleAccounts: {
                      summary: 'Customer with multiple accounts',
                      value: [
                        {
                          accountId: '1234567890123456789',
                          customerId: 'CUST-001',
                          accountType: 'DEPOSIT',
                          currency: 'USD',
                          createdAt: '2024-01-01T12:00:00.000Z',
                          updatedAt: '2024-01-01T12:00:00.000Z',
                        },
                        {
                          accountId: '9876543210987654321',
                          customerId: 'CUST-001',
                          accountType: 'LOAN',
                          currency: 'USD',
                          createdAt: '2024-01-02T10:30:00.000Z',
                          updatedAt: '2024-01-02T10:30:00.000Z',
                        },
                        {
                          accountId: '5555666677778888999',
                          customerId: 'CUST-001',
                          accountType: 'CREDIT',
                          currency: 'USD',
                          createdAt: '2024-01-03T14:15:00.000Z',
                          updatedAt: '2024-01-03T14:15:00.000Z',
                        },
                      ],
                    },
                    noAccounts: {
                      summary: 'Customer with no accounts',
                      value: [],
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid customer ID',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                  examples: {
                    invalidCustomerId: {
                      summary: 'Invalid customer ID format',
                      value: {
                        error: 'Validation failed',
                        details: [
                          {
                            field: 'customerId',
                            message:
                              'Customer ID must contain only uppercase letters, numbers, and underscores',
                            code: 'invalid_string',
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/external-transactions/ach-credit': {
        post: {
          tags: ['External Transactions'],
          summary: 'Process ACH credit transaction',
          description:
            'Processes an incoming ACH credit transaction from an external bank. ACH transactions support multiple urgency levels with different settlement times.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ACHCreditRequest',
                },
                examples: {
                  standard: {
                    summary: 'Standard ACH Credit (2 days settlement)',
                    value: {
                      targetAccountId: '1234567890123456789',
                      amount: '250000',
                      currency: 'USD',
                      routingNumber: '021000021',
                      originatingBankName: 'JPMorgan Chase Bank, N.A.',
                      reference: 'Payroll deposit for employee #12345',
                      urgency: 'STANDARD',
                    },
                  },
                  sameDay: {
                    summary: 'Same Day ACH Credit (6 hours settlement)',
                    value: {
                      targetAccountId: '1234567890123456789',
                      amount: '100000',
                      currency: 'USD',
                      routingNumber: '021000021',
                      originatingBankName: 'JPMorgan Chase Bank, N.A.',
                      reference: 'Urgent vendor payment',
                      urgency: 'SAME_DAY',
                    },
                  },
                  express: {
                    summary: 'Express ACH Credit (2 hours settlement)',
                    value: {
                      targetAccountId: '1234567890123456789',
                      amount: '500000',
                      currency: 'USD',
                      routingNumber: '021000021',
                      originatingBankName: 'JPMorgan Chase Bank, N.A.',
                      reference: 'Emergency fund transfer',
                      urgency: 'EXPRESS',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'ACH credit transaction processed successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ExternalTransactionResponse',
                  },
                  examples: {
                    success: {
                      summary: 'Successful ACH credit transaction',
                      value: {
                        transactionId: 'ACH-STANDARD-1234567890-abc123',
                        status: 'SUCCESS',
                        amount: '250000',
                        currency: 'USD',
                        targetAccountId: '1234567890123456789',
                        timestamp: '2024-01-01T12:00:00.000Z',
                        estimatedSettlement: '2024-01-03T12:00:00.000Z',
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request data or transaction failed',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      { $ref: '#/components/schemas/Error' },
                      { $ref: '#/components/schemas/ExternalTransactionResponse' },
                    ],
                  },
                  examples: {
                    validationError: {
                      summary: 'Validation error',
                      value: {
                        error: 'Validation failed',
                        details: [
                          {
                            field: 'routingNumber',
                            message: 'Routing number must be exactly 9 digits',
                            code: 'too_small',
                          },
                        ],
                      },
                    },
                    transactionFailed: {
                      summary: 'Transaction processing failed',
                      value: {
                        transactionId: 'ACH-STANDARD-1234567890-def456',
                        status: 'FAILED',
                        amount: '250000',
                        currency: 'USD',
                        targetAccountId: '1234567890123456789',
                        timestamp: '2024-01-01T12:00:00.000Z',
                        errorDetails: {
                          code: 'ACH_PROCESSING_FAILED',
                          message: 'ACH network temporarily unavailable',
                          retryable: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/external-transactions/wire-credit': {
        post: {
          tags: ['External Transactions'],
          summary: 'Process Wire credit transaction',
          description:
            'Processes an incoming international wire transfer from an external bank. Wire transfers support multiple currencies and faster settlement than ACH.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/WireCreditRequest',
                },
                examples: {
                  standardEUR: {
                    summary: 'Standard EUR Wire Transfer',
                    value: {
                      targetAccountId: '1234567890123456789',
                      amount: '750000',
                      currency: 'EUR',
                      swiftCode: 'DEUTDEFF',
                      originatingBankName: 'Deutsche Bank AG',
                      correspondentBank: 'Deutsche Bank Trust Company Americas',
                      reference: 'International business payment - Invoice #INV-2024-001',
                      urgency: 'STANDARD',
                    },
                  },
                  expressUSD: {
                    summary: 'Express USD Wire Transfer',
                    value: {
                      targetAccountId: '1234567890123456789',
                      amount: '1000000',
                      currency: 'USD',
                      swiftCode: 'CHASUS33',
                      originatingBankName: 'JPMorgan Chase Bank, N.A.',
                      reference: 'Urgent settlement payment',
                      urgency: 'EXPRESS',
                    },
                  },
                  priorityGBP: {
                    summary: 'Priority GBP Wire Transfer',
                    value: {
                      targetAccountId: '1234567890123456789',
                      amount: '500000',
                      currency: 'GBP',
                      swiftCode: 'BARCGB22',
                      originatingBankName: 'Barclays Bank PLC',
                      reference: 'Time-sensitive commercial transaction',
                      urgency: 'PRIORITY',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Wire credit transaction processed successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ExternalTransactionResponse',
                  },
                  examples: {
                    success: {
                      summary: 'Successful wire credit transaction',
                      value: {
                        transactionId: 'WIRE-STANDARD-1234567890-xyz789',
                        status: 'SUCCESS',
                        amount: '750000',
                        currency: 'EUR',
                        targetAccountId: '1234567890123456789',
                        timestamp: '2024-01-01T12:00:00.000Z',
                        estimatedSettlement: '2024-01-02T12:00:00.000Z',
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request data or transaction failed',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      { $ref: '#/components/schemas/Error' },
                      { $ref: '#/components/schemas/ExternalTransactionResponse' },
                    ],
                  },
                  examples: {
                    validationError: {
                      summary: 'Validation error',
                      value: {
                        error: 'Validation failed',
                        details: [
                          {
                            field: 'swiftCode',
                            message: 'SWIFT code must be in valid format',
                            code: 'invalid_string',
                          },
                        ],
                      },
                    },
                    transactionFailed: {
                      summary: 'Transaction processing failed',
                      value: {
                        transactionId: 'WIRE-STANDARD-1234567890-failed1',
                        status: 'FAILED',
                        amount: '750000',
                        currency: 'EUR',
                        targetAccountId: '1234567890123456789',
                        timestamp: '2024-01-01T12:00:00.000Z',
                        errorDetails: {
                          code: 'WIRE_PROCESSING_FAILED',
                          message: 'SWIFT network processing error',
                          retryable: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/external-transactions/status/{transactionId}': {
        get: {
          tags: ['External Transactions'],
          summary: 'Get transaction status',
          description:
            'Retrieves the current status and details of an external transaction by its unique transaction ID.',
          parameters: [
            {
              name: 'transactionId',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                pattern: '^(ACH|WIRE)-(STANDARD|SAME_DAY|EXPRESS|PRIORITY)-[0-9]+-[a-z0-9]+$',
              },
              description: 'Unique transaction identifier',
              examples: {
                achTransaction: {
                  summary: 'ACH Transaction ID',
                  value: 'ACH-STANDARD-1234567890-abc123',
                },
                wireTransaction: {
                  summary: 'Wire Transaction ID',
                  value: 'WIRE-EXPRESS-9876543210-xyz789',
                },
              },
            },
          ],
          responses: {
            '200': {
              description: 'Transaction status retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/TransactionStatusResponse',
                  },
                  examples: {
                    successfulACH: {
                      summary: 'Successful ACH Transaction Status',
                      value: {
                        transactionId: 'ACH-STANDARD-1234567890-abc123',
                        status: 'SUCCESS',
                        type: 'ACH_CREDIT',
                        amount: '250000',
                        currency: 'USD',
                        targetAccountId: '1234567890123456789',
                        originatingBank: 'JPMorgan Chase Bank, N.A.',
                        reference: 'Payroll deposit for employee #12345',
                        timestamp: '2024-01-01T12:00:00.000Z',
                        settlementDate: '2024-01-03T12:00:00.000Z',
                      },
                    },
                    successfulWire: {
                      summary: 'Successful Wire Transaction Status',
                      value: {
                        transactionId: 'WIRE-EXPRESS-9876543210-xyz789',
                        status: 'SUCCESS',
                        type: 'WIRE_CREDIT',
                        amount: '750000',
                        currency: 'EUR',
                        targetAccountId: '1234567890123456789',
                        originatingBank: 'Deutsche Bank AG',
                        reference: 'International business payment - Invoice #INV-2024-001',
                        timestamp: '2024-01-01T12:00:00.000Z',
                        settlementDate: '2024-01-01T16:00:00.000Z',
                      },
                    },
                    failedTransaction: {
                      summary: 'Failed Transaction Status',
                      value: {
                        transactionId: 'ACH-STANDARD-1234567890-failed1',
                        status: 'FAILED',
                        type: 'ACH_CREDIT',
                        amount: '250000',
                        currency: 'USD',
                        targetAccountId: '1234567890123456789',
                        originatingBank: 'JPMorgan Chase Bank, N.A.',
                        reference: 'Failed payroll deposit',
                        timestamp: '2024-01-01T12:00:00.000Z',
                        settlementDate: '2024-01-01T12:00:00.000Z',
                        errorDetails: {
                          code: 'ACH_PROCESSING_FAILED',
                          message: 'ACH network temporarily unavailable',
                          retryable: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid transaction ID format',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                  examples: {
                    invalidFormat: {
                      summary: 'Invalid transaction ID format',
                      value: {
                        error: 'Validation failed',
                        details: [
                          {
                            field: 'transactionId',
                            message: 'Transaction ID must match required format',
                            code: 'invalid_string',
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Transaction not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                  examples: {
                    notFound: {
                      summary: 'Transaction not found',
                      value: {
                        error: 'Transaction not found',
                        details: 'No transaction found with the specified ID',
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [], // We're defining everything inline above
};

export const specs = swaggerJSDoc(options);
