// AI プロンプト作成（Rust `models/ai.rs` のミラー）

export interface AiProviderDto {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  jsonMode: boolean;
  hasApiKey: boolean;
}

export interface SaveAiProviderRequest {
  /** 省略 = 新規作成 */
  id?: string;
  name: string;
  baseUrl: string;
  model: string;
  jsonMode: boolean;
  /** 省略 = 既存のキーを保持、"" = キーを消す */
  apiKey?: string;
}

export type AiPromptStyle = "tags" | "natural" | "hybrid";
export type AiPromptDetail = "short" | "standard" | "detailed";

export interface AiPromptOptions {
  theme: string;
  characters: string;
  count: number;
  style: AiPromptStyle;
  detail: AiPromptDetail;
  adult: boolean;
  includeAppearance: boolean;
  includeOutfit: boolean;
}

export interface AiPromptRequestDto {
  system: string;
  user: string;
}

export interface AiPromptItemDto {
  name: string;
  tags: string[];
  text: string;
  unknownTags: string[];
  removedTags: string[];
}

export interface AiPromptResultDto {
  name: string;
  items: AiPromptItemDto[];
}
