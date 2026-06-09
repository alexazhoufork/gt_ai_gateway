import { Model } from "sutando";
import { inspect, InspectOptions } from "util";

class SgVendorModel extends Model {
    table = "vendor_model";

    id!: number;
    vendor_id!: number;
    model_id!: string;

    created_at!: Date;
    updated_at!: Date;

    [inspect.custom](depth: number, options: InspectOptions) {
        return JSON.stringify(this.toData(), null, 2);
    }
}

export { SgVendorModel };
