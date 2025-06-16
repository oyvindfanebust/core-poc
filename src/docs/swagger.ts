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
        url: 'http://localhost:3002',
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
        Invoice: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique invoice identifier',
              example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
            },
            accountId: {
              type: 'string',
              description: 'Associated account identifier',
              example: '1234567890',
            },
            amount: {
              type: 'string',
              description: 'Invoice amount in cents',
              example: '250000',
            },
            dueDate: {
              type: 'string',
              format: 'date',
              description: 'Invoice due date',
              example: '2024-12-01',
            },
            status: {
              type: 'string',
              enum: ['pending', 'paid', 'overdue'],
              description: 'Invoice status',
              example: 'pending',
            },
          },
          required: ['id', 'accountId', 'amount', 'dueDate', 'status'],
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
              maxLength: 8,
              pattern: '^[A-Z0-9_]+$',
              description: 'Customer identifier (max 8 chars, uppercase alphanumeric and underscore)',
              example: 'CUST001',
            },
            currency: {
              type: 'string',
              enum: ['USD', 'EUR', 'NOK'],
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
              maxLength: 8,
              pattern: '^[A-Z0-9_]+$',
              description: 'Customer identifier (max 8 chars, uppercase alphanumeric and underscore)',
              example: 'CUST001',
            },
            currency: {
              type: 'string',
              enum: ['USD', 'EUR', 'NOK'],
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
          },
          required: ['type', 'customerId', 'currency', 'principalAmount', 'interestRate', 'termMonths'],
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
              maxLength: 8,
              pattern: '^[A-Z0-9_]+$',
              description: 'Customer identifier (max 8 chars, uppercase alphanumeric and underscore)',
              example: 'CUST001',
            },
            currency: {
              type: 'string',
              enum: ['USD', 'EUR', 'NOK'],
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
        CreateInvoice: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: 'Associated account identifier',
              example: '1234567890',
            },
            amount: {
              type: 'string',
              description: 'Invoice amount in cents',
              example: '250000',
            },
            dueDate: {
              type: 'string',
              format: 'date',
              description: 'Invoice due date (YYYY-MM-DD)',
              example: '2024-12-01',
            },
          },
          required: ['accountId', 'amount', 'dueDate'],
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
      '/invoices': {
        post: {
          tags: ['Invoices'],
          summary: 'Create an invoice',
          description: 'Creates a new invoice for an account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateInvoice',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Invoice created successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Invoice',
                  },
                },
              },
            },
            '400': {
              description: 'Invalid invoice data',
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
      '/accounts/{accountId}/invoices': {
        get: {
          tags: ['Invoices'],
          summary: 'Get account invoices',
          description: 'Retrieves all invoices for the specified account',
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
              description: 'Invoices retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Invoice',
                    },
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
    },
  },
  apis: [], // We're defining everything inline above
};

export const specs = swaggerJSDoc(options);