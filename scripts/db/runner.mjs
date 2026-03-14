import { client, DB_NAME } from './client.mjs';
import collections from './collections/index.mjs';

async function createCollectionSafe(db, name, validator) {
  try {
    await db.createCollection(name, {
      validator,
      validationLevel: 'moderate', // existing docs skip validation
      validationAction: 'warn',    // log violations, do not reject writes
    });
    return 'created';
  } catch (err) {
    if (err.codeName === 'NamespaceExists' || err.code === 48) return 'exists';
    throw err;
  }
}

export async function deploy() {
  console.log('\n🔌  Connecting to MongoDB Atlas…');
  await client.connect();
  await client.db('admin').command({ ping: 1 });
  console.log('✅  Connected.\n');

  const db = client.db(DB_NAME);
  console.log(`📦  Database: ${DB_NAME}\n`);

  const results = [];

  for (const { name, validator, indexes } of collections) {
    const status = await createCollectionSafe(db, name, { $jsonSchema: validator.$jsonSchema });
    const col = db.collection(name);

    for (const { key, options } of indexes) {
      await col.createIndex(key, options);
    }

    results.push({ name, status, indexCount: indexes.length });
    const tag = status === 'created' ? '✚ created' : '○ exists ';
    console.log(`  ${tag}  ${name.padEnd(22)}  (${indexes.length} index${indexes.length !== 1 ? 'es' : ''})`);
  }

  const created     = results.filter(r => r.status === 'created').length;
  const skipped     = results.filter(r => r.status === 'exists').length;
  const totalIndexes = results.reduce((s, r) => s + r.indexCount, 0);

  console.log('\n─────────────────────────────────────────');
  console.log(`  ${created} collection(s) created, ${skipped} already existed`);
  console.log(`  ${totalIndexes} index(es) ensured (upserted)`);
  console.log('─────────────────────────────────────────\n');
  console.log('🎉  Schedula data model deployed successfully.\n');
}
