# 更新日志

## [0.1.3] - 2026-11-16

### 新增

- 支持 Bob 社区版 `0.10.3`，最低兼容 Bob `0.5.0`。
- 支持 OpenAI Chat Completions、OpenAI Responses、Anthropic Messages、Gemini generateContent 四种原生 API。
- 支持自定义 Base URL、API 密钥、模型和 Skill 文档。
- Skill 文档内置默认翻译规则，支持 `{{source_language}}` 和 `{{target_language}}` 占位符。
- 支持通过 `appcast.json` 检查更新，并发布到 Bob 第三方插件列表。

### 说明

- Bob `1.8.0` 及以上使用多行 Skill 输入框。
- Bob 社区版 `0.10.3` 会显示单行 Skill 输入框，但默认规则和翻译逻辑不受影响。
