import {User} from "../model/user";


async function getUser(token:string):Promise<User | null> {

    if(token != null){
        let user:User = new User();
        user.name = "default";
        user.token = token;

        return user;
    }

    return null;
}

export default {
    getUser
}
