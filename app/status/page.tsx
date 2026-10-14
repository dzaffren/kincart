import { connection } from "next/server";
import { buildLabel } from "../../lib/status/build";
import { checkDatabase, type DatabaseResult } from "../../lib/status/database";
import { checkPaypal, type PaypalResult } from "../../lib/status/paypal";
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
  const [database, paypal] = await Promise.all([checkDatabase(), checkPaypal()]);
  const build = buildLabel();

  console.log(`status ${databaseLog(database)} ${paypalLog(paypal)} build=${build}`);

  return <StatusView database={database} paypal={paypal} build={build} />;
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
