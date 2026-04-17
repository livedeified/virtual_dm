import { GoogleGenAI, Type, Modality } from "@google/genai";
import { getLocalEngine, mapHistoryToWebLLM } from './webllm';

let aiClient: GoogleGenAI | null = null;

export const initGeminiClient = (apiKey: string) => {
  aiClient = new GoogleGenAI({ apiKey });
};

export const getGeminiClient = (): GoogleGenAI => {
  if (!aiClient) {
    throw new Error("Gemini API Client is not initialized. Please provide an API key.");
  }
  return aiClient;
};

export interface CharacterProfile {
  name: string;
  race: string;
  characterClass: string;
  level: number;
  background: string;
  alignment: string;
  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  appearance: string;
  backstory: string;
  startingScenario?: string;
  keyStats: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
}

export async function extractCharacterProfile(base64Pdf: string): Promise<CharacterProfile> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Pdf,
            mimeType: "application/pdf",
          },
        },
        {
          text: "Extract the character information from this D&D character sheet PDF. If some information is missing, infer it reasonably or leave it blank. Provide a comprehensive summary of their personality, backstory, and stats.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          race: { type: Type.STRING },
          characterClass: { type: Type.STRING },
          level: { type: Type.INTEGER },
          background: { type: Type.STRING },
          alignment: { type: Type.STRING },
          personalityTraits: { type: Type.STRING },
          ideals: { type: Type.STRING },
          bonds: { type: Type.STRING },
          flaws: { type: Type.STRING },
          appearance: { type: Type.STRING },
          backstory: { type: Type.STRING },
          keyStats: {
            type: Type.OBJECT,
            properties: {
              strength: { type: Type.INTEGER },
              dexterity: { type: Type.INTEGER },
              constitution: { type: Type.INTEGER },
              intelligence: { type: Type.INTEGER },
              wisdom: { type: Type.INTEGER },
              charisma: { type: Type.INTEGER },
            },
          },
        },
        required: ["name", "race", "characterClass", "personalityTraits"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Failed to extract character profile.");
  }

  return JSON.parse(text) as CharacterProfile;
}

export interface KnowledgeDocument {
  name: string;
  text?: string;
  base64?: string;
  mimeType: string;
}

export type AIProviderType = 'gemini' | 'webllm';

export class MultiAgentDMSession {
  private history: any[] = [];
  private profile: CharacterProfile;
  private knowledgeDocs: KnowledgeDocument[];
  public provider: AIProviderType;

  constructor(profile: CharacterProfile, knowledgeDocs: KnowledgeDocument[] = [], provider: AIProviderType = 'gemini') {
    this.profile = profile;
    this.knowledgeDocs = knowledgeDocs;
    this.provider = provider;
    
    if (knowledgeDocs.length > 0) {
      const parts: any[] = [
        { text: "System Note: The following are campaign rulebooks, lore documents, and notes. You must adhere to these rules and lore during our session." }
      ];
      for (const doc of knowledgeDocs) {
        if (doc.text) {
          parts.push({ text: `--- Document: ${doc.name} ---\n${doc.text}\n--- End of Document ---` });
        } else if (doc.base64) {
          parts.push({
            inlineData: {
              data: doc.base64.includes(',') ? doc.base64.split(',')[1] : doc.base64,
              mimeType: doc.mimeType
            }
          });
        }
      }
      this.history.push({ role: "user", parts });
      this.history.push({ role: "model", parts: [{ text: "Understood. I will adhere to these rules and lore." }] });
    }
  }

  public updateDocs(newDocs: KnowledgeDocument[]) {
    this.knowledgeDocs = newDocs;
  }


