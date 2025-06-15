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
    env: 'test',
    logLevel: 'error', // Reduce noise in tests
  };
};