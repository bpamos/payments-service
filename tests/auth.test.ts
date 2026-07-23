import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../src/app";
import { config } from "../src/config";
import { requireAuth, type AuthedRequest } from "../src/middleware/auth";
import type { Response, NextFunction } from "express";

function sign(claims: object, opts?: jwt.SignOptions) {
  return jwt.sign(claims, config.jwtSecret, { algorithm: "HS256", expiresIn: "1h", ...opts });
}

describe("requireAuth middleware", () => {
  function invoke(authHeader?: string) {
    const req = { header: (name: string) => (name.toLowerCase() === "authorization" ? authHeader : undefined) } as AuthedRequest;
    const res = { statusCode: 200, body: null as unknown, status(c: number) { this.statusCode = c; return this; }, json(b: unknown) { this.body = b; return this; } };
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };
    requireAuth(req, res as unknown as Response, next);
    return { req, res, nextCalled };
  }

  it("accepts a valid HS256 bearer token", () => {
    const token = sign({ sub: "user-1", role: "payments" });
    const { req, nextCalled, res } = invoke(`Bearer ${token}`);
    expect(nextCalled).toBe(true);
    expect(req.auth?.sub).toBe("user-1");
    expect(res.statusCode).toBe(200);
  });

  it("rejects an expired token", () => {
    const token = sign({ sub: "user-1", role: "payments" }, { expiresIn: -10 });
    const { nextCalled, res } = invoke(`Bearer ${token}`);
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "invalid_token" });
  });

  it("rejects a malformed token", () => {
    const { nextCalled, res } = invoke("Bearer not.a.jwt");
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it("rejects a missing authorization header", () => {
    const { nextCalled, res } = invoke(undefined);
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "missing_bearer_token" });
  });

  it("rejects a wrong secret signature", () => {
    const token = jwt.sign({ sub: "user-1", role: "payments" }, "other-secret", { algorithm: "HS256" });
    const { nextCalled, res } = invoke(`Bearer ${token}`);
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});

describe("charge routes", () => {
  const app = createApp();
  const token = sign({ sub: "cashier", role: "payments" });

  it("GET /health is open", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("POST /charge requires auth", async () => {
    const res = await request(app).post("/charge").send({ amountCents: 100, currency: "USD", customerId: "c1" });
    expect(res.status).toBe(401);
  });

  it("POST /charge creates a charge with a valid token", async () => {
    const res = await request(app)
      .post("/charge")
      .set("Authorization", `Bearer ${token}`)
      .send({ amountCents: 2500, currency: "USD", customerId: "cust_9" });
    expect(res.status).toBe(201);
    expect(res.body.amountCents).toBe(2500);
    expect(res.body.status).toBe("captured");
  });

  it("GET /charge/:id returns the created charge", async () => {
    const created = await request(app)
      .post("/charge")
      .set("Authorization", `Bearer ${token}`)
      .send({ amountCents: 500, currency: "USD", customerId: "cust_2" });
    const res = await request(app)
      .get(`/charge/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it("GET /charge/:id returns 404 for unknown ids", async () => {
    const res = await request(app)
      .get("/charge/does-not-exist")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
