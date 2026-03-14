/**
 * scripts/setup-db.mjs
 *
 * Entry point — deploy the Schedula data model to MongoDB Atlas.
 * Run via: pnpm db:setup   (or: node --env-file=.env scripts/setup-db.mjs)
 */

import { client } from './db/client.mjs';
import { deploy }  from './db/runner.mjs';

deploy()
  .catch(err => {
    console.error('\n❌  Setup failed:', err.message, '\n');
    process.exit(1);
  })
  .finally(() => client.close());
