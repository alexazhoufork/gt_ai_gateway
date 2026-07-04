import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import requestHelper from "./requestHelper";
import config from "../config";

const STREAM_LOG_DIR = join(process.cwd(), "log", "stream");
const RESOURCE_DIR = join(process.cwd(), "tests", "resource", "stream_logs");


/**
 * Enable stream log writing by setting the DB config via the config API.
 * dbHelper.truncate() wipes the config table and clears the server cache, so
 * this must be called after truncate in test setup when the test class needs
 * stream logs to be written. The server-side configService cache is updated by
 * the API handler, so no extra cache-clear is needed. Only effective in node
 * mode (the config value is ignored in worker mode).
 */
async function enableStreamLog(adminToken: string): Promise<void> {
    await requestHelper.put(
        "/config.json",
        { stream_log_enabled: "true" },
        adminToken,
    );
}

async function waitForStreamLog(recordId: number): Promise<string> {
    const logPath = join(STREAM_LOG_DIR, `${recordId}.log`);

    for (let i = 0; i < 20; i++) {
        if (existsSync(logPath)) {
            return logPath;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Stream log not found for record ${recordId}: ${logPath}`);
}


async function waitForRequestLog(recordId: number): Promise<string> {
    const logPath = join(STREAM_LOG_DIR, `${recordId}.after_convert_req.log`);

    for (let i = 0; i < 20; i++) {
        if (existsSync(logPath)) {
            return logPath;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Request log not found for record ${recordId}: ${logPath}`);
}

async function moveStreamLogToResource(
    recordId: number,
    targetFileName: string,
): Promise<{ targetPath: string; content: string }> {
    const sourcePath = await waitForStreamLog(recordId);
    const sourceContent = readFileSync(sourcePath, "utf-8");

    if (!existsSync(RESOURCE_DIR)) {
        mkdirSync(RESOURCE_DIR, { recursive: true });
    }

    const targetPath = join(RESOURCE_DIR, targetFileName);
    if (existsSync(targetPath)) {
        rmSync(targetPath);
    }

    const normalizedContent = normalizeStreamLog(sourceContent, targetFileName);
    writeFileSync(targetPath, normalizedContent, "utf-8");
    rmSync(sourcePath);

    return {
        targetPath,
        content: normalizedContent,
    };
}


async function readStreamLog(recordId: number): Promise<string> {
    const sourcePath = await waitForStreamLog(recordId);
    return readFileSync(sourcePath, "utf-8");
}


async function readRequestLog(recordId: number): Promise<string> {
    const sourcePath = await waitForRequestLog(recordId);
    return readFileSync(sourcePath, "utf-8");
}


function normalizeStreamLog(content: string, targetFileName: string): string {
    if (targetFileName.includes("openai")) {
        const parts = content.split("data: [DONE]");
        const lastPart = parts[parts.length - 2] ?? parts[0] ?? "";
        return `${lastPart.trim()}\n\ndata: [DONE]\n`;
    }

    if (targetFileName.includes("anthropic")) {
        const marker = "event: message_start";
        const parts = content.split(marker).filter(Boolean);
        const lastPart = parts[parts.length - 1] ?? "";
        return `${marker}\n${lastPart.trim()}\n`;
    }

    return content;
}

export default {
    enableStreamLog,
    moveStreamLogToResource,
    readRequestLog,
    readStreamLog,
};
