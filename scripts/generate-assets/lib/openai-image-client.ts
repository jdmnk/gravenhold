import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import OpenAI from "openai";

import {
  IMAGE_MODEL,
  IMAGE_QUALITY,
  requireOpenAiKey,
} from "./env";
import type { AssetFormat, AssetSize } from "./types";

const client = new OpenAI({
  apiKey: requireOpenAiKey(),
});

type GenerateInput = {
  format: AssetFormat;
  outputPath: string;
  prompt: string;
  size: AssetSize;
  transparent?: boolean;
};

export async function generateImage(input: GenerateInput): Promise<void> {
  const response = await client.images.generate({
    background: input.transparent ? "transparent" : "opaque",
    model: IMAGE_MODEL,
    n: 1,
    output_compression: input.format === "png" ? undefined : 90,
    output_format: input.format,
    prompt: input.prompt,
    quality: IMAGE_QUALITY as "low" | "medium" | "high" | "auto",
    size: input.size,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI image generation response did not include b64_json data.");
  }

  mkdirSync(dirname(input.outputPath), { recursive: true });
  writeFileSync(input.outputPath, Buffer.from(b64, "base64"));
}
