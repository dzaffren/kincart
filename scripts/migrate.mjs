// Usage: node scripts/migrate.mjs up|down
// up runs every *.up.sql in order, so each must be safe to rerun.
// down runs only the highest-numbered *.down.sql.
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const migrations = new URL("../db/migrations/", import.meta.url);

export async function migrate(direction, url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is not set");
  const files = (await readdir(migrations)).filter((f) => f.endsWith(`.${direction}.sql`)).sort();
  const todo = direction === "up" ? files : files.slice(-1);

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (const file of todo) {
      await client.query(await readFile(new URL(file, migrations), "utf8"));
    }
  } finally {
    await client.end();
  }
  return todo;
}

if (import.meta.filename === process.argv[1]) {
  const direction = process.argv[2];
  if (direction !== "up" && direction !== "down") {
    console.error("usage: node scripts/migrate.mjs up|down");
    process.exit(1);
  }
  for (const file of await migrate(direction)) console.log(`${direction} ${file}`);
}
