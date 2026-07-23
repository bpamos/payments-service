export const config = {
  port: Number(process.env.PORT ?? 3001),
  jwtSecret: process.env.JWT_SECRET ?? "payments-dev-secret-change-me-32chars",
  serviceName: "payments-service",
};
