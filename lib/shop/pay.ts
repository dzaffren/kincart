import { charge } from "./paypal";
import { getVault, record, stuck, type PurchaseRequest } from "./requests";

export type PayResult = "paid" | "refused" | "unknown";

export async function pay(request: PurchaseRequest): Promise<PayResult> {
  const vaultId = await getVault();
  const result = vaultId
    ? await charge(vaultId, request.item, `purchase-${request.id}-${request.askedAt.getTime()}`)
    : ({ state: "refused", reason: "not linked" } as const);

  const line = `purchase id=${request.id} item=${request.item.id}`;
  if (result.state === "paid") console.log(`${line} status=paid capture=${result.captureId}`);
  else console.log(`${line} status=${result.state === "refused" ? "failed" : "unknown"} reason=${result.reason}`);

  if (result.state === "unknown") return "unknown";
  // Two overlapping settles can both get PayPal's answer; only the one that records it reports it.
  return (await record(request.id, result)) ? result.state : "unknown";
}

export async function settleStuck(): Promise<{ request: PurchaseRequest; result: PayResult } | null> {
  const request = await stuck();
  return request ? { request, result: await pay(request) } : null;
}
