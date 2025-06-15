export const ACCOUNT_TYPES = {
  LOAN: 1,
  DEPOSIT: 2,
  CREDIT: 3,
  ASSET: 4,
  LIABILITY: 5,
  EQUITY: 6,
} as const;

export const LEDGER_CODES = {
  USD: 840,
  EUR: 978,
  GBP: 826,
  NOK: 578,
} as const;

import { Config } from './index.js';

export const getTigerBeetleConfig = (config: Config['tigerbeetle']) => ({
  cluster_id: config.clusterId,
  replica_addresses: [config.address],
});