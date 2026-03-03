import { Context, MiddlewareHandler } from "hono";
import userService from "../service/userService";
import { UserType } from "../constants";

const requireAdmin: MiddlewareHandler = async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json({ error: "Authorization header is missing or invalid" }, 401);
    }

    const token = authHeader.split(" ")[1];
    const user = await userService.getUser(token);

    if (!user) {
        return c.json({ error: "Invalid token" }, 401);
    }

    if (user.type !== UserType.ADMIN) {
        return c.json({ error: "Admin access required" }, 403);
    }

    await next();
};

export default { requireAdmin };