export const IMAGE_CATEGORIES = ["backgrounds", "items", "sprites", "ui"] as const;

export type ImageCategory = (typeof IMAGE_CATEGORIES)[number];

export type AssetFormat = "png" | "webp" | "jpeg";

export type AssetSize = "1024x1024" | "1536x1024" | "1024x1536";

export type ImageAssetDef = {
  id: string;
  filename: string;
  category: ImageCategory;
  size: AssetSize;
  format: AssetFormat;
  description: string;
  intendedUse: string;
  transparent?: boolean;
  animation?: "css-spritesheet" | "ambient-loop";
};

export type AssetManifest = Record<ImageCategory, ImageAssetDef[]>;
