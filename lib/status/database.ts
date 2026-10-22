import { Client } from "pg";

export type DatabaseResult =
  | { state: "ok"; checkId: number; checkedAt: Date }
  | { state: "not configured" }
  | { state: "not reachable"; reason: string };

export async function checkDatabase(url = process.env.DATABASE_URL): Promise<DatabaseResult> {
  if (!url) return { state: "not configured" };

  let client: Client | undefined;
  try {
    client = new Client({
      connectionString: url,
      connectionTimeoutMillis: 5000,
      query_timeout: 5000,
    });
    await client.connect();
    const { rows } = await client.query<{ id: string; checked_at: Date }>(
      "INSERT INTO status_checks DEFAULT VALUES RETURNING id, checked_at",
    );
    return { state: "ok", checkId: Number(rows[0].id), checkedAt: rows[0].checked_at };
  } catch (error) {
    return { state: "not reachable", reason: reasonOf(error) };
  } finally {
    await client?.end().catch(() => {});
  }
}

export function reasonOf(error: unknown): string {
  if (error instanceof Error) return (error as Error & { code?: string }).code ?? error.message;
  return String(error);
}
