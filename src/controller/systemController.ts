import { Context } from "hono";
import ormService from "../service/ormService";
import { SgUser } from "../model/sgUser";
import { SgVendor } from "../model/sgVendor";
import { SgModel } from "../model/sgModel";
import { SgRecord } from "../model/sgRecord";

// 服务器启动时间
const START_TIME = new Date();

function formatUptime(startTime: Date): string {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}天 ${hours % 24}小时`;
    } else if (hours > 0) {
        return `${hours}小时 ${minutes % 60}分钟`;
    } else if (minutes > 0) {
        return `${minutes}分钟`;
    } else {
        return `${seconds}秒`;
    }
}

function welcome(c: Context) {
    const message =
        ormService.mode === "cloud"
            ? "Hello, welcome to serverless ai gateway!"
            : "Hello, welcome to serverless ai gateway (local mode)!";
    return c.text(message);
}

async function status(c: Context) {
    try {
        const userCount = await SgUser.query().count();
        const vendorCount = await SgVendor.query().count();
        const modelCount = await SgModel.query().count();
        const recordCount = await SgRecord.query().count();

        return c.json({
            status: "ok",
            mode: ormService.mode,
            statistics: {
                users: userCount,
                vendors: vendorCount,
                models: modelCount,
                records: recordCount,
            },
            system: {
                environment: ormService.mode === "cloud" ? "Cloudflare Workers" : "Local",
                version: process.env.npm_package_version || "1.0.0",
                startTime: START_TIME.toISOString(),
                uptime: formatUptime(START_TIME),
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return c.json(
            {
                status: "error",
                message: "Failed to get system status",
                error: String(error),
            },
            500,
        );
    }
}

export default {
    welcome,
    status,
};
