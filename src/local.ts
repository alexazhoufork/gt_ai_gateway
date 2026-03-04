import { join } from "path";
import { serve } from "@hono/node-server";
import ormService from "./service/ormService";
import app, { Env } from "./routes";

const DB_PATH = process.env.DB_PATH || join(process.cwd(), "local.db");

async function startServer() {
    // 初始化本地配置
    await ormService.init({
        mode: "local",
        dbPath: DB_PATH,
    });

    // 启动服务器
    const port = parseInt(process.env.PORT || "3000", 10);

    // 构建环境变量
    const bindings: Env = {
        DB: ormService.dbAdapter.db,
        ROOT_TOKEN: process.env.ROOT_TOKEN || "",
    };

    serve({
        fetch: (request) => app.fetch(request, bindings),
        port,
    });

    console.log(`Server listening on http://localhost:${port}`);
}

startServer().catch((err) => {
    console.error("Failed to start server:", err);
});
