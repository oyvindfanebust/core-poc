#!/usr/bin/env node

const { createClient } = require('tigerbeetle-node');

async function waitForTigerBeetle() {
  const maxRetries = 30;
  const delayMs = 2000;

  for (let i = 0; i < maxRetries; i++) {
    let client = null;
    try {
      console.log(`Attempt ${i + 1}/${maxRetries}: Checking TigerBeetle...`);

      client = createClient({
        cluster_id: 0n,
        replica_addresses: ['127.0.0.1:6000'],
      });

      // Try to lookup a non-existent account - this will succeed if TB is ready
      await client.lookupAccounts([1n]);

      console.log('TigerBeetle is ready!');
      client.destroy();
      process.exit(0);
    } catch (error) {
      console.log(`TigerBeetle not ready yet: ${error.message}`);
      if (client) {
        try {
          client.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.error(`TigerBeetle failed to start after ${maxRetries} attempts`);
  process.exit(1);
}

waitForTigerBeetle();
