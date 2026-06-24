import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || "multi-llm-arena-captcha-2026";
const CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 minutes

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateCaptcha() {
  let text = "";
  for (let i = 0; i < 5; i++) {
    text += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return text;
}

function signAnswer(answer: string): string {
  const expires = Date.now() + CAPTCHA_TTL_MS;
  const payload = `${answer.toLowerCase()}:${expires}`;
  const sig = crypto.createHmac("sha256", CAPTCHA_SECRET).update(payload).digest("hex").slice(0, 16);
  return `${payload}:${sig}`;
}

function generateSvg(text: string): string {
  const chars = text.split("");
  const width = 150;
  const height = 50;

  let charsSvg = "";
  chars.forEach((ch, i) => {
    const x = 12 + i * 26 + (Math.random() - 0.5) * 6;
    const y = 32 + (Math.random() - 0.5) * 10;
    const rotate = (Math.random() - 0.5) * 30;
    const fontSize = 20 + Math.floor(Math.random() * 6);
    const colors = ["#3b82f6", "#8b5cf6", "#ef4444", "#f59e0b", "#10b981", "#6366f1", "#ec4899"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    charsSvg += `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" font-family="monospace" font-weight="bold" transform="rotate(${rotate},${x},${y})">${ch}</text>`;
  });

  // Noise lines
  let lines = "";
  for (let i = 0; i < 5; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const colors = ["#cbd5e1", "#e2e8f0", "#d1d5db", "#bfdbfe"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.5"/>`;
  }

  // Noise dots
  let dots = "";
  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = Math.random() * 2 + 0.5;
    dots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#94a3b8" opacity="0.5"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#f8fafc" rx="6"/>
    ${lines}${dots}${charsSvg}
  </svg>`;
}

export async function GET() {
  const text = generateCaptcha();
  const svg = generateSvg(text);
  const token = signAnswer(text);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Captcha-Token": token,
    },
  });
}
