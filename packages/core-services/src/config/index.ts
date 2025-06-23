import { validateConfig } from './validation.js';

export interface Config {
  port: number;
  tigerbeetle: {
    address: string;
    clusterId: bigint;
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    poolSize: number;
    idleTimeout: number;
    connectionTimeout: number;
  };
  cdc: {
    amqpUrl: string;
    exchange: string;
    queue: string;
    routingKeys: string[];
    autoAck: boolean;
  };
  env: string;
  logLevel: string;
}

let cachedConfig: Config | null = null;

export const getConfig = (): Config => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const envConfig = validateConfig();

  cachedConfig = {
    port: envConfig.PORT,
    tigerbeetle: {
      address: envConfig.TIGERBEETLE_ADDRESSES,
      clusterId: BigInt(envConfig.TIGERBEETLE_CLUSTER_ID),
    },
    database: {
      host: envConfig.DB_HOST,
      port: envConfig.DB_PORT,
      name: envConfig.DB_NAME,
      user: envConfig.DB_USER,
      password: envConfig.DB_PASSWORD,
      poolSize: envConfig.DB_POOL_SIZE,
      idleTimeout: envConfig.DB_IDLE_TIMEOUT,
      connectionTimeout: envConfig.DB_CONNECTION_TIMEOUT,
    },
    cdc: {
      amqpUrl: envConfig.AMQP_URL,
      exchange: envConfig.CDC_EXCHANGE,
      queue: envConfig.CDC_QUEUE,
      routingKeys: envConfig.CDC_ROUTING_KEYS.split(','),
      autoAck: envConfig.CDC_AUTO_ACK,
    },
    env: envConfig.NODE_ENV,
    logLevel: envConfig.LOG_LEVEL,
  };

  return cachedConfig;
};

export const getTestConfig = (tigerbeetlePort?: number): Config => {
  // For test mode, use environment variables if available, otherwise fall back to defaults
  return {
    port: 0, // Random port for tests
    tigerbeetle: {
      address: process.env.TIGERBEETLE_ADDRESSES || tigerbeetlePort?.toString() || '6000',
      clusterId: BigInt(process.env.TIGERBEETLE_CLUSTER_ID || '0'),
    },
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      name: process.env.DB_NAME || 'banking_poc_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      poolSize: parseInt(process.env.DB_POOL_SIZE || '5'),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    },
    cdc: {
      amqpUrl: process.env.AMQP_URL || 'amqp://guest:guest@localhost:5672',
      exchange: process.env.CDC_EXCHANGE || 'test-banking-events',
      queue: process.env.CDC_QUEUE || 'test-banking-queue',
      routingKeys: (process.env.CDC_ROUTING_KEYS || '#').split(','),
      autoAck: process.env.CDC_AUTO_ACK === 'true',
    },
    env: process.env.NODE_ENV || 'test',
    logLevel: process.env.LOG_LEVEL || 'error',
  };
};
