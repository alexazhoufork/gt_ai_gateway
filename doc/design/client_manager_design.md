# 客户端管理模块 (Client Management) 设计方案

本方案旨在设计并在本地 AI 网关的左侧导航栏中加入「客户端管理」模块。由于网关运行在本地环境，可以通过 Node.js 直接操作本地文件系统，从而实现**一键自动配置本地 AI 工具（如 Claude Code, Cursor 等）**，让其无缝连接并使用网关代理的模型。

## User Review Required

> [!IMPORTANT]
> **本地文件读写权限设计**
> 因为自动配置需要后端 Node.js 直接读写用户目录下的敏感配置文件（如 `~/Library/Application Support/Cursor/User/settings.json` 等），这在方便的同时也带来了潜在风险。
> **方案建议：** 
> 1. 在执行任何修改之前，必须先对原配置文件进行备份（如追加 `.bak` 后缀）。
> 2. 后端接口需严格限制可访问的文件路径，仅允许修改预定义的几个客户端配置文件。
> 请确认此方案是否符合您的预期。

## Open Questions

> [!WARNING]
> **跨平台兼容性与工具支持**
> 1. 目前我们的主要操作系统环境是 macOS 吗？对于客户端配置文件路径（如 Cursor），不同操作系统（Mac/Windows/Linux）差异较大。初期是否只优先支持 macOS？
> 2. 部分客户端工具（如 Claude Code）也可以通过向 `~/.zshrc` 或 `~/.bashrc` 注入环境变量的方式配置。我们是倾向于修改客户端的特定配置文件，还是修改全局环境变量？
> 3. 您最希望能优先支持哪些客户端工具？（例如：Claude Code, Cursor, Cline, Windsurf 等）

---

## 页面与交互设计 (前端)

1. **左侧导航栏入口**
   - 在 `AppSidebar.vue` 中新增「客户端管理」菜单项（图标建议使用 `AppstoreAddOutlined` ），置于「接入配置」或「API 测试」附近。

2. **视图组件 (`/client-manager`)**
   - **全局设置区**: 让用户选择用于注入的「网关 API Key」（可选择现有 Token 或一键生成新 Token）和「默认模型」。
   - **客户端卡片列表区**:
     - 展示各个支持的客户端（如 Cursor, Claude Code）。
     - **状态检测**: 卡片上会实时显示该工具的安装状态（本地是否找到配置文件）以及配置状态（是否已连接至本地网关）。
     - **一键配置**: 点击按钮后，后端直接注入 `baseURL`、`apiKey` 等信息至该工具配置。
     - **恢复默认**: 支持从备份文件恢复工具原本的配置。
     - **手动指引**: 对于不支持直接改文件的工具，提供一键复制的 Bash 脚本或环境变量配置指引。

---

## 技术方案 (后端)

### 1. 路由与控制器 (Controller)
新增 `ClientConfigController`，提供以下 REST API 接口：
- `GET /api/client-config/status`: 扫描本地环境，**通过检测各客户端对应的配置文件是否在磁盘上存在（例如检测 `~/.claude.json` 或 `~/Library/Application Support/Cursor/User/settings.json`），来判断客户端是否安装过**，并返回检测状态（已安装/已配置/未安装）。
- `POST /api/client-config/apply`: 接收客户端名称、网关 URL、API Key 和 模型名，执行配置文件的读写和备份操作。
- `POST /api/client-config/restore`: 从备份恢复指定客户端的原始配置。

### 2. 核心服务 (Service) 与 Adapter 架构
新增 `ClientConfigService` 作为统一入口，针对底层不同的客户端，采用 **Adapter (适配器) 设计模式**：

#### 基础类 `BaseClientAdapter`
定义抽象基类，所有客户端配置逻辑均继承此类，要求实现以下核心方法：
- `checkIsInstalled(): boolean`: 检查对应的配置文件是否在磁盘上存在。
- `readConfig(): any`: 读取并解析本地配置文件内容。
- `writeConfig(config: any): void`: 备份原文件后，直接将新的配置写入文件。
- `restoreConfig(): void`: 从备份文件恢复原始配置。

#### 各个客户端的具体 Adapter 实现：
- **`CursorAdapter`** (继承自 `BaseClientAdapter`): 
  - 处理 macOS 下的 `~/Library/Application Support/Cursor/User/settings.json` 等路径的文件读写，注入或修改 `cursor.general.openaiBaseUrl` 等字段。
- **`ClaudeCodeAdapter`** (继承自 `BaseClientAdapter`):
  - 直接读取解析用户主目录下的 `~/.claude.json` 文件并在 JSON 结构中注入 API 配置后写回。
- **`ClineAdapter`** (继承自 `BaseClientAdapter`):
  - 处理 VSCode 插件存储目录下关于 Cline 的专门配置文件（如 `cline_mcp_settings.json` 或其全局配置文件），进行 JSON 的直接读写。

**设计原则重申**：所有客户端的配置都将**仅通过直接读写该客户端特有的配置文件实现**，绝对不通过执行 CLI 命令（如 `claude config`），也**绝对不通过修改全局环境变量（如 `.zshrc` 或 `.bashrc`）来实现**，确保配置的精准性和无副作用。

## Verification Plan

### Automated Tests
- 为 `ClientConfigService` 编写单元测试，使用模拟的文件系统（Mock FS）来验证：
  - JSON 配置文件的正确合并与写入。
  - 备份逻辑是否有效触发。
  - 各种异常情况（如文件不存在、权限不足）的处理逻辑。

### Manual Verification
1. 启动网关并在前端导航栏进入「客户端管理」。
2. 点击 Cursor 的「一键配置」按钮。
3. 打开本机的 Cursor 应用，检查其设置页面的 Base URL 和 API Key 是否已被正确更新为本地网关地址。
4. 点击「恢复默认」按钮，检查 Cursor 设置是否成功还原。
