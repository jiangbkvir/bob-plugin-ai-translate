import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const info = JSON.parse(fs.readFileSync(path.join(root, "info.json"), "utf8"));
const packagePath = path.join(root, "dist", "bob-plugin-ai-translate.bobplugin");
const appcastPath = path.join(root, "appcast.json");

if (!fs.existsSync(packagePath)) {
    throw new Error(`安装包不存在：${packagePath}`);
}

const repository = process.env.GITHUB_REPOSITORY || "jiangbkvir/bob-plugin-ai-translate";
const version = String(info.version || "").trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`info.json 中的 version 不是合法语义化版本：${version}`);
}

const sha256 = crypto
    .createHash("sha256")
    .update(fs.readFileSync(packagePath))
    .digest("hex");
const url = `https://github.com/${repository}/releases/download/v${version}/bob-plugin-ai-translate.bobplugin`;

let appcast = {
    identifier: info.identifier,
    versions: []
};
if (fs.existsSync(appcastPath)) {
    appcast = JSON.parse(fs.readFileSync(appcastPath, "utf8"));
}
if (appcast.identifier !== info.identifier) {
    throw new Error("appcast.json 与 info.json 的 identifier 不一致");
}

const versions = Array.isArray(appcast.versions) ? appcast.versions : [];
const existing = versions.find((item) => item && item.version === version);
const unchanged = existing &&
    existing.sha256 === sha256 &&
    existing.url === url &&
    existing.minBobVersion === info.minBobVersion;
const entry = {
    version,
    desc: existing && existing.desc
        ? existing.desc
        : `发布 ${version}：${info.summary}`,
    sha256,
    url,
    minBobVersion: info.minBobVersion,
    timestamp: unchanged && existing.timestamp
        ? existing.timestamp
        : Date.now()
};

const nextVersions = versions
    .filter((item) => item && item.version !== version)
    .concat(entry)
    .sort((left, right) => compareVersions(right.version, left.version));

fs.writeFileSync(
    appcastPath,
    JSON.stringify({ identifier: info.identifier, versions: nextVersions }, null, 4) + "\n"
);

console.log(`版本：${version}`);
console.log(`SHA256：${sha256}`);
console.log(`下载地址：${url}`);
console.log(`appcast 条目${unchanged ? "未变化" : "已更新"}。`);

function compareVersions(left, right) {
    const leftParts = String(left || "").split(".").map(Number);
    const rightParts = String(right || "").split(".").map(Number);
    const length = Math.max(leftParts.length, rightParts.length);
    for (let index = 0; index < length; index += 1) {
        const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
        if (difference !== 0) {
            return difference;
        }
    }
    return 0;
}
