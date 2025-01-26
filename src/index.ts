import {Context, Hono, Next} from 'hono'
import { chatCompletions } from './web/aiApiEntry'
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";


export interface Env {
  DB: D1Database;
}

const app = new Hono();

async function prepareDBConnection(c:Context, next:Next){
  console.log("prepareDBConnection");
}

//app.use(prepareDBConnection);

app.get('/', (c) => {
  return c.text('Hello, welcome to serverless ai gateway!')
})

app.get('/testORM.json', async (c) => {

  const adapter = new PrismaD1(c.env.DB);
  const prisma = new PrismaClient({ adapter });

  const users = await prisma.user.findMany();
  const result = JSON.stringify(users);
  return new Response(result);
})

app.post('/v1/chat/completions', chatCompletions);

export default app
