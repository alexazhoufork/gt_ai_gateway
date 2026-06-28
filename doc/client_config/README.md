# 客户端配置写入逻辑总览

本文档汇总各 AI 客户端的配置写入逻辑，基于 [cc-switch](https://github.com/farion1231/cc-switch) 项目的实现。

## 各客户端文档

| 客户端 | 文档 | 配置目录 |
|--------|------|----------|
| Codex | [codex.md](codex.md) | `~/.codex/` |
| Claude Desktop | [claude_desktop.md](claude_desktop.md) | `~/Library/Application Support/Claude/` |
| OpenCode | [opencode.md](opencode.md) | `~/.config/opencode/` |
| Gemini | [gemini.md](gemini.md) | `~/.gemini/` |

## 配置文件数量对比

| 客户端 | 文件数 | 主配置文件 | Token 存储位置 |
|--------|--------|-----------|---------------|
| Codex | 2 | config.toml | auth.json (`OPENAI_API_KEY`) 或 config.toml (`experimental_bearer_token`) |
| Claude Desktop | 4 | profile (JSON) | profile (`inferenceGatewayApiKey`) |
| OpenCode | 1 | opencode.json | opencode.json (`options.apiKey`) |
| Gemini | 2 | .env | .env (`GEMINI_API_KEY`) |

## 写入模式对比

| 客户端 | 写入模式 | 原子性 |
|--------|----------|--------|
| Codex | 双文件（auth.json + config.toml） | 支持回滚 |
| Claude Desktop | 四文件快照 | 支持回滚 |
| OpenCode | 单文件 read-modify-write | 无 |
| Gemini | 双文件（.env + settings.json） | .env 原子写入 |

## OFFICIAL vs GATEWAY/VENDOR 模式对比

### Codex

| 模式 | auth.json | config.toml |
|------|-----------|-------------|
| OFFICIAL | 写入 OAuth tokens 或 API key | `model_provider = "openai"` |
| GATEWAY/VENDOR（默认） | 写入 `{"OPENAI_API_KEY": "sk-xxx"}` | 写入自定义 provider |
| GATEWAY/VENDOR（保留官方） | 不修改 | 写入自定义 provider + `experimental_bearer_token` |

### Claude Desktop

| 模式 | normal_config | threep_config | profile | meta |
|------|---------------|---------------|---------|------|
| OFFICIAL | `1p` | `1p` | 删除 | 清除 CC Switch 条目 |
| 第三方 | `3p` | `3p` | 写入 gateway 配置 | 添加 CC Switch 条目 |

### OpenCode

无 OFFICIAL/VENDOR 区分，所有 provider 同等对待。

### Gemini

| 模式 | .env | settings.json | 认证方式 |
|------|------|---------------|----------|
| GoogleOfficial | 无 `GEMINI_API_KEY` | `selectedType = "oauth-personal"` | OAuth |
| Generic/Packycode | **必须**包含 `GEMINI_API_KEY` | `selectedType = "gemini-api-key"` | API Key |

## Token 格式对比

| 客户端 | OFFICIAL 模式 | GATEWAY/VENDOR 模式 |
|--------|--------------|---------------------|
| Codex | `tokens.access_token` (auth.json) | `OPENAI_API_KEY` (auth.json) |
| Claude Desktop | N/A | `inferenceGatewayApiKey` (profile) |
| OpenCode | N/A | `options.apiKey` (opencode.json) |
| Gemini | OAuth tokens (.env 无 key) | `GEMINI_API_KEY` (.env) |

## 关键差异

1. **Codex 的 token 存储位置最复杂**：auth.json 和 config.toml 都可能存储 token，具体取决于模式和配置
2. **Claude Desktop 的文件最多**：需要同时管理 4 个文件，但每个文件职责清晰
3. **OpenCode 最简单**：单文件 read-modify-write，无需管理多个文件
4. **Gemini 的认证方式最特殊**：官方模式使用 OAuth，第三方模式使用 API Key，通过 settings.json 的 `selectedType` 区分
