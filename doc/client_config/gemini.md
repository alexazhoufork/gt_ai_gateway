# Gemini 客户端配置写入逻辑

## 配置文件位置

默认目录：`~/.gemini/`（可通过 `GEMINI_OVERRIDE_DIR` 设置自定义路径）

| 文件 | 路径 | 格式 | 用途 |
|------|------|------|------|
| .env | `~/.gemini/.env` | KEY=VALUE | 环境变量（API Key、模型、Base URL 等） |
| settings.json | `~/.gemini/settings.json` | JSON | 客户端配置（认证类型等） |
| oauth_creds.json | `~/.gemini/oauth_creds.json` | JSON | OAuth 凭据（由 Gemini CLI 管理） |

## 配置文件结构

### .env

```env
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-pro
GOOGLE_GEMINI_BASE_URL=https://...
```

### settings.json

```json
{
  "security": {
    "auth": {
      "selectedType": "gemini-api-key"
    }
  },
  "mcpServers": {
    "...": "..."
  }
}
```

`selectedType` 可选值：
- `gemini-api-key`：使用 API Key 认证
- `oauth-personal`：使用 OAuth 认证（官方模式）

## 写入流程

核心入口：`write_gemini_live(provider)`

### 步骤一：检测认证类型

```
GeminiAuthType::GoogleOfficial  -- 官方 Google 供应商
GeminiAuthType::Packycode       -- Packycode 供应商
GeminiAuthType::Generic         -- 通用第三方供应商
```

**检测规则**：
1. `partner_promotion_key == "google-official"` → GoogleOfficial
2. 供应商名称等于 `"google"` 或以 `"google "` 开头 → GoogleOfficial
3. `partner_promotion_key == "packycode"` → Packycode
4. 名称/URL/`GOOGLE_GEMINI_BASE_URL` 包含 `"packycode"`、`"packyapi"` 或 `"packy"` → Packycode
5. 其他 → Generic

### 步骤二：提取环境变量

从 `provider.settings_config` JSON 中的 `env` 字段提取键值对。

### 步骤三：处理 settings.json

- 如果 `provider.settings_config` 有 `config` 字段且为对象：与现有 `settings.json` **合并**（保留 `mcpServers` 等其他字段）
- 如果 `config` 为 null 或不存在：**不修改**已有的 `settings.json`

### 步骤四：写入 .env

| 认证类型 | 写入内容 | 验证要求 |
|----------|----------|----------|
| GoogleOfficial | 直接写入 env_map | 无 |
| Packycode | env_map | **必须**包含 `GEMINI_API_KEY` |
| Generic | env_map | **必须**包含 `GEMINI_API_KEY` |

### 步骤五：设置认证模式标记

| 认证类型 | settings.json 写入 |
|----------|-------------------|
| GoogleOfficial | `security.auth.selectedType = "oauth-personal"` |
| Packycode | `security.auth.selectedType = "gemini-api-key"` |
| Generic | `security.auth.selectedType = "gemini-api-key"` |

## OFFICIAL 模式 vs GATEWAY/VENDOR 模式

### GoogleOfficial（官方模式）

| 操作 | 内容 |
|------|------|
| .env | 不包含 `GEMINI_API_KEY`，直接写入用户提供的环境变量 |
| settings.json | `selectedType = "oauth-personal"` |
| 认证方式 | OAuth（通过 `oauth_creds.json`） |

### Packycode / Generic（第三方模式）

| 操作 | 内容 |
|------|------|
| .env | **必须**包含 `GEMINI_API_KEY` |
| settings.json | `selectedType = "gemini-api-key"` |
| 认证方式 | API Key |

## 安全特性

- `.env` 文件权限设为 `0o600`（仅所有者可读写）
- 目录权限设为 `0o700`（仅所有者可访问）
- `update_selected_type()` 采用合并策略，仅修改 `selectedType`，不破坏 `mcpServers` 等其他配置

## Token 存储位置

| 模式 | 存储位置 | 格式 |
|------|----------|------|
| GoogleOfficial | OAuth 凭据（由 Gemini CLI 管理） | OAuth tokens |
| Packycode / Generic | `.env` 文件 `GEMINI_API_KEY` | 明文 API Key |
