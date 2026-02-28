import { Hono } from 'hono'
import { sutando } from 'sutando'
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { serve } from '@hono/node-server'
import { setupRoutes } from './routes'

const DB_PATH = join(process.cwd(), 'local.db')

// 初始化数据库
function initDatabase() {
  const db = new Database(DB_PATH)

  // 创建表结构
  db.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      token TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vendor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      token TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS model (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      vendor_id INTEGER DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS record (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      model_id INTEGER,
      request_data TEXT,
      response_data TEXT,
      status TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS token_index ON user (token);
  `)

  db.close()
}

// 确保数据库初始化
initDatabase()

// 配置 Sutando 连接
sutando.addConnection({
  client: 'better-sqlite3',
  connection: {
    filename: DB_PATH,
  },
  useNullAsDefault: true,
})

const app = new Hono()

setupRoutes(app, 'local')

// 启动服务器
const port = parseInt(process.env.PORT || '3000', 10)
console.log(`Starting server on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
