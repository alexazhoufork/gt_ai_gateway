# 自动协议转换 (Automatic Protocol Conversion)

Serverless AI Gateway 的核心特性之一是**透明且自动的协议转换**。它允许你在不需要修改客户端代码的情况下，跨越不同供应商的 API 格式壁垒，使用同一种接口规范调用所有的 LLM（大语言模型）。

---

## 什么是自动协议转换？

目前市面上的大语言模型 API 规范主要分为两大学派：
1. **OpenAI 规范** (`/v1/chat/completions`)
2. **Anthropic 规范** (`/v1/messages`)

通常情况下，如果你在项目中同时使用了 GPT-4 和 Claude 3，你需要准备两套 SDK，编写两套完全不同的组装参数和解析响应（包括解析复杂的 SSE Stream 流）的代码。

**自动协议转换**意味着：网关在中间做了一层“翻译器”。你可以**全部使用 OpenAI 的规范（SDK）**来发送请求，即使用户请求的模型是 Claude 3（Anthropic 格式），网关也会自动将请求实时转换为 Anthropic 需要的格式，并把 Anthropic 的响应实时转换为 OpenAI 的格式返回给你。这一切对客户端完全透明。

---

## 什么时候会自动发生转换？

转换过程是**全自动、实时发生**的，基于你在请求时所使用的 **请求端点（Endpoint）** 和 **后台配置的供应商类型（Vendor Type）** 之间的差异触发。

### 触发条件矩阵：

| 客户端请求的端点 | 后台模型对应的供应商类型 | 网关的行为 | 结果 |
| :--- | :--- | :--- | :--- |
| `/llm/v1/chat/completions` (OpenAI 格式) | **OpenAI** 类型 | 透传 (Pass-through) | 不做转换，直接代理请求。 |
| `/llm/v1/chat/completions` (OpenAI 格式) | **Anthropic** 类型 | **触发转换** | 将请求转为 Anthropic 格式，响应转为 OpenAI 格式。 |
| `/llm/v1/messages` (Anthropic 格式) | **Anthropic** 类型 | 透传 (Pass-through) | 不做转换，直接代理请求。 |
| `/llm/v1/messages` (Anthropic 格式) | **OpenAI** 类型 | **触发转换** | 将请求转为 OpenAI 格式，响应转为 Anthropic 格式。 |

简单来说：**只要客户端使用的协议，与实际提供模型的供应商协议不一致，就会自动触发双向转换。**

---

## 如何使用？

使用自动协议转换**不需要任何额外的配置**，它是开箱即用（Out-of-the-box）的。

你只需要做到一点：**在客户端按照你选定的协议格式，传入正确的模型名称。**

### 示例场景：使用 OpenAI 官方 SDK 调用 Claude 3

假设你在网关后台配置了：
- **供应商**：类型为 `Anthropic`
- **模型**：名称为 `claude-3-opus-20240229`，绑定到上述供应商

你在客户端代码中，**完全可以使用 OpenAI 的官方 SDK**：

```python
import openai

client = openai.Client(
    base_url="https://<your-gateway-url>/llm/v1",
    api_key="<gateway-user-token>" # 在网关生成的普通用户 Token
)

response = client.chat.completions.create(
    model="claude-3-opus-20240229", # 直接填写后台配置的 Anthropic 模型名称
    messages=[
        {"role": "user", "content": "你好，请用一句话介绍你自己。"}
    ],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")
```

### 背后的魔法：
1. **客户端**发出了标准的 OpenAI `chat/completions` 请求。
2. **网关**接管请求，发现模型 `claude-3-opus-20240229` 属于 Anthropic 供应商。
3. **网关**将请求体的 `messages`、`model`、`stream` 等字段无缝映射为 Anthropic `/v1/messages` 接口规范，并附带真正的 Anthropic API Key 发送给上游。
4. **上游 (Anthropic)** 开始源源不断地返回 SSE 事件流（如 `message_start`, `content_block_delta` 等）。
5. **网关**实时拦截这些 Anthropic 事件，将它们翻译为标准的 OpenAI SSE `chunk`（如 `chunk.choices[0].delta.content`）。
6. **客户端**完美接收到流式输出，完全不知道背后实际调用的是 Anthropic。

---

## 支持转换的特性清单

在协议转换过程中，网关不仅转换了基础的文本，还对一些高级特性提供了深度适配：

- **基础对话结构**: `system` prompt 映射、`messages` 角色 (`user`/`assistant`) 的转换与合并。
- **参数映射**: `max_tokens`, `temperature`, `top_p` 等生成参数的对齐。
- **流式传输 (SSE Stream)**: 实时、低延迟的双向事件流解析与重组。
- **多模态 (Vision / Image)**: 支持将 OpenAI 格式的图片输入（Base64 / URL）转译为 Anthropic 支持的图像块格式，反之亦然。
- **工具调用 (Function Calling / Tool Use)**: 支持将 OpenAI 规范的 `tools` 和 `tool_choice` 转译为 Anthropic 的 `tools` 规范。能够正确解析模型返回的 `tool_calls`，并支持客户端将 `tool` 角色的结果回传。

## 注意事项

虽然网关尽最大努力保证协议转换的无缝兼容，但受限于两家 API 规范的底层设计差异，可能会有极少数边界情况的差异（例如某些特定供应商的实验性参数不兼容）。对于 99% 以上的标准对话、流式输出、图片识别和工具调用，自动转换都是完全稳定且可靠的。
