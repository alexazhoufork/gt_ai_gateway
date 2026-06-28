# OpenCode 客户端配置写入逻辑

## 配置文件位置

默认目录：`~/.config/opencode/`（可通过 `OPENCODE_CONFIG_DIR` 环境变量覆盖）

| 文件 | 路径 | 格式 | 用途 |
|------|------|------|------|
| opencode.json | `~/.config/opencode/opencode.json` | JSON5 | provider / mcp / plugin 配置 |
| .env | `~/.config/opencode/.env` | KEY=VALUE | 环境变量（OpenCode 自身管理） |

## 配置文件结构

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "<provider_id>": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://...",
        "apiKey": "sk-xxx"
      },
      "models": {
        "gpt-4": {
          "name": "GPT-4",
          "limit": {
            "context": 128000,
            "output": 4096
          }
        }
      }
    }
  },
  "mcp": {
    "<server_id>": {
      "type": "stdio",
      "command": "...",
      "args": ["..."]
    }
  },
  "plugin": [
    "oh-my-openagent"
  ]
}
```

## 写入流程

核心模型：**单文件、read-modify-write、additive（累加模式）**

所有写入最终汇聚到 `write_opencode_config()`，将完整 JSON 写入 `opencode.json`。

### 写入 Provider

**触发条件**：provider 的 `live_config_managed != false`

**写入流程**：
1. 读取现有 `opencode.json`
2. 在 `provider` 对象中设置/更新对应 ID 的条目
3. 写回 `opencode.json`

**数据结构**：
```json
{
  "npm": "@ai-sdk/openai-compatible",
  "options": {
    "baseURL": "https://...",
    "apiKey": "sk-xxx",
    "headers": { "Authorization": "Bearer ..." }
  },
  "models": { ... }
}
```

### 删除 Provider

**写入流程**：
1. 读取现有 `opencode.json`
2. 从 `provider` 对象中删除对应 ID 的条目
3. 写回 `opencode.json`

### MCP Server 同步

**触发条件**：`~/.config/opencode/` 目录存在

**新增/更新**：
1. 转换为 OpenCode 格式
2. 在 `mcp` 对象中设置/更新对应 ID 的条目
3. 写回 `opencode.json`

**删除**：
1. 从 `mcp` 对象中删除对应 ID 的条目
2. 写回 `opencode.json`

### Plugin 管理

**添加**：
1. 在 `plugin` 数组中添加插件名
2. 写回 `opencode.json`

**删除**：
1. 按前缀过滤 `plugin` 数组
2. 写回 `opencode.json`

**互斥规则**：
- `oh-my-openagent` / `oh-my-opencode`（standard）和 `oh-my-opencode-slim` 不能共存
- 添加 standard 类插件时，先清除 slim 类；反之亦然

## OFFICIAL 模式 vs GATEWAY/VENDOR 模式

OpenCode **不区分** OFFICIAL 和 GATEWAY/VENDOR 模式。

所有 provider 写入 `opencode.json` 的逻辑相同，区分点在上层调用者通过 `live_config_managed` 字段控制是否调用写入。

## Token 存储位置

API Key 存储在 `opencode.json` 文件内部，嵌套在 provider 配置中：

```json
{
  "provider": {
    "<id>": {
      "options": {
        "baseURL": "https://...",
        "apiKey": "sk-xxx"
      }
    }
  }
}
```

与其他客户端的对比：

| 客户端 | Token 存储位置 | 格式 |
|--------|---------------|------|
| OpenCode | `opencode.json` 内 `options.apiKey` | 明文 |
| Claude Code | `settings.json` 内 `env.ANTHROPIC_API_KEY` | 明文 |
| Codex | `auth.json` 或 `config.toml` | 明文 |
| Gemini | `.env` 文件 | KEY=VALUE |
