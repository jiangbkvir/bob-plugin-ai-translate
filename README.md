# AI 翻译

[![Bob 社区版 0.10.3](https://img.shields.io/badge/Bob-%E7%A4%BE%E5%8C%BA%E7%89%88%200.10.3-4B8BBE)](https://bobtranslate.com)
[![minBobVersion](https://img.shields.io/badge/minBobVersion-0.5.0-2EA043)](https://bobtranslate.com/plugin)
[![GitHub release](https://img.shields.io/github/v/release/jiangbkvir/bob-plugin-ai-translate)](https://github.com/jiangbkvir/bob-plugin-ai-translate/releases)

一个可自定义 AI 接口的 Bob 文本翻译插件。填写 Base URL、API 密钥、模型和 Skill 文档后，即可按服务端真实接口规范调用大模型完成翻译。

插件支持以下四种原生 API 格式，不同选项的请求地址、请求头和请求/响应结构均不同：

- OpenAI Chat Completions
- OpenAI Responses
- Anthropic Messages
- Gemini generateContent

插件采用非流式请求，适用于任意兼容上述协议的服务，包括 OpenAI、Anthropic、Google Gemini、Magpie、自建网关及其他兼容服务。

## 下载与安装

1. 前往 [Releases](https://github.com/jiangbkvir/bob-plugin-ai-translate/releases/latest) 下载最新版 `bob-plugin-ai-translate.bobplugin`。
2. 双击安装包，按 Bob 提示安装。
3. 在 Bob 的插件设置中选择「AI 翻译」。
4. 选择 API 类型，填写 Base URL、API 密钥和模型。
5. 可选：在「Skill 文档」中填写术语表、文风或格式要求。

如果安装过旧版插件，建议先在 Bob 中移除旧插件，再安装新版本。

也可以直接下载仓库内的安装包：

```text
https://github.com/jiangbkvir/bob-plugin-ai-translate/raw/main/dist/bob-plugin-ai-translate.bobplugin
```

## Bob 版本兼容性

| Bob 版本 | 支持情况 |
| --- | --- |
| Bob 社区版 `0.10.3` | 支持。可安装、配置并正常翻译 |
| Bob `1.8.0` 及以上 | 支持多行 Skill 输入框 |
| Bob `0.5.0` 至 `1.7.x` | 支持基础翻译；Skill 显示为单行文本输入框 |

插件最低支持 Bob `0.5.0`。Bob 社区版 `0.10.3` 不支持 `textConfig` 多行输入框，因此「Skill 文档」会显示为单行输入框；默认提示词仍会完整填入、可编辑，并完整参与翻译，不影响功能。

## 配置项

| 配置 | 说明 |
| --- | --- |
| API 类型 | 必须与服务端真实协议一致，不能只按 URL 猜测 |
| Base URL | 服务根地址或完整请求地址，支持带查询参数 |
| API 密钥 | 可留空；留空时不发送任何鉴权请求头 |
| 模型 | 服务端支持的模型 ID |
| Skill 文档 | 完整翻译提示词，内置规则默认填入并可直接编辑 |

### Skill 文档

「Skill 文档」就是实际发送给模型的翻译提示词，不是单独的 JSON 或附件配置。内置翻译规则已作为默认值填入，可以直接修改或追加：

- 术语表
- 文风要求
- 输出格式
- 专有名词处理规则
- 特定领域的翻译约束

支持以下占位符，翻译时会替换为 Bob 当前请求的语言：

```text
{{source_language}}
{{target_language}}
```

如果删除两个占位符，插件会自动在提示词前补充翻译方向；如果清空整个字段，则回退到内置默认规则。

默认规则会要求模型只输出译文，并尽量保留换行、Markdown、代码块、链接、占位符和专有格式。源文本中的指令会被当作待翻译内容，而不是可执行指令。

## 四种 API 配置

### OpenAI Chat Completions

- 请求：`POST {Base URL}/v1/chat/completions`
- 鉴权：`Authorization: Bearer {API 密钥}`
- Base URL 示例：`https://api.openai.com` 或 `https://api.openai.com/v1`
- 也可直接填写以 `/chat/completions` 结尾的完整地址
- 请求体使用 `messages`
- 解析 `choices[0].message.content`，兼容字符串和内容数组

### OpenAI Responses

- 请求：`POST {Base URL}/v1/responses`
- 鉴权：`Authorization: Bearer {API 密钥}`
- Base URL 示例：`https://api.openai.com` 或 `https://api.openai.com/v1`
- 也可直接填写以 `/responses` 结尾的完整地址
- 请求体使用 `instructions` 和 `input`
- 优先解析 `output_text`，并兼容 `output[].content[]` 中的 `output_text`

### Anthropic Messages

- 请求：`POST {Base URL}/v1/messages`
- 鉴权：`x-api-key: {API 密钥}`
- 固定请求头：`anthropic-version: 2023-06-01`
- Base URL 示例：`https://api.anthropic.com` 或 `https://api.anthropic.com/v1`
- 也可直接填写以 `/messages` 结尾的完整地址
- 请求体使用顶层 `system` 和 `messages`
- 解析 `content[]` 中 `type == "text"` 的内容，忽略 thinking

### Gemini generateContent

- 请求：`POST {Base URL}/v1beta/models/{模型}:generateContent`
- 鉴权：`x-goog-api-key: {API 密钥}`
- Base URL 示例：`https://generativelanguage.googleapis.com`
- 也可填写 `https://generativelanguage.googleapis.com/v1beta`
- 模型中的 `/` 会保留为路径分隔符，例如 `group/never-stuck`
- 请求体使用 `systemInstruction`、`contents` 和 `generationConfig`
- 解析 `candidates[0].content.parts[]`，并忽略 thought 内容

## Magpie 示例

假设 Magpie 运行在 `http://127.0.0.1:3425`：

| API 类型 | Base URL | 模型 | 密钥 |
| --- | --- | --- | --- |
| OpenAI Chat | `http://127.0.0.1:3425/v1` | `group/never-stuck` | 本地无鉴权时可留空 |
| OpenAI Responses | `http://127.0.0.1:3425/v1` | `group/never-stuck` | 本地无鉴权时可留空 |
| Anthropic | `http://127.0.0.1:3425` | `group/never-stuck` | 按网关要求填写 |
| Gemini | `http://127.0.0.1:3425` 或 `http://127.0.0.1:3425/v1beta` | `group/never-stuck` | 按网关要求填写 |

请以实际网关配置为准，不要把真实密钥写入仓库或分享给他人。

## 关于 System One

本插件没有把 System One 作为翻译协议，因为它不是自由文本翻译接口。

Magpie 的 System One 对应 `POST /v1/systemone`，是结构化决策接口：请求需要提供 `state` 和 `questions`，问题类型仅支持 `noul`、`choice`、`score`，响应是 `answers` 结构。它不能返回任意长度的译文，也不兼容 OpenAI Chat、Responses、Anthropic Messages 或 Gemini 的请求/响应格式。

因此不能把 System One 地址伪装成上述任一翻译协议。要翻译文本，请选择插件提供的四种对话协议之一。

## 错误与安全

- `401/403` 映射为密钥错误，`400/422` 映射为参数错误，`404` 映射为接口地址错误。
- 网络异常和超时会返回网络错误。
- 错误信息会截断服务端消息，并隐藏 API 密钥、Bearer 值和常见 URL 密钥参数。
- 请求头不会写入错误详情。
- Skill 文档只用于构造提示词，不会被当作代码执行。

## 更新机制

插件遵循 Bob 官方发布规范：

- 仓库根目录提供 `appcast.json`
- `info.json` 的 `appcast` 指向该文件
- GitHub Release 提供 `.bobplugin` 安装包
- `appcast.json` 中的 `sha256` 与 Release 安装包一致

Bob 会通过 `appcast` 检查新版本。插件也会通过 GitHub `bobplugin` topic 被 [Bob 第三方插件列表](https://bobplugin.ripperhe.com) 自动收录，列表每天定期更新。

## 开发与测试

```sh
node --check main.js
node --test tests/protocols.test.mjs
./scripts/build.sh
```

打包产物位于：

```text
dist/bob-plugin-ai-translate.bobplugin
```

压缩包根目录只包含 `info.json`、`main.js` 和 `prompts/`。

### 发布新版本

1. 修改 `info.json` 中的 `version`。
2. 运行 `./scripts/build.sh`。
3. 使用构建输出中的 SHA256 更新 `appcast.json`。
4. 提交并推送代码。
5. 创建对应版本的 GitHub Release，并上传 `dist/bob-plugin-ai-translate.bobplugin`。

## 仓库结构

```text
.
├── appcast.json
├── info.json
├── main.js
├── prompts/
├── scripts/
│   └── build.sh
└── tests/
    └── protocols.test.mjs
```

## 参考文档

- [Bob 插件开发文档](https://bobtranslate.com/plugin/)
- [发布插件](https://bobtranslate.com/plugin/quickstart/publish.html)
- [打包插件](https://bobtranslate.com/plugin/quickstart/pack.html)
- [Bob 第三方插件列表](https://bobplugin.ripperhe.com)
