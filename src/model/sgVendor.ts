import { Model } from "sutando";
import { inspect, InspectOptions } from "util";
import { VendorType, ApiFormat } from "../constants";
import vendorDefaultUrls from "../service/vendorDefaultUrls";
import customError from "../util/customError";

class SgVendor extends Model {
    table = "vendor";

    id!: number;
    type!: VendorType;
    name!: string;
    token!: string;
    urls!: string;  // JSON string

    created_at!: Date;
    updated_at!: Date;

    /**
     * Parse URLs JSON string to object
     */
    getUrls(): Record<string, string> {
        try {
            return this.urls ? JSON.parse(this.urls) : {};
        } catch {
            return {};
        }
    }

    /**
     * Get URL by API format with default value handling
     * @param format - API format (openai, anthropic, google, etc.)
     * @returns URL string for the specified format
     * @throws Error if URL cannot be found or determined
     */
    getUrlByFormat(format: ApiFormat): string {
        const urls = this.getUrls();

        // If URL exists for the format, use it
        let url = urls[format];

        if (!url) {
            // Responses API falls back to the openai base URL
            if (format === ApiFormat.RESPONSES) {
                url = urls[ApiFormat.OPENAI] ?? vendorDefaultUrls.getDefaultUrl(this.type, ApiFormat.OPENAI);
            } else {
                url = vendorDefaultUrls.getDefaultUrl(this.type, format);
            }
        }

        if (!url) {
            throw new customError.AppError(`vendor does not have url for ${format} format`, 400);
        }

        // Normalize URL - Add missing paths if not present
        if (format === ApiFormat.ANTHROPIC && !url.includes("/v1/messages")) {
            url = url.replace(/\/$/, "") + "/v1/messages";
        }
        
        if (format === ApiFormat.OPENAI && !url.includes("/chat/completions")) {
            url = url.replace(/\/$/, "") + "/chat/completions";
        }

        if (format === ApiFormat.RESPONSES && !url.includes("/responses")) {
            url = url.replace(/\/$/, "") + "/responses";
        }

        return url;
    }

    [inspect.custom](depth: number, options: InspectOptions) {
        return JSON.stringify(this.toData(), null, 2);
    }
}

export { SgVendor };
