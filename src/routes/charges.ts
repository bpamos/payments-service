import { Router } from "express";
import { randomUUID } from "crypto";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import type { ChargeRecord, ChargeRequest } from "../types";

const charges = new Map<string, ChargeRecord>();

export const chargesRouter = Router();

chargesRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "payments-service" });
});

chargesRouter.post("/charge", requireAuth, (req: AuthedRequest, res) => {
  const body = req.body as ChargeRequest;
  if (!body?.amountCents || !body.currency || !body.customerId) {
    res.status(400).json({ error: "invalid_charge" });
    return;
  }
  const record: ChargeRecord = {
    id: randomUUID(),
    amountCents: body.amountCents,
    currency: body.currency,
    customerId: body.customerId,
    status: "captured",
    createdAt: new Date().toISOString(),
  };
  charges.set(record.id, record);
  res.status(201).json(record);
});

chargesRouter.get("/charge/:id", requireAuth, (req: AuthedRequest, res) => {
  const record = charges.get(String(req.params.id));
  if (!record) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(record);
});
