import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const plugin = require("../main.js");
const pluginDir = path.dirname(fileURLToPath(import.meta.url));
const TEST_API_KEY = ["test", "api", "key", "123"].join("-");

function withGlobals(options, request, callback) {
    const hadOption = Object.prototype.hasOwnProperty.call(globalThis, "$option");
    const hadHttp = Object.prototype.hasOwnProperty.call(globalThis, "$http");
    const previousOption = globalThis.$option;
    const previousHttp = globalThis.$http;

    globalThis.$option = options;
    globalThis.$http = {
        request
    };

    try {
        return callback();
    } finally {
        if (hadOption) {
            globalThis.$option = previousOption;
        } else {
            delete globalThis.$option;
        }
        if (hadHttp) {
            globalThis.$http = previousHttp;
        } else {
            delete globalThis.$http;
        }
    }
}

test("info.json 包含四种 API 且不包含 System One", () => {
    const info = JSON.parse(fs.readFileSync(path.join(pluginDir, "..", "info.json"), "utf8"));
    const optionIds = info.options.map((item) => item.identifier);
    const apiType = info.options.find((item) => item.identifier === "api_type");
    const skill = info.options.find((item) => item.identifier === "skill");

    assert.deepEqual(optionIds, ["api_type", "base_url", "api_key", "model", "skill"]);
    assert.deepEqual(
        apiType.menuValues.map((item) => item.value),
        ["openai_chat", "openai_responses", "anthropic", "gemini"]
    );
    assert.equal(info.category, "translate");
    assert.equal(info.minBobVersion, "0.5.0");
    assert.equal(info.homepage, "https://github.com/jiangbkvir/bob-plugin-ai-translate");
    assert.equal(
        info.appcast,
        "https://github.com/jiangbkvir/bob-plugin-ai-translate/raw/main/appcast.json"
    );
    assert.equal(skill.defaultValue, plugin.DEFAULT_SKILL);
    assert.equal(skill.textConfig.type, "visible");
    assert.equal(skill.textConfig.height, 260);
});

test("Skill 文档默认值包含内置规则并替换语言占位符", () => {
    const defaultPrompt = plugin.buildSystemPrompt("en", "zh-Hans", "");
    assert.equal(defaultPrompt.includes("{{source_language}}"), false);
    assert.equal(defaultPrompt.includes("{{target_language}}"), false);
    assert.equal(defaultPrompt.includes("English (en)"), true);
    assert.equal(defaultPrompt.includes("简体中文 (zh-Hans)"), true);

    const customPrompt = plugin.buildSystemPrompt(
        "en",
        "ja",
        "把 {{source_language}} 的内容翻译为 {{target_language}}，并保留术语。"
    );
    assert.equal(customPrompt, "把 English (en) 的内容翻译为 日本語 (ja)，并保留术语。");

    const promptWithoutPlaceholders = plugin.buildSystemPrompt("en", "ja", "只输出译文。");
    assert.match(promptWithoutPlaceholders, /^Translate from English \(en\) to 日本語 \(ja\)\./);
    assert.match(promptWithoutPlaceholders, /只输出译文。/);
});

test("OpenAI Chat URL 支持根地址、/v1、完整地址和查询参数", () => {
    assert.equal(
        plugin.buildEndpoint("openai_chat", "https://api.example.com", "model"),
        "https://api.example.com/v1/chat/completions"
    );
    assert.equal(
        plugin.buildEndpoint("openai_chat", "https://api.example.com/v1/", "model"),
        "https://api.example.com/v1/chat/completions"
    );
    assert.equal(
        plugin.buildEndpoint("openai_chat", "https://api.example.com/v1/chat/completions", "model"),
        "https://api.example.com/v1/chat/completions"
    );
    assert.equal(
        plugin.buildEndpoint("openai_chat", "https://api.example.com/v1?api-version=2026-01-01", "model"),
        "https://api.example.com/v1/chat/completions?api-version=2026-01-01"
    );
});

