import postgres from "postgres";
import config from "@/config/config";

const sql = postgres({
  host: config.pgHost,
  port: config.pgPort,
  user: config.pgUser,
  password: config.pgPassword,
});

export default sql;
