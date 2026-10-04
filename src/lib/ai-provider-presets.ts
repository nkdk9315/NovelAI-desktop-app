/**
 * Starting points for the provider form. Every entry is an OpenAI-compatible
 * endpoint; the model name is left to the user because it changes often.
 */
export interface AiProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  /** Runs on the user's machine: no API key needed */
  local?: boolean;
}

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { id: "gemini", name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  { id: "siliconflow", name: "SiliconFlow", baseUrl: "https://api.siliconflow.cn/v1" },
  { id: "dashscope", name: "Alibaba (Qwen)", baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1" },
  { id: "zhipu", name: "Zhipu (GLM)", baseUrl: "https://open.bigmodel.cn/api/paas/v4" },
  { id: "moonshot", name: "Moonshot (Kimi)", baseUrl: "https://api.moonshot.cn/v1" },
  { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
  { id: "mistral", name: "Mistral", baseUrl: "https://api.mistral.ai/v1" },
  { id: "xai", name: "xAI", baseUrl: "https://api.x.ai/v1" },
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { id: "anthropic", name: "Anthropic", baseUrl: "https://api.anthropic.com/v1" },
  { id: "nanogpt", name: "NanoGPT", baseUrl: "https://nano-gpt.com/api/v1" },
  { id: "ollama", name: "Ollama", baseUrl: "http://localhost:11434/v1", local: true },
  { id: "lmstudio", name: "LM Studio", baseUrl: "http://localhost:1234/v1", local: true },
];
