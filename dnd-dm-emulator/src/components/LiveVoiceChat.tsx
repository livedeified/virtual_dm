import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Volume2, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { getGeminiClient, CharacterProfile } from '../services/gemini';
import { LiveServerMessage, Modality } from '@google/genai';

export function LiveVoiceChat({ profile, provider }: { profile: CharacterProfile, provider: string }) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const sessionRef = useRef<any>(null);
  const recordCtxRef = useRef<AudioContext | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);

  const dmInstruction = `You are an expert Dungeons & Dragons Dungeon Master (DM).
The user is playing a single-player campaign with you.
Here is the user's character profile:
Name: ${profile.name}
Race: ${profile.race}
Class: ${profile.characterClass}
Level: ${profile.level}
Background: ${profile.background}
Alignment: ${profile.alignment}

Stats: STR ${profile.keyStats?.strength}, DEX ${profile.keyStats?.dexterity}, CON ${profile.keyStats?.constitution}, INT ${profile.keyStats?.intelligence}, WIS ${profile.keyStats?.wisdom}, CHA ${profile.keyStats?.charisma}

Instructions:
1. Act as the Dungeon Master. Describe the environment, control NPCs, and manage the narrative.
2. Tailor the adventure to the user's character profile.
3. Keep your responses concise and conversational, suitable for voice.
4. When the user attempts an action with an uncertain outcome, ask them to make a skill check or attack roll. Tell them what to roll and the target DC (e.g., "Roll a d20 and add your strength modifier. The DC is 15.").
5. The user will tell you their roll result. Narrate the outcome based on whether they met the DC.
6. Do not play the user's character for them.
7. Start the campaign by setting the scene for them. ${profile.startingScenario ? `IMMEDIATELY drop them into this scenario: "${profile.startingScenario}". Set the scene vividly and ask what they do.` : "Start by dropping them into an exciting scene and ask what they do."}
8. This is a gritty fantasy setting (Faerun). Visceral, graphic, and intense descriptions of combat, violence, and bar fights are expected and fully allowed. Do not hold back on describing the gritty reality of fantasy combat.
9. Tailor the session length to about 20 minutes of real-world playtime. You MUST ensure there is at least one combat encounter within this timeframe. Keep encounters short, dynamic, and fast-paced. Resolve combat or challenges in 1-3 turns rather than dragging them out. Enemies should be decisive, have lower health, or flee/surrender quickly to keep the story moving rapidly.`;

  const stopSession = () => {
    if (sessionRef.current && typeof sessionRef.current.close === 'function') {
      try { sessionRef.current.close(); } catch (e) {}
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (recordCtxRef.current) {
      recordCtxRef.current.close();
      recordCtxRef.current = null;
    }
    if (playCtxRef.current) {
      playCtxRef.current.close();
      playCtxRef.current = null;
    }
    setStatus('idle');
    setIsSpeaking(false);
  };

  const startSession = async (currentProvider: string) => {
    if (currentProvider === 'webllm') {
      setErrorMsg("Voice mode currently requires Gemini API (Cloud mode). Local WebLLM support is in development.");
      return;
    }
    setStatus('connecting');

    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      recordCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      await recordCtxRef.current.audioWorklet.addModule('/pcm-processor.js');

      playCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextPlayTimeRef.current = playCtxRef.current.currentTime;

      const source = recordCtxRef.current.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      const workletNode = new AudioWorkletNode(recordCtxRef.current, 'pcm-processor');
      workletNodeRef.current = workletNode;

      source.connect(workletNode);
      workletNode.connect(recordCtxRef.current.destination);


      const aiClient = getGeminiClient();
      const sessionPromise = aiClient.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } }
          },
          systemInstruction: dmInstruction,
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            if (workletNodeRef.current) {
              workletNodeRef.current.port.onmessage = (event) => {
                const inputData = event.data;
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  const s = Math.max(-1, Math.min(1, inputData[i]));
                  pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                const buffer = new ArrayBuffer(pcm16.length * 2);
                const view = new DataView(buffer);
                for (let i = 0; i < pcm16.length; i++) {
                  view.setInt16(i * 2, pcm16[i], true);
                }
                let binary = '';
                const bytes = new Uint8Array(buffer);
                for (let i = 0; i < bytes.byteLength; i++) {
                  binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);
                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
                });
              };
            }
          },

          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              activeSourcesRef.current = [];
              if (playCtxRef.current) {
                nextPlayTimeRef.current = playCtxRef.current.currentTime;
              }
              setIsSpeaking(false);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && playCtxRef.current) {
              setIsSpeaking(true);
              const binary = atob(base64Audio);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              const pcm16 = new Int16Array(bytes.buffer);
              const audioBuffer = playCtxRef.current.createBuffer(1, pcm16.length, 24000);
              const channelData = audioBuffer.getChannelData(0);
              for (let i = 0; i < pcm16.length; i++) {
                channelData[i] = pcm16[i] / 32768.0;
              }

              const playSource = playCtxRef.current.createBufferSource();
              playSource.buffer = audioBuffer;
              playSource.connect(playCtxRef.current.destination);
              
              const startTime = Math.max(nextPlayTimeRef.current, playCtxRef.current.currentTime);
              playSource.start(startTime);
              nextPlayTimeRef.current = startTime + audioBuffer.duration;
              
              activeSourcesRef.current.push(playSource);
              playSource.onended = () => {
                activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== playSource);
                if (activeSourcesRef.current.length === 0) {
                  setIsSpeaking(false);
                }
              };
            }
          },
          onclose: () => {
            stopSession();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setErrorMsg("Connection error: " + (err.message || String(err)));
            stopSession();
          }
        }
      });
      
      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error("Failed to start voice session:", err);
      setErrorMsg(err.name === 'NotAllowedError' ? 'Microphone access denied. Please allow microphone access.' : 'Failed to start voice session: ' + (err.message || String(err)));
      stopSession();
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)] from-amber-900/10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full fantasy-border p-12 rounded-[2.5rem] flex flex-col items-center text-center space-y-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        <div className="space-y-4">
          <h2 className="text-3xl font-display font-bold text-amber-500 tracking-widest uppercase">Ancient Voice</h2>
          <p className="text-zinc-400 font-serif italic text-sm leading-relaxed">
            Speak directly to your Dungeon Master. The weaves of magic will carry your voice across the realms.
          </p>
          {errorMsg && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-xs font-serif bg-red-950/30 p-3 rounded-xl border border-red-900/30 mt-4 italic"
            >
              {errorMsg}
            </motion.p>
          )}
        </div>

        <div className="relative flex items-center justify-center w-56 h-56">
          <AnimatePresence>
            {status === 'connected' && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-amber-500/10 rounded-full border-2 border-amber-500/20" 
              />
            )}
          </AnimatePresence>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => status === 'idle' ? startSession(provider) : stopSession()}
            aria-label={status === 'idle' ? "Start Voice Chat" : "Stop Voice Chat"}

            className={cn(
              "relative w-36 h-36 rounded-full flex items-center justify-center transition-all shadow-2xl z-10 border-4",
              status === 'idle' 
                ? 'bg-zinc-900 border-amber-900/50 text-amber-500 hover:border-amber-500' 
                : 'bg-red-950 border-red-500 text-red-500'
            )}
          >
            {status === 'connecting' ? (
              <Loader2 className="w-14 h-14 animate-spin" />
            ) : status === 'connected' ? (
              <motion.div
                animate={{ scale: isSpeaking ? [1, 1.1, 1] : 1 }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <Square className="w-14 h-14" fill="currentColor" />
              </motion.div>
            ) : (
              <Mic className="w-14 h-14" />
            )}
          </motion.button>
        </div>

        <div className="h-10 flex items-center justify-center">
          {status === 'connected' && isSpeaking && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 text-amber-500"
            >
              <Volume2 className="w-6 h-6 animate-pulse" />
              <span className="text-sm font-display tracking-[0.2em] uppercase font-bold text-shadow-glow">The Master Speaks</span>
            </motion.div>
          )}
          {status === 'connected' && !isSpeaking && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 text-zinc-500"
            >
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ scaleY: [1, 2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.15 }}
                    className="w-1 h-3 bg-zinc-600 rounded-full"
                  />
                ))}
              </div>
              <span className="text-sm font-display tracking-[0.2em] uppercase">Listening...</span>
            </motion.div>
          )}
          {status === 'idle' && (
            <div className="flex items-center gap-3 text-zinc-700">
              <MicOff className="w-6 h-6" />
              <span className="text-sm font-display tracking-[0.2em] uppercase">Dormant</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
