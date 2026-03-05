import { Model } from "sutando";
import { inspect, InspectOptions } from "util";
import { VendorType, ApiFormat } from "../constants";
import vendorDefaultUrls from "../service/vendorDefaultUrls";

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

        // If URL exists for the format, return it
        if (urls[format]) {
            return urls[format];
        }

        // Try to get default URL from config
        const defaultUrl = vendorDefaultUrls.getDefaultUrl(this.type, format);
        if (defaultUrl) {
            return defaultUrl;
        }

        throw new Error(`vendor does not have url for ${format} format`);
    }

    [inspect.custom](depth: number, options: InspectOptions) {
        return JSON.stringify(this.toData(), null, 2);
    }
}

export { SgVendor };
