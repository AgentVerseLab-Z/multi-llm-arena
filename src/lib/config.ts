import fs from "fs";
import path from "path";
import type { ModelConfig, ModelPublic } from "./types";

const CONFIG_PATH = path.join(process.cwd(), "data", "models.json");

/** Load all model configs from data/models.json */
export function loadModels(): ModelConfig[] {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as ModelConfig[];
  } catch {
    return [];
  }
}

/** Save model configs to data/models.json */
export function saveModels(models: ModelConfig[]): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(models, null, 2), "utf-8");
}

/** Strip sensitive fields for frontend */
export function toPublic(model: ModelConfig): ModelPublic {
  const { apiKeyEnv: _, ...pub } = model;
  return pub;
}

/** Get API key for a model from environment */
export function getApiKey(model: ModelConfig): string {
  return process.env[model.apiKeyEnv] || "";
}
