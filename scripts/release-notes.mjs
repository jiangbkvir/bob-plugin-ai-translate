import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2];
const outputPath = path.resolve(root, process.argv[3] || ".release-notes.md");

if (!version) {
    throw new Error("缺少版本号参数");
}

const info = JSON.parse(fs.readFileSync(path.join(root, "info.json"), "utf8"));
const changelogPath = path.join(root, "CHANGELOG.md");
let notes = "";

if (fs.existsSync(changelogPath)) {
    const changelog = fs.readFileSync(changelogPath, "utf8");
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const heading = new RegExp(`^## \\[${escapedVersion}\\].*$`, "m");
    const match = heading.exec(changelog);
    if (match) {
        const start = match.index + match[0].length;
        const rest = changelog.slice(start);
        const nextHeading = /^## \[/m.exec(rest);
        notes = (nextHeading ? rest.slice(0, nextHeading.index) : rest).trim();
    }
}

if (!notes) {
    notes = [
        `AI 翻译 ${version}`,
        "",
        info.summary,
        "",
        `- 最低 Bob 版本：${info.minBobVersion}`,
        "- 详细配置与协议说明请查看 README。"
    ].join("\n");
}

fs.writeFileSync(outputPath, notes + "\n");
console.log(`发布说明已写入：${outputPath}`);
