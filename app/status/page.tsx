import { connection } from "next/server";
import { buildLabel } from "../../lib/status/build";
import { checkDatabase, type DatabaseResult } from "../../lib/status/database";
import { checkPaypal, type PaypalResult } from "../../lib/status/paypal";
import { readUsage, type UsageResult } from "../../lib/status/usage";
import { StatusView } from "./StatusView";
import "../../docs/design/design-system/tokens/colors.css";
import "../../docs/design/design-system/tokens/typography.css";
import "../../docs/design/design-system/tokens/spacing.css";
import "../../docs/design/design-system/tokens/motion.css";
import "../../docs/design/design-system/tokens/showcase.css";
import "../(shop)/shop.css";
import "./status.css";

export default async function StatusPage() {
  await connection();
  const [database, paypal, usage] = await Promise.all([checkDatabase(), checkPaypal(), readUsage()]);
  const build = buildLabel();

  console.log(`status ${databaseLog(database)} ${paypalLog(paypal)} ${usageLog(usage)} build=${build}`);

  return <StatusView database={database} paypal={paypal} usage={usage} build={build} />;
}

function databaseLog(result: DatabaseResult): string {
  if (result.state === "ok") return `db=ok check=${result.checkId}`;
  if (result.state === "not reachable") return `db=not-reachable reason=${result.reason}`;
  return "db=not-configured";
}

function paypalLog(result: PaypalResult): string {
  if (result.state === "not reachable") return `paypal=not-reachable reason=${result.reason}`;
  return `paypal=${result.state.replace(" ", "-")}`;
}

function usageLog(result: UsageResult): string {
  if (result.state === "not reachable") return `usage=not-reachable reason=${result.reason}`;
  return `usage=${result.state.replace(" ", "-")}`;
}
