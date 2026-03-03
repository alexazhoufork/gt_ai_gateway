import { Model } from "sutando";
import { inspect, InspectOptions } from "util";
import { UserType } from "../constants";

class SgUser extends Model {
    table = "user";

    id!: number;
    name!: string;
    token!: string;
    type!: UserType;

    created_at!: Date;
    updated_at!: Date;

    [inspect.custom](depth: number, options: InspectOptions) {
        return JSON.stringify(this.toData(), null, 2);
    }
}

export { SgUser };
