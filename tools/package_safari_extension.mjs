import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const extensionPath = resolve(root, "extension");
const projectLocation = resolve(root, "safari");
const appName = "줍줍노트";
const bundleIdentifier = "com.zzupzzupnote.app";

mkdirSync(projectLocation, { recursive: true });

const hasPackager = spawnSync("xcrun", ["--find", "safari-web-extension-packager"], {
  encoding: "utf8"
});

if (hasPackager.status !== 0) {
  console.error([
    "Safari Web Extension packager를 찾지 못했습니다.",
    "Xcode를 설치한 뒤 아래 명령을 다시 실행해 주세요.",
    "",
    "  node tools/package_safari_extension.mjs",
    "",
    "현재 이 스크립트는 Xcode의 safari-web-extension-packager를 호출합니다."
  ].join("\n"));
  process.exit(1);
}

const result = spawnSync("xcrun", [
  "safari-web-extension-packager",
  extensionPath,
  "--project-location",
  projectLocation,
  "--app-name",
  appName,
  "--bundle-identifier",
  bundleIdentifier,
  "--swift"
], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit"
});

process.exit(result.status ?? 1);
