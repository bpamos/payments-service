export interface AuthClaims {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface ChargeRequest {
  amountCents: number;
  currency: string;
  customerId: string;
}

export interface ChargeRecord extends ChargeRequest {
  id: string;
  status: "captured" | "pending";
  createdAt: string;
}
