# Claude Desktop 客户端配置写入逻辑

## 配置文件位置

### macOS
| 文件 | 路径 | 用途 |
|------|------|------|
| normal_config | `~/Library/Application Support/Claude/claude_desktop_config.json` | 官方配置 |
| threep_config | `~/Library/Application Support/Claude-3p/claude_desktop_config.json` | 第三方配置 |
| profile | `~/Library/Application Support/Claude-3p/configLibrary/00000000-0000-4000-8000-000000157210.json` | Gateway 配置 |
| meta | `~/Library/Application Support/Claude-3p/configLibrary/_meta.json` | 元数据 |

### Windows
| 文件 | 路径 | 用途 |
|------|------|------|
| normal_config | `%LOCALAPPDATA%/Claude/claude_desktop_config.json` | 官方配置 |
| threep_config | `%LOCALAPPDATA%/Claude-3p/claude_desktop_config.json` | 第三方配置 |
| profile | `%LOCALAPPDATA%/Claude-3p/configLibrary/00000000-0000-4000-8000-000000157210.json` | Gateway 配置 |
| meta | `%LOCALAPPDATA%/Claude-3p/configLibrary/_meta.json` | 元数据 |

## 配置文件结构

### normal_config / threep_config

```json
{
  "deploymentMode": "3p"
}
```

### profile（核心配置）

```json
{
  "inferenceProvider": "gateway",
  "inferenceGatewayBaseUrl": "http://127.0.0.1:8888/claude-desktop",
  "inferenceGatewayApiKey": "ccs-xxx",
  "inferenceGatewayAuthScheme": "bearer",
  "inferenceModels": [
    {
      "id": "claude-sonnet-4-6",
      "name": "Sonnet 4.6",
      "contextLength": 200000,
      "maxTokens": 64000
    }
  ]
}
```

### meta

```json
{
  "entries": [
    {
      "id": "00000000-0000-4000-8000-000000157210",
      "name": "CC Switch"
    }
  ],
  "appliedId": "00000000-0000-4000-8000-000000157210"
}
```

## 写入流程

核心入口：`apply_provider(provider)`

### OFFICIAL 模式

**触发条件**：供应商 ID 等于官方 ID

**写入操作**：
1. normal_config：写入 `{"deploymentMode": "1p"}`
2. threep_config：写入 `{"deploymentMode": "1p"}`，清除 gateway 字段
3. profile：**删除**该文件
4. meta：移除 CC Switch 条目，清空 `appliedId`

### 第三方模式（Direct 或 Proxy）

**写入操作**：
1. normal_config：写入 `{"deploymentMode": "3p"}`
2. threep_config：写入 `{"deploymentMode": "3p"}`
3. profile：写入完整的 gateway 配置
4. meta：添加 CC Switch 条目，设置 `appliedId`

## Direct 模式 vs Proxy 模式

### Direct 模式

Claude Desktop 直接连接上游网关（如 Anthropic 兼容端点）。

| 字段 | 来源 |
|------|------|
| `inferenceGatewayBaseUrl` | `provider.settings_config.env.ANTHROPIC_BASE_URL` |
| `inferenceGatewayApiKey` | `provider.settings_config.env.ANTHROPIC_AUTH_TOKEN` |

**限制**：
- 仅支持 Anthropic 原生 Messages API 格式
- 模型名必须是 `claude-*` 安全名称
- 不支持 GitHub Copilot / Codex OAuth 等需要本地代理的供应商

### Proxy 模式

Claude Desktop 连接到本地 CC Switch 代理。

| 字段 | 来源 |
|------|------|
| `inferenceGatewayBaseUrl` | `http://127.0.0.1:{port}/claude-desktop` |
| `inferenceGatewayApiKey` | 本地生成的 gateway token（`ccs-{uuid}`） |

**优势**：
- 支持任意模型名（如 `kimi-k2` 映射为 `claude-sonnet-4-6`）
- 支持 `openai_chat`、`openai_responses`、`gemini_native` 等多种 API 格式
- 支持 GitHub Copilot / Codex OAuth 供应商

## 回滚机制

`with_rollback` 在写操作前快照所有 4 个文件，写入失败时调用 `restore_snapshots` 恢复原状。

## Token 存储位置

| 模式 | 存储位置 | 格式 |
|------|----------|------|
| Direct | profile `inferenceGatewayApiKey` | 上游 API key |
| Proxy | 数据库 settings 表 | `ccs-{uuid}` 格式 |
