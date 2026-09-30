/** IPC types of the sprite variant feature (差分制作, F13). See docs/contracts/sprite-variants.md. */

export type SpriteCandidateMethod = "txt2img" | "inpaint" | "composite" | "import" | "edit";

export interface SpriteSetDto {
  id: string;
  projectId: string;
  name: string;
  /** SpriteSpec JSON (normalize with `normalizeSpec`) */
  spec: unknown;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpriteCandidateDto {
  id: string;
  cellKey: string;
  imageId: string;
  parentImageId: string | null;
  method: SpriteCandidateMethod;
  createdAt: string;
  filePath: string;
  seed: number;
}

export interface SpriteCellDto {
  cellKey: string;
  adoptedImageId: string | null;
  excluded: boolean;
  note: string;
  candidates: SpriteCandidateDto[];
}

export interface SpriteExportLayer {
  baseImageId: string;
  /** 1/8-size black / white PNG (base64); white = keep the variant's pixels */
  maskBase64: string;
}

export interface SpriteExportImage {
  imageId: string;
  relPath: string;
  scale: number;
  layer?: SpriteExportLayer;
}

export interface SpriteExportText {
  relPath: string;
  content: string;
}

export interface SpriteAtlasEntry {
  imageId: string;
  frame: string;
  layer?: SpriteExportLayer;
}

export interface SpriteAtlasRequest {
  name: string;
  relDir: string;
  maxSize: number;
  padding: number;
  scale: number;
  entries: SpriteAtlasEntry[];
}

export interface SpriteExportPlan {
  setId: string;
  outDir: string;
  images: SpriteExportImage[];
  texts: SpriteExportText[];
  atlas?: SpriteAtlasRequest;
  /** Remove plain backgrounds first (images already transparent pass through) */
  background?: SpriteBackgroundOptions;
}

export interface SpriteBackgroundOptions {
  fillHoles: boolean;
  removeIslands: boolean;
}

export interface SpriteBackgroundPreviewDto {
  imageBase64: string;
  outcome: "removed" | "alreadyTransparent" | "notPlain";
}

export interface SpriteExportResultDto {
  outDir: string;
  files: string[];
}
