import { VendorType, ApiFormat } from "../constants";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface VendorDefaultUrls {
    [vendorType: string]: {
        [format: string]: string;
    };
}

let defaultUrlsCache: VendorDefaultUrls | null = null;

/**
 * 加载 vendor 默认 URL 配置
 */
function loadDefaultUrls(): VendorDefaultUrls {
    if (defaultUrlsCache !== null) {
        return defaultUrlsCache;
    }

    const configPath = join(process.cwd(), "resource", "vendor_default_urls.json");

    if (!existsSync(configPath)) {
        console.warn("Vendor default URLs config not found:", configPath);
        defaultUrlsCache = {};
        return defaultUrlsCache;
    }

    try {
        const configContent = readFileSync(configPath, "utf-8");
        defaultUrlsCache = JSON.parse(configContent);
        console.log("Vendor default URLs loaded successfully");
        return defaultUrlsCache;
    } catch (e) {
        console.error("Failed to load vendor default URLs:", e);
        defaultUrlsCache = {};
        return defaultUrlsCache;
    }
}

/**
 * 获取指定 vendor type 和 format 的默认 URL
 * @param vendorType - vendor 类型
 * @param format - API 格式
 * @returns 默认 URL，如果不存在则返回 null
 */
function getDefaultUrl(vendorType: VendorType, format: ApiFormat): string | null {
    const defaults = loadDefaultUrls();
    return defaults[vendorType]?.[format] || null;
}

export default {
    loadDefaultUrls,
    getDefaultUrl,
};