test("OpenAI Responses URL 拼接正确", () => {
    assert.equal(
        plugin.buildEndpoint("openai_responses", "https://api.example.com", "model"),
        "https://api.example.com/v1/responses"
    );
    assert.equal(
        plugin.buildEndpoint("openai_responses", "https://api.example.com/v1/responses", "model"),
        "https://api.example.com/v1/responses"
    );
});

test("Anthropic URL 拼接正确", () => {
    assert.equal(
        plugin.buildEndpoint("anthropic", "https://api.anthropic.com", "model"),
        "https://api.anthropic.com/v1/messages"
    );
    assert.equal(
        plugin.buildEndpoint("anthropic", "https://api.anthropic.com/v1/messages", "model"),
        "https://api.anthropic.com/v1/messages"
    );
});

test("Gemini URL 保留模型 ID 中的路径分隔符", () => {
    assert.equal(
        plugin.buildEndpoint("gemini", "https://generativelanguage.googleapis.com", "group/never-stuck"),
        "https://generativelanguage.googleapis.com/v1beta/models/group/never-stuck:generateContent"
    );
    assert.equal(
        plugin.buildEndpoint("gemini", "https://generativelanguage.googleapis.com/v1beta", "models/gemini-3-pro"),
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent"
    );
    assert.equal(
        plugin.buildEndpoint("gemini", "https://generativelanguage.googleapis.com/v1beta/models", "group/model-a"),
        "https://generativelanguage.googleapis.com/v1beta/models/group/model-a:generateContent"
    );
    assert.equal(
        plugin.buildEndpoint(
            "gemini",
            "https://generativelanguage.googleapis.com/v1beta/models/group/model-a:generateContent?alt=sse",
            "ignored"
        ),
        "https://generativelanguage.googleapis.com/v1beta/models/group/model-a:generateContent?alt=sse"
    );
});

test("四种协议的请求头和鉴权格式正确", () => {
    const chatHeaders = plugin.buildHeaders("openai_chat", "secret-key");
    assert.equal(chatHeaders.Authorization, "Bearer secret-key");

    const emptyHeaders = plugin.buildHeaders("openai_chat", "");
    assert.equal(emptyHeaders.Authorization, undefined);

    const anthropicHeaders = plugin.buildHeaders("anthropic", "secret-key");
    assert.equal(anthropicHeaders["x-api-key"], "secret-key");
    assert.equal(anthropicHeaders["anthropic-version"], "2023-06-01");
    assert.equal(anthropicHeaders.Authorization, undefined);

    const geminiHeaders = plugin.buildHeaders("gemini", "secret-key");
    assert.equal(geminiHeaders["x-goog-api-key"], "secret-key");
    assert.equal(geminiHeaders.Authorization, undefined);
});

test("四种协议生成各自原生的请求体", () => {
    const chatBody = plugin.buildRequestBody("openai_chat", "m", "system prompt", "hello");
    assert.equal(chatBody.messages[0].role, "system");
    assert.equal(chatBody.messages[0].content, "system prompt");
    assert.equal(chatBody.messages[1].content, "hello");
    assert.equal(chatBody.stream, false);

    const responsesBody = plugin.buildRequestBody("openai_responses", "m", "system prompt", "hello");
    assert.equal(responsesBody.instructions, "system prompt");
    assert.equal(responsesBody.input, "hello");
    assert.equal(responsesBody.messages, undefined);

    const anthropicBody = plugin.buildRequestBody("anthropic", "m", "system prompt", "hello");
    assert.equal(anthropicBody.system, "system prompt");
    assert.equal(anthropicBody.messages[0].content, "hello");
    assert.equal(anthropicBody.max_tokens, 4096);

    const geminiBody = plugin.buildRequestBody("gemini", "m", "system prompt", "hello");
    assert.equal(geminiBody.systemInstruction.parts[0].text, "system prompt");
    assert.equal(geminiBody.contents[0].parts[0].text, "hello");
    assert.equal(geminiBody.contents[0].role, "user");
});

