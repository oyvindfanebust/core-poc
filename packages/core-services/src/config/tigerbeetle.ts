export const ACCOUNT_TYPES = {
  LOAN: 1,
  DEPOSIT: 2,
  CREDIT: 3,
  ASSET: 4,
  LIABILITY: 5,
  EQUITY: 6,
} as const;

export const LEDGER_CODES = {
  EUR: 978, // Euro
  NOK: 578, // Norwegian Krone
  SEK: 752, // Swedish Krona
  DKK: 208, // Danish Krone
} as const;

import { Config } from './index.js';

export const getTigerBeetleConfig = (config: Config['tigerbeetle']) => ({
  cluster_id: config.clusterId,
  replica_addresses: [config.address],
});
