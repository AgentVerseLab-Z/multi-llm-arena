import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { API_KEY_PRESETS } from "@/lib/api-presets";

export const dynamic = "force-dynamic";

function readEnvValue(key: string): string {
  try {
    // Direct process.env check
    const val = process.env[key];
    if (val && val.length > 0 && !val.startsWith("your_") && !val.startsWith("***")) {
      return val;
    }
  } catch {}
  
  // Fallback: try reading from /app/.env
  try {
    const envPath = path.join(process.cwd(), ".env");
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const k = trimmed.slice(0, eqIdx).trim();
      if (k === key) {
        const v = trimmed.slice(eqIdx + 1).trim();
        if (v.length > 0 && !v.startsWith("your_") && !v.startsWith("***")) {
          return v;
        }
      }
    }
  } catch {}
  
  return "";
}

function writeEnvFile(key: string, value: string) {
  const envPath = path.join(process.cwd(), ".env");
  let content: string;
  try {
    content = fs.readFileSync(envPath, "utf-8");
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

  try {
    fs.writeFileSync(envPath, lines.join("\n"), "utf-8");
  } catch {}
}

export async function GET() {
  const keys: Record<string, { configured: boolean }> = {};

  for (const p of API_KEY_PRESETS) {
    const val = readEnvValue(p.env);
    keys[p.env] = { configured: val.length > 0 };
  }
  for (const k of ["BOCHA_API_KEY"]) {
    if (!keys[k]) {
      keys[k] = { configured: readEnvValue(k).length > 0 };
    }
  }

  return NextResponse.json({ keys, presets: API_KEY_PRESETS });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body.key || typeof body.value !== "string") {
    return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
  }

  // Update runtime env
  process.env[body.key] = body.value;

  // Try to persist to .env file
  writeEnvFile(body.key, body.value);

  return NextResponse.json({ ok: true });
}
