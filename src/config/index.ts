import { validateConfig, Config as EnvConfig } from './validation.js';

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
    enabled: boolean;
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
      enabled: envConfig.CDC_ENABLED,
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
  return {
    port: 0, // Random port for tests
    tigerbeetle: {
      address: tigerbeetlePort ? `${tigerbeetlePort}` : '3000',
      clusterId: 0n,
    },
    database: {
      host: 'localhost',
      port: 5432,
      name: 'banking_poc_test',
      user: 'postgres',
      password: 'postgres',
      poolSize: 5,
      idleTimeout: 30000,
      connectionTimeout: 2000,
    },
    cdc: {
      enabled: false, // Disable CDC in tests by default
      amqpUrl: 'amqp://guest:guest@localhost:5672',
      exchange: 'test-banking-events',
      queue: 'test-banking-queue',
      routingKeys: ['#'],
      autoAck: true,
    },
    env: 'test',
    logLevel: 'error', // Reduce noise in tests
  };
};