test("解析 OpenAI Chat 字符串和内容数组响应", () => {
    assert.equal(
        plugin.parseResponseText("openai_chat", {
            choices: [{ message: { content: "你好" }, finish_reason: "stop" }]
        }),
        "你好"
    );
    assert.equal(
        plugin.parseResponseText("openai_chat", {
            choices: [{
                message: {
                    content: [
                        { type: "text", text: "你" },
                        { type: "text", text: "好" }
                    ]
                },
                finish_reason: "stop"
            }]
        }),
        "你好"
    );
});

test("解析 OpenAI Responses 的 output_text 和 output 内容", () => {
    assert.equal(
        plugin.parseResponseText("openai_responses", {
            status: "completed",
            output_text: "你好"
        }),
        "你好"
    );
    assert.equal(
        plugin.parseResponseText("openai_responses", {
            status: "completed",
            output: [
                {
                    type: "reasoning",
                    content: [{ type: "reasoning_text", text: "不要输出" }]
                },
                {
                    type: "message",
                    content: [
                        { type: "output_text", text: "你" },
                        { type: "output_text", text: "好" }
                    ]
                }
            ]
        }),
        "你好"
    );
});

test("解析 Anthropic 文本并忽略 thinking", () => {
    assert.equal(
        plugin.parseResponseText("anthropic", {
            stop_reason: "end_turn",
            content: [
                { type: "thinking", thinking: "internal" },
                { type: "text", text: "你" },
                { type: "text", text: "好" }
            ]
        }),
        "你好"
    );
});

test("解析 Gemini 文本并忽略 thought 部分", () => {
    assert.equal(
        plugin.parseResponseText("gemini", {
            candidates: [{
                finishReason: "STOP",
                content: {
                    parts: [
                        { thought: true, text: "internal" },
                        { text: "你" },
                        { text: "好" }
                    ]
                }
            }]
        }),
        "你好"
    );
});

test("截断和安全拦截响应返回 API 错误", () => {
    assert.throws(
        () => plugin.parseResponseText("anthropic", {
            stop_reason: "max_tokens",
            content: [{ type: "text", text: "partial" }]
        }),
        (error) => error.type === "api"
    );
    assert.throws(
        () => plugin.parseResponseText("gemini", {
            candidates: [{ finishReason: "SAFETY", content: { parts: [] } }]
        }),
        (error) => error.type === "api"
    );
});

test("错误信息隐藏 API Key 和 URL 密钥参数", () => {
    const sanitized = plugin.sanitizeErrorMessage(
        "bad secret-key Bearer secret-key https://example.com/?key=secret-key&x=1",
        "secret-key"
    );
    assert.equal(sanitized.includes("secret-key"), false);
    assert.equal(sanitized.includes("[已隐藏]"), true);
});

test("HTTP 状态码映射到 Bob 错误类型", () => {
    assert.equal(plugin.mapHttpStatus(401), "secretKey");
    assert.equal(plugin.mapHttpStatus(403), "secretKey");
    assert.equal(plugin.mapHttpStatus(400), "param");
    assert.equal(plugin.mapHttpStatus(422), "param");
    assert.equal(plugin.mapHttpStatus(404), "notFound");
    assert.equal(plugin.mapHttpStatus(429), "api");
    assert.equal(plugin.mapHttpStatus(503), "api");
});

