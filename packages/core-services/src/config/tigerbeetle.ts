export const ACCOUNT_TYPES = {
  LOAN: 1,
  DEPOSIT: 2,
  CREDIT: 3,
  ASSET: 4,
  LIABILITY: 5,
  EQUITY: 6,
} as const;

export const LEDGER_CODES = {
  USD: 840, // US Dollar
  EUR: 978, // Euro
  GBP: 826, // British Pound Sterling
  NOK: 578, // Norwegian Krone
  SEK: 752, // Swedish Krona
  DKK: 208, // Danish Krone
  JPY: 392, // Japanese Yen
  CAD: 124, // Canadian Dollar
  AUD: 36, // Australian Dollar
  CHF: 756, // Swiss Franc
} as const;

import { Config } from './index.js';

export const getTigerBeetleConfig = (config: Config['tigerbeetle']) => ({
  cluster_id: config.clusterId,
  replica_addresses: [config.address],
});
