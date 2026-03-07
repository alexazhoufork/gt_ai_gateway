import { join } from "path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createMiddleware } from "hono/factory";
import ormService from "./service/ormService";
import app, { Env } from "./routes";
import initLogger, { Logger } from "./util/logger";

const DB_PATH = process.env.DB_PATH || join(process.cwd(), "local.db");

async function startServer() {
    // 保存原始 console 方法
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        debug: console.debug,
    };

    // 初始化日志系统（在重写 console 之前，使用原始 console）
    const logger: Logger = initLogger(process.cwd(), true);
    originalConsole.log("Starting server...");

    // 重写 console 方法以记录日志
    console.log = (...args: unknown[]) => {
        originalConsole.log(...args);
        const message = args.map((arg) => {
            if (typeof arg === "object") {
                return JSON.stringify(arg, null, 2);
            }
            return String(arg);
        }).join(" ");
        logger["write"]("info", message);
    };

    console.error = (...args: unknown[]) => {
        originalConsole.error(...args);
        const message = args.map((arg) => {
            if (typeof arg === "object") {
                return JSON.stringify(arg, null, 2);
            }
            return String(arg);
        }).join(" ");
        logger["write"]("error", message);
    };

    console.warn = (...args: unknown[]) => {
        originalConsole.warn(...args);
        const message = args.map((arg) => {
            if (typeof arg === "object") {
                return JSON.stringify(arg, null, 2);
            }
            return String(arg);
        }).join(" ");
        logger["write"]("warn", message);
    };

    console.debug = (...args: unknown[]) => {
        originalConsole.debug(...args);
        const message = args.map((arg) => {
            if (typeof arg === "object") {
                return JSON.stringify(arg, null, 2);
            }
            return String(arg);
        }).join(" ");
        logger["write"]("debug", message);
    };

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

    // Static file serving (frontend) - only for local development
    const distPath = join(process.cwd(), "frontend", "dist");
    app.use("/assets/*", serveStatic({ root: distPath }));
    app.use("/*.svg", serveStatic({ root: distPath }));

    // SPA fallback - return index.html for all non-API routes
    app.get("*", async (c) => {
        const url = new URL(c.req.url);

        // Skip API routes
        if (url.pathname.startsWith("/v1/") || url.pathname.includes(".json")) {
            return c.json({ error: "Not found" }, 404);
        }

        // Return index.html for SPA routing
        return serveStatic({ root: distPath, path: "/index.html" })(c);
    });

    serve({
        fetch: (request) => app.fetch(request, bindings),
        port,
    });

    console.log(`Server listening on http://localhost:${port}`);
}

startServer().catch((err) => {
    console.error("Failed to start server:", err);
});