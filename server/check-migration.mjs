import pg from "pg";

const client = new pg.Client();
await client.connect();

const result = await client.query(`
  SELECT migration_name, started_at, finished_at, rolled_back_at, logs
  FROM "_prisma_migrations"
  WHERE migration_name = '20260918100000_linkedin_social_id'
`);

console.dir(result.rows, { depth: null });

await client.end();
