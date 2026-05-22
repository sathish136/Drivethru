import app from "./app";
import { startZkAdmsServer, startAdmsSweep } from "./zk-adms-server.js";

const port = Number(process.env["PORT"] || "8080");

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`[ZK ADMS] Routes active on port ${port} at /iclock (devices: set Server=<host> Port=${port})`);
  startAdmsSweep();
});

// Also try a dedicated port 8081 listener for devices pre-configured to that port
startZkAdmsServer(8081);
