import { CreateMLCEngine, MLCEngine, InitProgressReport } from "@mlc-ai/web-llm";

let engine: MLCEngine | null = null;
let isInitializing = false;

// We use Gemma 2B instruction tuned model, optimized for WebGPU
export const LOCAL_MODEL_ID = "gemma-2b-it-q4f16_1-MLC";

export type ProgressCallback = (report: InitProgressReport) => void;

export const initLocalModel = async (onProgress: ProgressCallback): Promise<void> => {
  if (engine) return;
  if (isInitializing) return;
  isInitializing = true;
  
  try {
    engine = await CreateMLCEngine(LOCAL_MODEL_ID, { initProgressCallback: onProgress });
    isInitializing = false;
  } catch (err) {
    isInitializing = false;
    throw err;
  }
};

export const isEngineReady = (): boolean => {
  return !!engine;
};

export const getLocalEngine = (): MLCEngine => {

  if (!engine) {
    throw new Error("Local model is not initialized.");
  }
  return engine;
};

// Map Gemini history structure to OpenAI chat structure for WebLLM
export function mapHistoryToWebLLM(history: any[], systemInstruction: string) {
  const messages: any[] = [
    { role: "system", content: systemInstruction }
  ];

  for (const msg of history) {
    let content = "";
    if (msg.parts) {
      for (const part of msg.parts) {
        if (part.text) {
          content += part.text + "\n";
        }
      }
    }
    
    // WebLLM accepts user and assistant roles
    const role = msg.role === "model" ? "assistant" : "user";
    messages.push({ role, content: content.trim() });
  }

  return messages;
}