test("translate 生成成功回调并带上 result 包装", () => {
    const requests = [];
    const callbacks = [];

    withGlobals(
        {
            api_type: "openai_chat",
            base_url: "https://api.example.com/v1",
            api_key: TEST_API_KEY,
            model: "test-model",
            skill: "将 API 翻译为接口"
        },
        (options) => {
            requests.push(options);
            options.handler({
                data: {
                    choices: [{ message: { content: "你好" }, finish_reason: "stop" }]
                },
                rawData: "",
                response: { statusCode: 200 }
            });
        },
        () => {
            plugin.translate(
                { text: "Hello", from: "en", to: "zh-Hans" },
                (payload) => callbacks.push(payload)
            );
        }
    );

    assert.equal(requests.length, 1);
    assert.equal(requests[0].method, "POST");
    assert.equal(requests[0].url, "https://api.example.com/v1/chat/completions");
    assert.equal(requests[0].header.Authorization, "Bearer " + TEST_API_KEY);
    assert.match(requests[0].body.messages[0].content, /将 API 翻译为接口/);
    assert.match(requests[0].body.messages[0].content, /English \(en\)/);
    assert.match(requests[0].body.messages[0].content, /简体中文 \(zh-Hans\)/);
    assert.equal(callbacks.length, 1);
    assert.equal(callbacks[0].result.content.text, "你好");
    assert.deepEqual(callbacks[0].result.toParagraphs, ["你好"]);
    assert.equal(callbacks[0].result.from, "en");
    assert.equal(callbacks[0].result.to, "zh-Hans");
});

test("translate 优先使用 onCompletion 且只回调一次", () => {
    const callbacks = [];
    const legacyCallbacks = [];

    withGlobals(
        {
            api_type: "openai_chat",
            base_url: "https://api.example.com",
            api_key: "",
            model: "test-model",
            skill: ""
        },
        (options) => {
            const response = {
                data: {
                    choices: [{ message: { content: "你好" }, finish_reason: "stop" }]
                },
                response: { statusCode: 200 }
            };
            options.handler(response);
            options.handler(response);
        },
        () => {
            plugin.translate(
                {
                    text: "Hello",
                    from: "en",
                    to: "zh-Hans",
                    onCompletion: (payload) => callbacks.push(payload)
                },
                (payload) => legacyCallbacks.push(payload)
            );
        }
    );

    assert.equal(callbacks.length, 1);
    assert.equal(legacyCallbacks.length, 0);
});

test("空输入和相同语言直接返回原文，不发起请求", () => {
    let requested = false;

    withGlobals(
        {},
        () => {
            requested = true;
        },
        () => {
            const emptyPayload = [];
            plugin.translate({ text: "   ", from: "en", to: "zh-Hans" }, (payload) => {
                emptyPayload.push(payload);
            });
            assert.equal(emptyPayload[0].result.content.text, "   ");

            const sameLanguagePayload = [];
            plugin.translate({ text: "Hello", from: "en", to: "en" }, (payload) => {
                sameLanguagePayload.push(payload);
            });
            assert.equal(sameLanguagePayload[0].result.content.text, "Hello");
        }
    );

    assert.equal(requested, false);
});

test("缺少配置时返回参数错误", () => {
    const payloads = [];

    withGlobals(
        {
            api_type: "openai_chat",
            base_url: "",
            api_key: "",
            model: "m",
            skill: ""
        },
        () => {
            throw new Error("不应发起请求");
        },
        () => {
            plugin.translate({ text: "Hello", from: "en", to: "zh-Hans" }, (payload) => {
                payloads.push(payload);
            });
        }
    );

    assert.equal(payloads.length, 1);
    assert.equal(payloads[0].error.type, "param");
});

test("HTTP 401 返回 secretKey 错误且不泄露密钥", () => {
    const payloads = [];

    withGlobals(
        {
            api_type: "openai_chat",
            base_url: "https://api.example.com",
            api_key: TEST_API_KEY,
            model: "test-model",
            skill: ""
        },
        (options) => {
            options.handler({
                data: {
                    error: { message: "invalid " + TEST_API_KEY }
                },
                response: { statusCode: 401 }
            });
        },
        () => {
            plugin.translate({ text: "Hello", from: "en", to: "zh-Hans" }, (payload) => {
                payloads.push(payload);
            });
        }
    );

    assert.equal(payloads.length, 1);
    assert.equal(payloads[0].error.type, "secretKey");
    assert.equal(payloads[0].error.message.includes(TEST_API_KEY), false);
});
