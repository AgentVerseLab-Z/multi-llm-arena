import { NextRequest, NextResponse } from "next/server";
import { loadModels, saveModels, toPublic } from "@/lib/config";
import type { ModelConfig } from "@/lib/types";

/** GET /api/models — list all models (public fields only) */
export async function GET() {
  const models = loadModels();
  return NextResponse.json(models.map(toPublic));
}

/** POST /api/models — create a new model */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const models = loadModels();

  // Validate required fields
  if (!body.id || !body.name || !body.modelId || !body.baseUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check duplicate id
  if (models.some((m) => m.id === body.id)) {
    return NextResponse.json({ error: "Model ID already exists" }, { status: 409 });
  }

  // Build API key env var name from model id
  const apiKeyEnv = body.apiKeyEnv || `${body.id.toUpperCase().replace(/-/g, "_")}_API_KEY`;

  const newModel: ModelConfig = {
    id: body.id,
    name: body.name,
    provider: body.provider || "custom",
    modelId: body.modelId,
    baseUrl: body.baseUrl,
    apiKeyEnv,
    maxTokens: body.maxTokens || 4096,
    temperature: body.temperature ?? 0.7,
    enabled: body.enabled ?? true,
    color: body.color || "#6b7280",
    icon: body.icon || "🤖",
    supportsSearch: body.supportsSearch ?? true,
  };

  models.push(newModel);
  saveModels(models);

  return NextResponse.json(toPublic(newModel), { status: 201 });
}

/** PUT /api/models — update an existing model */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const models = loadModels();
  const idx = models.findIndex((m) => m.id === body.id);

  if (idx === -1) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  // Merge updates (preserve apiKeyEnv)
  models[idx] = { ...models[idx], ...body, apiKeyEnv: models[idx].apiKeyEnv };
  saveModels(models);

  return NextResponse.json(toPublic(models[idx]));
}

/** DELETE /api/models?id=xxx — delete a model */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const models = loadModels();
  const filtered = models.filter((m) => m.id !== id);

  if (filtered.length === models.length) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  saveModels(filtered);
  return NextResponse.json({ ok: true });
}
