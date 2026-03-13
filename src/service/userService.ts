import { SgUser } from "../model/sgUser";
import { ROOT_USER_ID, UserType } from "../constants";

function isRootToken(token: string, rootToken?: string): boolean {
    if (!rootToken) {
        return false;
    }
    return token === rootToken;
}

async function getUser(token: string): Promise<SgUser | null> {
    console.log("getUser", token);
    if (token == null) return null;

    return await SgUser.query().where("token", token).first();
}

async function getUserByToken(token: string, rootToken?: string): Promise<SgUser | null> {
    if (isRootToken(token, rootToken)) {
        const user = new SgUser();
        user.id = ROOT_USER_ID;
        user.name = "Root";
        user.token = token;
        user.type = UserType.ROOT;
        return user;
    }

    return await getUser(token);
}

export default {
    getUser,
    isRootToken,
    getUserByToken,
};
