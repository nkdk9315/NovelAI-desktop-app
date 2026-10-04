import { invoke } from "@tauri-apps/api/core";
import type {
  AiProviderDto, SaveAiProviderRequest, AiPromptOptions, AiPromptRequestDto,
  AiPromptResultDto, AiPromptStyle,
} from "@/types/ai";

export function listAiProviders(): Promise<AiProviderDto[]> {
  return invoke("list_ai_providers");
}

export function saveAiProvider(req: SaveAiProviderRequest): Promise<AiProviderDto> {
  return invoke("save_ai_provider", { req });
}

export function deleteAiProvider(id: string): Promise<void> {
  return invoke("delete_ai_provider", { id });
}

/** Request text for copy-paste mode (no API call). */
export function buildAiPromptRequest(options: AiPromptOptions): Promise<AiPromptRequestDto> {
  return invoke("build_ai_prompt_request", { options });
}

/** Parse an answer the user pasted back in copy-paste mode. */
export function parseAiPromptResponse(raw: string, style: AiPromptStyle): Promise<AiPromptResultDto> {
  return invoke("parse_ai_prompt_response", { raw, style });
}

export function generateAiPrompts(providerId: string, options: AiPromptOptions): Promise<AiPromptResultDto> {
  return invoke("generate_ai_prompts", { providerId, options });
}