  private getAgentInstruction(agentType: 'director' | 'narrator' | 'combat' | 'social'): string {
    const common = `You are an expert D&D DM agent.
Character: ${this.profile.name} (${this.profile.race} ${this.profile.characterClass}, Level ${this.profile.level}).
Appearance: ${this.profile.appearance}
Backstory: ${this.profile.backstory}
Stats: STR ${this.profile.keyStats?.strength}, DEX ${this.profile.keyStats?.dexterity}, CON ${this.profile.keyStats?.constitution}, INT ${this.profile.keyStats?.intelligence}, WIS ${this.profile.keyStats?.wisdom}, CHA ${this.profile.keyStats?.charisma}

CRITICAL STATE MANAGEMENT: To maintain continuity, you must update the state documents when significant events occur.
If you need to update a document, output this exactly at the end of your response:
<UPDATE_DOC name="filename.md">
[The ENTIRE updated markdown content]
</UPDATE_DOC>
Valid files are: world_state.md, npc_ledger.md, combat_tracker.md, session_log.md.`;

    if (agentType === 'director') {
      return `${common}
TASK: Analyze the user input and the current state to decide which specialized agent should handle this turn.
Agents:
- NARRATOR: Discovery, exploration, world description, movement.
- COMBAT: Fighting, initiative, visceral violence, mechanical rolls.
- SOCIAL: NPC dialogue, roleplay, interpersonal interaction.

Output ONLY one word: NARRATOR, COMBAT, or SOCIAL.`;
    }

    if (agentType === 'narrator') {
      return `${common}
ROLE: NARRATOR. Focus: Immersive environment and sensory details.
1. Describe the environment vividly (sights, sounds, smells).
2. Start the campaign with a detailed scene. ${this.profile.startingScenario ? `The starting scenario must be: "${this.profile.startingScenario}"` : "Do not ask what the player sees."}
3. Manage exploration.
4. When asking for rolls: *Meta: [ROLL:1d20+MOD|SOURCE|DC:XX]* (MOD is STR, DEX, CON, INT, WIS, or CHA. SOURCE is the skill or reason, e.g., Athletics).
5. Always end with 2-4 [SUGGESTION: Action] tags.`;
    }

    if (agentType === 'combat') {
      return `${common}
ROLE: COMBAT MASTER. Focus: Mechanics and visceral action.
1. Describe combat in graphic, intense ways.
2. Manage turn order and HP. Resolve in 1-3 turns.
3. When asking for rolls (attack/save): *Meta: [ROLL:1d20+MOD|SOURCE|AC:XX]* or *Meta: [ROLL:1d20+MOD|SOURCE|DC:XX]*
4. Always end with 2-4 [SUGGESTION: Combat Action] tags.`;
    }

    if (agentType === 'social') {
      return `${common}
ROLE: NPC SPECIALIST. Focus: Roleplay and interaction.
1. Embody NPCs with distinct personalities.
2. Focus on dialogue. Describe mannerisms and reactions.
3. When asking for social rolls: *Meta: [ROLL:1d20+MOD|SOURCE|DC:XX]*
4. Always end with 2-4 [SUGGESTION: Dialogue Option] tags.`;
    }
    return common;
  }

  private getWindowedHistory(): any[] {
    const MAX_HISTORY = 12; // Keep the last 12 messages (6 turns)
    let baseDocs: any[] = [];
    let recentHistory: any[] = [];
    
    if (this.knowledgeDocs.length > 0) {
      baseDocs = this.history.slice(0, 2); // user and model init
      recentHistory = this.history.slice(2);
    } else {
      recentHistory = this.history;
    }
    
    if (recentHistory.length > MAX_HISTORY) {
      let startIdx = recentHistory.length - MAX_HISTORY;
      // Ensure the first message in the window is from the user
      if (recentHistory[startIdx].role !== 'user') {
        startIdx++;
      }
      recentHistory = recentHistory.slice(startIdx);
    }
    
    return [...baseDocs, ...recentHistory];
  }

  async *sendMessageStream(params: { message: string }) {
    this.history.push({ role: "user", parts: [{ text: params.message }] });

    if (this.provider === 'webllm') {
      try {
        const engine = getLocalEngine();
        const messages = mapHistoryToWebLLM(this.getWindowedHistory(), this.getAgentInstruction('narrator'));
        
        const chunks = await engine.chat.completions.create({
          messages,
          temperature: 0.8,
          stream: true,
        }) as any;

        let fullResponse = "";
        for await (const chunk of chunks) {
          const text = chunk.choices[0]?.delta?.content || "";
          fullResponse += text;
          yield { text };
        }
        this.history.push({ role: "model", parts: [{ text: fullResponse }] });
      } catch (error) {
        this.history.pop();
        throw error;
      }
      return;
    }

    const ai = getGeminiClient();
    try {
      // 1. Director identifies the mode
      const directorHistory = this.history.slice(0, -1);
      const directorResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...directorHistory.slice(-4),
          { role: "user", parts: [{ text: `DIRECTOR: routing turn. User said: "${params.message}"` }] }
        ],
        config: {
          systemInstruction: this.getAgentInstruction('director')
        }
      });

      const mode = (directorResponse.text?.trim().toUpperCase() || 'NARRATOR') as 'NARRATOR' | 'COMBAT' | 'SOCIAL';
      const agentType = mode.toLowerCase() as 'narrator' | 'combat' | 'social';

      // 2. Specialized agent generates response
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: this.getWindowedHistory(),
        config: {
          systemInstruction: this.getAgentInstruction(agentType),
          temperature: 0.8,
        }
      });

      let fullResponse = "";
      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        fullResponse += text;
        yield { text };
      }

      this.history.push({ role: "model", parts: [{ text: fullResponse }] });
    } catch (error) {
      this.history.pop();
      throw error;
    }
  }
}

export async function generateSpeech(text: string): Promise<string | null> {
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
          },
        },
      },
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (inlineData?.data) {
      const mimeType = inlineData.mimeType || "audio/pcm;rate=24000";
      return `data:${mimeType};base64,${inlineData.data}`;
    }
    return null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

export function createDMChat(profile: CharacterProfile, knowledgeDocs: KnowledgeDocument[] = [], provider: AIProviderType = 'gemini') {
  return new MultiAgentDMSession(profile, knowledgeDocs, provider);
}
