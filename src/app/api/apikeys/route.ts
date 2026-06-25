import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ENV_PATH = path.join(process.cwd(), ".env");

// Preset API key definitions with default URLs
export const API_KEY_PRESETS = [
  { env: "DASHSCOPE_API_KEY", label: "阿里云百炼 (DashScope)", url: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { env: "DEEPSEEK_API_KEY", label: "DeepSeek 官方", url: "https://api.deepseek.com/v1" },
  { env: "OPENAI_API_KEY", label: "OpenAI", url: "https://api.openai.com/v1" },
  { env: "ZHIPU_API_KEY", label: "智谱 GLM", url: "https://open.bigmodel.cn/api/paas/v4" },
  { env: "MOONSHOT_API_KEY", label: "Moonshot (Kimi)", url: "https://api.moonshot.cn/v1" },
];

function readEnvFile(): Record<string, string> {
  try {
    const content = fs.readFileSync(ENV_PATH, "utf-8");
    const result: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      result[key] = val;
    }
    return result;
  } catch {
    return {};
  }
}

function writeEnvFile(updates: Record<string, string>) {
  let content: string;
  try {
    content = fs.readFileSync(ENV_PATH, "utf-8");
  } catch {
    content = "";
  }

  const lines = content.split("\n");
  const updatedKeys = new Set<string>();

  // Update existing keys
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    if (key in updates) {
      lines[i] = `${key}=${updates[key]}`;
      updatedKeys.add(key);
    }
  }

  // Append new keys
  for (const [key, val] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      lines.push(`${key}=${val}`);
    }
  }

  fs.writeFileSync(ENV_PATH, lines.join("\n"), "utf-8");
}

/** GET — list all API keys (masked) */
export async function GET() {
  const env = readEnvFile();
  const keys: Record<string, { value: string; masked: string }> = {};

  for (const [k, v] of Object.entries(env)) {
    if (k.endsWith("_API_KEY") || k === "BOCHA_API_KEY") {
      keys[k] = {
        value: v,
        masked: v.length > 8 ? v.slice(0, 4) + "…" + v.slice(-4) : "****",
      };
    }
  }

  return NextResponse.json({ keys, presets: API_KEY_PRESETS });
}

/** PUT — update API key(s) */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body.key || typeof body.value !== "string") {
    return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
  }

  writeEnvFile({ [body.key]: body.value });

  // Reload env into process.env
  process.env[body.key] = body.value;

  return NextResponse.json({ ok: true });
}
