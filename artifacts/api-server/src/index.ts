import app from "./app";
import { startZkAdmsServer } from "./zk-adms-server.js";

const port = Number(process.env["PORT"] || "8080");

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

startZkAdmsServer(8081);
