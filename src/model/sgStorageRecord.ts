import { Model } from "sutando";
import { inspect, InspectOptions } from "util";

class SgStorageRecord extends Model {
    table = "storage_record";
    primaryKey = "object_key";

    object_key!: string;
    size_bytes!: number;
    data!: Uint8Array;

    created_at!: Date;
    updated_at!: Date;

    [inspect.custom](depth: number, options: InspectOptions) {
        return JSON.stringify(this.toData(), null, 2);
    }
}

export { SgStorageRecord };
