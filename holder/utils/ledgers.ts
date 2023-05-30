import { pool_transactions_bcovrin_test_genesis } from './txns';

export const ledgers = [
  {
    id: `bcovrin-test-net`,
    isProduction: false,
    indyNamespace: 'bcovrin:test',
    genesisTransactions: pool_transactions_bcovrin_test_genesis,
  },
];
