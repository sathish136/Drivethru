import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import { admsRouter } from "./zk-adms-server.js";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ZK ADMS push routes — served on main port so devices can reach it even when
// port 8081 is unavailable.  Configure ZKTeco device: Server=<host>, Port=8080
app.use("/iclock", admsRouter);

app.use("/api", router);

if (process.env["NODE_ENV"] === "production") {
  // In prod, serve the built attendance frontend from `artifacts/attendance/dist/public`
  // (built by `vite build`)
  const attendanceDist = path.resolve(process.cwd(), "artifacts/attendance/dist/public");
  app.use(express.static(attendanceDist));

  // SPA fallback (Wouter routes)
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(attendanceDist, "index.html"));
  });
} else {
  const frontendPort = Number(process.env["FRONTEND_PORT"] || "5000");
  app.use(
    "/",
    createProxyMiddleware({
      target: `http://localhost:${frontendPort}`,
      changeOrigin: true,
      ws: true,
    })
  );
}

export default app;
