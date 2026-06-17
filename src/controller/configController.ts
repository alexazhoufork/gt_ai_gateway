import { Context } from "hono";
import configService from "../service/configService";
import hostService from "../service/hostService";

async function getConfig(c: Context) {
    await hostService.getHostKey();
    return c.json(await configService.getAll());
}

async function updateConfig(c: Context) {
    const body = await c.req.json();
    return c.json(await configService.updateAll(body));
}

export default {
    getConfig,
    updateConfig,
};
