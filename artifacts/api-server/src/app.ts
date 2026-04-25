import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import { createProxyMiddleware } from "http-proxy-middleware";

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", router);

const frontendPort = Number(process.env["FRONTEND_PORT"] || "5000");
app.use(
  "/",
  createProxyMiddleware({
    target: `http://localhost:${frontendPort}`,
    changeOrigin: true,
    ws: true,
  })
);

export default app;
