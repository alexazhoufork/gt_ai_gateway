import { Context } from "hono";
import modelService from "../service/modelService";
import userService from "../service/userService";
import sender from "../service/senderService";
import { SgModel } from "../model/sgModel";
import { SgUser } from "../model/sgUser";
import { SgVendor } from "../model/sgVendor";
import { ApiFormat } from "../constants";

async function chatCompletions(c: Context) {
    let body: string = await c.req.text();
    console.log("body:", body);

    //获取用户
    const authHeader = c.req.header("Authorization");

    if (!authHeader) {
        return c.json({ error: "Authorization header is missing" }, 401);
    }

    // 检查 Authorization header 是否以 "Bearer " 开头
    if (!authHeader.startsWith("Bearer ")) {
        return c.json({ error: "Invalid token format" }, 401);
    }

    // 提取 token
    const token = authHeader.split(" ")[1];
    const user = await userService.getUserByToken(token!, c.env.ROOT_TOKEN);

    if (user == null) {
        return c.json({ error: "Invalid token (user not found)" }, 401);
    }

    //解析请求
    let bodyDict = JSON.parse(body);
    console.log("bodyDict:", bodyDict, typeof bodyDict);

    //获取后端模型配置
    let modelName = bodyDict.model;
    let modelConfig: SgModel | null = await modelService.getModel(modelName, true);
    console.log("modelConfig:", modelConfig);

    if (modelConfig == null) {
        return c.json({ error: "model not found" }, 401);
    }

    //获取 vendor 配置
    const vendor: SgVendor | null = await SgVendor.query().find(
        modelConfig!.vendor_id!,
    );
    console.log("vendor:", vendor);

    if (vendor == null) {
        return c.json({ error: "vendor not found" }, 401);
    }

    return sender.sendRequest(c, user!, modelConfig!, vendor!, ApiFormat.OPENAI, body);
}

async function anthropicMessages(c: Context) {
    let body: string = await c.req.text();
    console.log("body:", body);

    //获取用户
    const apiKey = c.req.header("x-api-key");
    let token = apiKey;

    if (!token) {
        // 退一步检查 Authorization header 是否以 "Bearer " 开头
        const authHeader = c.req.header("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
    }

    if (!token) {
        return c.json(
            { error: "x-api-key or Authorization header is missing" },
            401,
        );
    }

    const user = await userService.getUserByToken(token!, c.env.ROOT_TOKEN);

    if (user == null) {
        return c.json({ error: "Invalid token (user not found)" }, 401);
    }

    //解析请求
    let bodyDict = JSON.parse(body);
    console.log("bodyDict:", bodyDict, typeof bodyDict);

    //获取后端模型配置
    let modelName = bodyDict.model;
    let modelConfig: SgModel | null = await modelService.getModel(modelName, true);
    console.log("modelConfig:", modelConfig);

    if (modelConfig == null) {
        return c.json({ error: "model not found" }, 401);
    }

    //获取 vendor 配置
    const vendor: SgVendor | null = await SgVendor.query().find(
        modelConfig!.vendor_id!,
    );
    console.log("vendor:", vendor);

    if (vendor == null) {
        return c.json({ error: "vendor not found" }, 401);
    }

    return sender.sendRequest(c, user, modelConfig, vendor, ApiFormat.ANTHROPIC, body);
}

async function responsesApi(c: Context) {
    let body: string = await c.req.text();

    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
        return c.json({ error: "Authorization header is missing" }, 401);
    }
    if (!authHeader.startsWith("Bearer ")) {
        return c.json({ error: "Invalid token format" }, 401);
    }

    const token = authHeader.split(" ")[1];
    const user = await userService.getUserByToken(token!, c.env.ROOT_TOKEN);
    if (user == null) {
        return c.json({ error: "Invalid token (user not found)" }, 401);
    }

    let bodyDict = JSON.parse(body);
    const modelName = bodyDict.model;
    const modelConfig: SgModel | null = await modelService.getModel(modelName, true);
    if (modelConfig == null) {
        return c.json({ error: "model not found" }, 401);
    }

    const vendor: SgVendor | null = await SgVendor.query().find(modelConfig!.vendor_id!);
    if (vendor == null) {
        return c.json({ error: "vendor not found" }, 401);
    }

    return sender.sendRequest(c, user!, modelConfig!, vendor!, ApiFormat.RESPONSES, body);
}

export default {
    chatCompletions,
    anthropicMessages,
    responsesApi,
};
