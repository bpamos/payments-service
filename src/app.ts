import express from "express";
import { chargesRouter } from "./routes/charges";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(chargesRouter);
  return app;
}
