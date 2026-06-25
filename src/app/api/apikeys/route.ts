import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { API_KEY_PRESETS } from "@/lib/api-presets";

const ENV_PATH = path.join(process.cwd(), ".env");

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

  for (const [key, val] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      lines.push(`${key}=${val}`);
    }
  }

  fs.writeFileSync(ENV_PATH, lines.join("\n"), "utf-8");
}

/** GET — list all API keys (configured status only, no values) */
export async function GET() {
  const env = readEnvFile();
  const keys: Record<string, { configured: boolean }> = {};

  for (const p of API_KEY_PRESETS) {
    keys[p.env] = { configured: !!(env[p.env] && env[p.env].length > 0) };
  }
  // Also include any extra *_API_KEY or BOCHA_API_KEY in .env
  for (const [k, v] of Object.entries(env)) {
    if ((k.endsWith("_API_KEY") || k === "BOCHA_API_KEY") && !keys[k]) {
      keys[k] = { configured: v.length > 0 };
    }
  }

  return NextResponse.json({ keys, presets: API_KEY_PRESETS });
}

/** PUT — update API key */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body.key || typeof body.value !== "string") {
    return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
  }

  writeEnvFile({ [body.key]: body.value });
  process.env[body.key] = body.value;

  return NextResponse.json({ ok: true });
}
