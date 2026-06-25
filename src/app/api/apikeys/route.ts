import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { API_KEY_PRESETS } from "@/lib/api-presets";

const ENV_PATH = path.join(process.cwd(), ".env");

function readEnvValue(key: string): string {
  // Priority: process.env (injected by Docker) > .env file
  if (process.env[key]) return process.env[key];
  try {
    const content = fs.readFileSync(ENV_PATH, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const k = trimmed.slice(0, eqIdx).trim();
      if (k === key) return trimmed.slice(eqIdx + 1).trim();
    }
  } catch { /* no .env file */ }
  return "";
}

function writeEnvFile(key: string, value: string) {
  let content: string;
  try {
    content = fs.readFileSync(ENV_PATH, "utf-8");
  } catch {
    content = "";
  }

  const lines = content.split("\n");
  let found = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const k = trimmed.slice(0, eqIdx).trim();
    if (k === key) {
      lines[i] = `${key}=${value}`;
      found = true;
      break;
    }
  }

  if (!found) {
    lines.push(`${key}=${value}`);
  }

  fs.writeFileSync(ENV_PATH, lines.join("\n"), "utf-8");
}

/** GET — list all API keys (configured status only, no values) */
export async function GET() {
  const keys: Record<string, { configured: boolean }> = {};

  for (const p of API_KEY_PRESETS) {
    const val = readEnvValue(p.env);
    keys[p.env] = { configured: val.length > 0 };
  }
  // Also include any extra *_API_KEY or BOCHA_API_KEY
  for (const k of ["BOCHA_API_KEY"]) {
    if (!keys[k]) {
      keys[k] = { configured: readEnvValue(k).length > 0 };
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

  // Update runtime env
  process.env[body.key] = body.value;

  // Try to persist to .env file (may fail in read-only containers, but runtime still works)
  try {
    writeEnvFile(body.key, body.value);
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true });
}
