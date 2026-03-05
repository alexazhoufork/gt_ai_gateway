import { VendorType, ApiFormat } from "../constants";

interface VendorDefaultUrls {
    [vendorType: string]: {
        [format: string]: string;
    };
}

// Embedded default URLs for vendor types
const DEFAULT_URLS: VendorDefaultUrls = {
    aliyun: {
        openai: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    },
    deepseek: {
        openai: "https://api.deepseek.com/v1/chat/completions",
    },
};

/**
 * Get default URL for a given vendor type and format
 * @param vendorType - vendor type
 * @param format - API format
 * @returns default URL, or null if not found
 */
function getDefaultUrl(vendorType: VendorType, format: ApiFormat): string | null {
    return DEFAULT_URLS[vendorType]?.[format] || null;
}

/**
 * Initialize the service (no-op for embedded approach)
 */
function loadDefaultUrls(): void {
    console.log("Vendor default URLs service initialized");
}

export default {
    loadDefaultUrls,
    getDefaultUrl,
};