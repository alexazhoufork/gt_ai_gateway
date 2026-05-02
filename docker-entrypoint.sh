#!/bin/sh

set -e

# 设置数据库文件路径 (与 Dockerfile 中一致)
DB_PATH=${DB_PATH:-/app/data/local.db}
echo "Using database at: $DB_PATH"

# 确保数据目录存在
mkdir -p $(dirname "$DB_PATH")

# 检查数据库文件是否存在，如果不存在则自动创建并执行初始化
if [ ! -f "$DB_PATH" ]; then
    echo "Database file not found. Initializing new database..."
    npm run db:init:node
else
    echo "Database file exists. Running migrations..."
    npm run db:migrate:node
fi

# 启动应用
echo "Starting application..."
exec npm run backend:start
