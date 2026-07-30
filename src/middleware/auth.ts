import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import type { AuthClaims } from "../types";

export interface AuthedRequest extends Request {
  auth?: AuthClaims;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "missing_bearer_token" });
    return;
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    // HS256 string-secret verify — behaviorally identical on jsonwebtoken 8.5.1 and 9.0.0.
    const claims = jwt.verify(token, config.jwtSecret) as AuthClaims;
    req.auth = claims;
    next();
  } catch {
    res.status(401).json({ error: "invalid_token" });
  }
}
