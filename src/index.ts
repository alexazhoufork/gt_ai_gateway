import {Context, Hono, Next} from 'hono'
import ClientD1 from 'knex-cloudflare-d1';
import { sutando } from 'sutando';
import { setupRoutes } from './routes'


declare module 'hono' {
  interface ContextVariableMap {
  }
}

export interface Env {
  DB: D1Database;
}

const app = new Hono();

async function prepareDBConnection(c:Context, next:Next) {
  console.log("prepareDBConnection");
  sutando.addConnection({
    client: ClientD1,
    connection: {
      database: c.env.DB
    },
    useNullAsDefault: true,
  });

  await next();
}

app.use(prepareDBConnection);

setupRoutes(app, 'cloud');

export default app
