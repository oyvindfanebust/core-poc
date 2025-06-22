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
              description: 'Customer identifier (max 50 chars, letters, numbers, hyphens, underscores)',
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
              description: 'Customer identifier (max 50 chars, letters, numbers, hyphens, underscores)',
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
                    enum: ['ORIGINATION', 'PROCESSING', 'INSURANCE', 'LATE_PAYMENT', 'PREPAYMENT', 'APPRAISAL', 'ADMINISTRATION'],
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
          required: ['type', 'customerId', 'currency', 'principalAmount', 'interestRate', 'termMonths', 'loanType', 'paymentFrequency', 'fees'],
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
              description: 'Customer identifier (max 50 chars, letters, numbers, hyphens, underscores)',
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
                    enum: ['ORIGINATION', 'PROCESSING', 'INSURANCE', 'LATE_PAYMENT', 'PREPAYMENT', 'APPRAISAL', 'ADMINISTRATION'],
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
          required: ['accountId', 'principalAmount', 'interestRate', 'termMonths', 'monthlyPayment', 'remainingPayments', 'loanType', 'paymentFrequency', 'fees', 'totalLoanAmount'],
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
                required: ['paymentNumber', 'paymentDate', 'paymentAmount', 'principalAmount', 'interestAmount', 'remainingBalance'],
              },
            },
          },
          required: ['accountId', 'totalPayments', 'totalInterest', 'schedule'],
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
          description: 'Returns comprehensive health information about the application and its dependencies',
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
          description: 'Generates and retrieves the complete amortization schedule for the specified loan account',
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
              description: 'The customer identifier (max 50 chars, letters, numbers, hyphens, underscores)',
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
                      required: ['accountId', 'customerId', 'accountType', 'currency', 'createdAt', 'updatedAt'],
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
                            message: 'Customer ID must contain only uppercase letters, numbers, and underscores',
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
    },
  },
  apis: [], // We're defining everything inline above
};

export const specs = swaggerJSDoc(options);