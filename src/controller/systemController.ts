import { Context } from "hono";
import ormService from "../service/ormService";
import { SgUser } from "../model/sgUser";
import { SgVendor } from "../model/sgVendor";
import { SgModel } from "../model/sgModel";
import { SgRecord } from "../model/sgRecord";

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
