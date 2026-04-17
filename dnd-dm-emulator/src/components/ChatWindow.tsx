import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Sparkles, Dices, Volume2, Loader2, Square, ScrollText } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CharacterProfile, generateSpeech } from '../services/gemini';
import { get, set } from 'idb-keyval';


interface Message {
  role: 'user' | 'model';
  content: string;
}

interface ChatWindowProps {
  profile: CharacterProfile;
  chatSession: any; // The Gemini chat session
  onUpdateDoc?: (docName: string, newContent: string) => void;
}

function TTSButton({ text }: { text: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const cleanText = text.replace(/\[ROLL:.*?\]/gi, '').replace(/\[SUGGESTION:.*?\]/gi, '').replace(/\*Meta:.*?\*/gi, '').trim();

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const handlePlay = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    setIsLoading(true);
    const audioDataUri = await generateSpeech(cleanText);
    setIsLoading(false);

    if (audioDataUri) {
      try {
        const base64Data = audioDataUri.split(',')[1];
        const mimeType = audioDataUri.split(';')[0].split(':')[1];
        
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioCtx = audioCtxRef.current;

        let audioBuffer: AudioBuffer;

        if (mimeType.includes('pcm')) {
          // Raw PCM 16-bit 24000Hz
          const pcm16 = new Int16Array(bytes.buffer);
          audioBuffer = audioCtx.createBuffer(1, pcm16.length, 24000);
          const channelData = audioBuffer.getChannelData(0);
          for (let i = 0; i < pcm16.length; i++) {
            channelData[i] = pcm16[i] / 32768.0;
          }
        } else {
          // WAV or other format
          audioBuffer = await audioCtx.decodeAudioData(bytes.buffer);
        }

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.onended = () => setIsPlaying(false);
        sourceNodeRef.current = source;
        source.start();
        setIsPlaying(true);
      } catch (error) {
        console.error("Audio playback error:", error);
        setIsPlaying(false);
      }
    } else {
      // Fallback to browser TTS if Gemini TTS is unavailable (e.g. Local Mode)
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.95;
      utterance.pitch = 0.8;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  return (
    <button
      onClick={handlePlay}
      disabled={isLoading}
      className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-amber-500 transition-colors"
      title="Play DM Voice"
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isPlaying ? (
        <Square className="w-3.5 h-3.5" />
      ) : (
        <Volume2 className="w-3.5 h-3.5" />
      )}
      {isPlaying ? 'Stop' : 'Speak'}
    </button>
  );
}

export function ChatWindow({ profile, chatSession, onUpdateDoc }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [input, setInput] = useState('');

  const [isTyping, setIsTyping] = useState(false);
  const [diceCount, setDiceCount] = useState(1);
  const [selectedModifier, setSelectedModifier] = useState<string>('none');
  const [activeRoll, setActiveRoll] = useState<{
    sides: number;
    count: number;
    modifier: number;
    modName?: string;
    dc?: number;
    rolls: number[];
    total: number;
    finalTotal: number;
    isAnimating: boolean;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getModifierValue = (modName: string) => {
    if (modName === 'none') return 0;
    const stats = profile.keyStats;
    if (!stats) return 0;
    let score = 10;
    switch (modName) {
      case 'STR': score = stats.strength; break;
      case 'DEX': score = stats.dexterity; break;
      case 'CON': score = stats.constitution; break;
      case 'INT': score = stats.intelligence; break;
      case 'WIS': score = stats.wisdom; break;
      case 'CHA': score = stats.charisma; break;
    }
    return Math.floor((score - 10) / 2);
  };

  useEffect(() => {
    get('chatMessages').then((savedMessages) => {
      if (savedMessages && savedMessages.length > 0) {
        setMessages(savedMessages);
      } else {
        setMessages([
          {
            role: 'model',
            content: profile.startingScenario 
              ? `*The scene is set.* \n\n${profile.startingScenario}\n\nWhat do you do?`
              : `Welcome, ${profile.name}. Your adventure begins now. Where do you find yourself, and what are you doing?`,
          },
        ]);
      }
      setIsHistoryLoaded(true);
    });
  }, [profile.startingScenario, profile.name]);

  useEffect(() => {
    if (isHistoryLoaded) {
      set('chatMessages', messages).catch(console.error);
    }
  }, [messages, isHistoryLoaded]);

  const scrollToBottom = (smooth = true) => {

    if (scrollContainerRef.current) {
      if (smooth) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom(!isTyping);
  }, [messages, isTyping]);

  const sendMessage = React.useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsTyping(true);

    try {
      const responseStream = await chatSession.sendMessageStream({ message: text });
      
      let fullResponse = '';
      setMessages((prev) => [...prev, { role: 'model', content: '' }]);

      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullResponse += chunk.text;
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIdx = newMessages.length - 1;
            newMessages[lastIdx] = { ...newMessages[lastIdx], content: fullResponse };
            return newMessages;
          });
        }
      }


      let finalDisplayContent = fullResponse;
      const updateRegex = /<UPDATE_DOC name="([^"]+)">([\s\S]*?)<\/UPDATE_DOC>/g;
      let match;
      while ((match = updateRegex.exec(fullResponse)) !== null) {
        if (onUpdateDoc) {
          onUpdateDoc(match[1], match[2].trim());
        }
        finalDisplayContent = finalDisplayContent.replace(match[0], '');
      }

      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = finalDisplayContent.trim();
        return newMessages;
      });

    } catch (error: any) {
      console.error('Chat error:', error);
      let errorMessage = '*A strange magical interference prevents me from speaking...*';
      
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = '*The magical weave is exhausted. We must rest before speaking again. (API Quota Exceeded)*';
      }

      setMessages((prev) => [
        ...prev,
        { role: 'model', content: errorMessage },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [chatSession, isTyping, onUpdateDoc]);


  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  const handleRoll = React.useCallback((sides: number, count: number = 1, modifier: number = 0, modName?: string, dc?: number) => {
    const rolls = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      total += roll;
    }
    const finalTotal = total + modifier;
    
    setActiveRoll({
      sides, count, modifier, modName, dc, rolls, total, finalTotal, isAnimating: true
    });

    setTimeout(() => {
      setActiveRoll(prev => prev ? { ...prev, isAnimating: false } : null);
      
      setTimeout(() => {
        const modifierText = modifier !== 0 ? ` ${modifier > 0 ? '+' : '-'} ${Math.abs(modifier)}${modName ? ` (${modName})` : ''}` : '';
        let rollText = count > 1 
          ? `*Rolled ${count}d${sides}${modifierText}: [${rolls.join(', ')}]${modifierText} = ${finalTotal}*` 
          : `*Rolled a ${finalTotal} on a d${sides}${modifierText}*`;
          
        if (dc !== undefined) {
          if (finalTotal >= dc) {
            rollText += `\n\n**Success!** (Meets or beats DC ${dc})`;
          } else {
            rollText += `\n\n**Failure!** (Misses DC ${dc})`;
          }
        }
        sendMessage(rollText);
        setActiveRoll(null);
      }, 1500);
    }, 1200);
  }, [sendMessage]);




const MessageContent = React.memo(({ content, isUser, profile, handleRoll, sendMessage, isTyping }: { 
  content: string, 
  isUser: boolean,
  profile: CharacterProfile,
  handleRoll: (sides: number, count: number, modifier: number, modName?: string, dc?: number) => void,
  sendMessage: (text: string) => void,
  isTyping: boolean
}) => {
  const rollRegex = /\[ROLL:(\d*)d(\d+)(?:([+-])(\w+))?(?:\|([a-zA-Z\s]+))?(?:\|(?:DC|AC):(\d+))?\]/gi;
  const suggestionRegex = /\[SUGGESTION:(.*?)\]/gi;
  
  const rollMatches = Array.from(content.matchAll(rollRegex));
  const suggestionMatches = Array.from(content.matchAll(suggestionRegex));
  
  const bodyContent = (rollMatches.length === 0 && suggestionMatches.length === 0) 
    ? content 
    : content.replace(rollRegex, '').replace(suggestionRegex, '').trim();

  return (
    <div className="space-y-4">
      <div className={cn(
        "prose prose-sm max-w-none prose-p:leading-relaxed prose-em:text-amber-500/80 prose-em:not-italic",
        isUser ? "prose-invert" : "text-zinc-300"
      )}>
        <Markdown>{bodyContent}</Markdown>
      </div>
      
      {!isUser && (rollMatches.length > 0 || suggestionMatches.length > 0) && (
        <div className="flex flex-col gap-4 pt-4 mt-2 border-t border-amber-900/20">
          {rollMatches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {rollMatches.map((match, i) => {
                const count = match[1] ? parseInt(match[1]) : 1;
                const sides = parseInt(match[2]);
                const sign = match[3];
                const modStr = match[4];
                const sourceStr = match[5];
                const dcStr = match[6];
                const dc = dcStr ? parseInt(dcStr) : undefined;
                
                let modifier = 0;
                let modName = '';
                if (modStr) {
                  if (!isNaN(parseInt(modStr))) {
                    modifier = parseInt(modStr);
                  } else {
                    modName = modStr.toUpperCase();
                    const stats = profile.keyStats;
                    if (stats) {
                      let score = 10;
                      if (modName.includes('STR')) score = stats.strength;
                      else if (modName.includes('DEX')) score = stats.dexterity;
                      else if (modName.includes('CON')) score = stats.constitution;
                      else if (modName.includes('INT')) score = stats.intelligence;
                      else if (modName.includes('WIS')) score = stats.wisdom;
                      else if (modName.includes('CHA')) score = stats.charisma;
                      modifier = Math.floor((score - 10) / 2);
                    }
                  }
                  if (sign === '-') modifier = -modifier;
                }
                
                const displayModName = sourceStr ? sourceStr.trim() : modName;
                const diceLabel = `${count > 1 ? count : ''}d${sides}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}${displayModName ? ` (${displayModName})` : ''}${dc !== undefined ? ` (DC ${dc})` : ''}`;
                
                return (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRoll(sides, count, modifier, displayModName || undefined, dc)}
                    disabled={isTyping}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-950/40 hover:bg-amber-900/60 text-amber-500 border border-amber-500/30 hover:border-amber-500/60 rounded-xl text-sm font-display tracking-widest font-bold transition-all disabled:opacity-50 shadow-[0_4px_10px_rgba(0,0,0,0.3)]"
                  >
                    <Dices className="w-4 h-4" />
                    ROLL {diceLabel}
                  </motion.button>
                );
              })}
            </div>
          )}
          
          {suggestionMatches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestionMatches.map((match, i) => (
                <motion.button
                  key={`sug-${i}`}
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => sendMessage(match[1].trim())}
                  disabled={isTyping}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800/80 text-zinc-400 border border-amber-900/20 hover:border-amber-500/40 rounded-xl text-sm transition-all disabled:opacity-50 text-left group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500/50 group-hover:text-amber-500 shrink-0 transition-colors" />
                  <span className="font-serif italic">{match[1].trim()}</span>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}
      {!isUser && <TTSButton text={bodyContent} />}
    </div>
  );
});

const MessageItem = React.memo(({ message, profile, handleRoll, sendMessage, isTyping, index }: {
  message: Message,
  profile: CharacterProfile,
  handleRoll: any,
  sendMessage: any,
  isTyping: boolean,
  index: number
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: message.role === 'user' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex flex-col gap-2 max-w-[85%]",
        message.role === 'user' ? "ml-auto items-end" : "items-start"
      )}
    >
      <div className="flex items-center gap-2 px-1">
        {message.role === 'model' && (
          <div className="font-display font-bold text-amber-600 text-[10px] tracking-widest uppercase mb-1">Dungeon Master</div>
        )}
        {message.role === 'user' && (
          <div className="font-display font-bold text-zinc-500 text-[10px] tracking-widest uppercase mb-1">{profile.name}</div>
        )}
      </div>
      <div
        className={cn(
          "p-6 rounded-3xl relative shadow-xl overflow-hidden",
          message.role === 'user'
            ? "bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tr-none"
            : "fantasy-border border-amber-900/30 text-zinc-300 rounded-tl-none parchment-texture"
        )}
      >
        {message.role === 'model' && (
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] opacity-5 pointer-events-none"></div>
        )}
        <div className="relative z-10">
          <MessageContent 
            content={message.content} 
            isUser={message.role === 'user'} 
            profile={profile}
            handleRoll={handleRoll}
            sendMessage={sendMessage}
            isTyping={isTyping}
          />
        </div>
      </div>
    </motion.div>
  );
});


  return (
    <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden backdrop-blur-[2px]">
      {/* Background Decorative Element */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-10 pointer-events-none"></div>
      
      {/* Dice Roll Overlay */}
      <AnimatePresence>
        {activeRoll && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="fantasy-border p-10 rounded-[2.5rem] shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col items-center text-center max-w-sm w-full mx-4"
            >
              <h3 className="text-2xl font-display font-bold text-amber-500 mb-8 tracking-widest uppercase">
                THE FATES DECIDE
              </h3>
              
              <div className="relative w-40 h-40 flex items-center justify-center mb-10">
                <motion.div 
                  animate={activeRoll.isAnimating ? { rotate: 360 } : { rotate: 0 }}
                  transition={activeRoll.isAnimating ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
                  className="absolute inset-0 bg-amber-900/20 rounded-3xl border-2 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative z-10 text-7xl font-display font-bold text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                >
                  {activeRoll.isAnimating ? "?" : activeRoll.total}
                </motion.div>
              </div>

              {!activeRoll.isAnimating && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 w-full"
                >
                  <div className="text-amber-500/60 font-serif italic text-sm">
                    {activeRoll.count}d{activeRoll.sides}
                    {activeRoll.modifier !== 0 && (activeRoll.modifier > 0 ? ` + ${activeRoll.modifier}` : ` - ${Math.abs(activeRoll.modifier)}`)}
                    {activeRoll.modName ? ` (${activeRoll.modName})` : ''}
                  </div>
                  
                  <div className="text-5xl font-display font-bold text-white tracking-widest">
                    {activeRoll.finalTotal}
                  </div>
                  
                  {activeRoll.dc !== undefined && (
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", bounce: 0.6 }}
                      className={cn(
                        "text-2xl font-display font-bold mt-6 py-3 px-6 rounded-xl tracking-[0.2em]",
                        activeRoll.finalTotal >= activeRoll.dc 
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
                          : "bg-red-950/40 text-red-400 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                      )}
                    >
                      {activeRoll.finalTotal >= activeRoll.dc ? "SUCCESS" : "FAILURE"}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar space-y-8"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-10">
            <ScrollText className="w-16 h-16 mb-4 text-amber-900" />
            <p className="font-serif italic text-lg">Your adventure begins here...</p>
          </div>
        ) : (
          messages.map((message, i) => (
            <MessageItem 
              key={i} 
              index={i} 
              message={message} 
              profile={profile} 
              handleRoll={handleRoll} 
              sendMessage={sendMessage} 
              isTyping={isTyping} 
            />
          ))
        )}

        {isTyping && (
          <div className="flex gap-2 items-center text-amber-900/60 font-display text-[10px] tracking-[0.2em] ml-2 uppercase animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            The Master is scribing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 pt-2 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Dice Toolbar */}
          <div className="flex items-center gap-2 px-2 overflow-x-auto hide-scrollbar">
            <div className="flex bg-zinc-950 rounded-xl p-1 border border-amber-900/20 shadow-inner">
              <span className="text-[10px] font-display font-bold text-amber-900/60 px-2 flex items-center tracking-widest">COUNT</span>
              <select 
                value={diceCount}
                onChange={(e) => setDiceCount(parseInt(e.target.value))}
                className="bg-transparent text-sm font-display text-amber-500 focus:outline-none border-none py-1 mr-2 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 10].map(n => <option key={n} value={n} className="bg-zinc-900">{n}</option>)}
              </select>
            </div>

            <div className="flex bg-zinc-950 rounded-xl p-1 border border-amber-900/20 shadow-inner">
              <span className="text-[10px] font-display font-bold text-amber-900/60 px-2 flex items-center tracking-widest uppercase">MOD</span>
              <select 
                value={selectedModifier}
                onChange={(e) => setSelectedModifier(e.target.value)}
                className="bg-transparent text-sm font-display text-amber-500 focus:outline-none border-none py-1 mr-2 cursor-pointer"
              >
                <option value="none" className="bg-zinc-900">None</option>
                <option value="STR" className="bg-zinc-900">STR</option>
                <option value="DEX" className="bg-zinc-900">DEX</option>
                <option value="CON" className="bg-zinc-900">CON</option>
                <option value="INT" className="bg-zinc-900">INT</option>
                <option value="WIS" className="bg-zinc-900">WIS</option>
                <option value="CHA" className="bg-zinc-900">CHA</option>
              </select>
            </div>

            <div className="h-6 w-px bg-amber-900/20 mx-1"></div>

            <div className="flex gap-2">
              {[20, 12, 10, 8, 6, 4].map(sides => (
                <motion.button
                  key={sides}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleRoll(sides, diceCount, getModifierValue(selectedModifier), selectedModifier !== 'none' ? selectedModifier : undefined)}
                  className="w-10 h-10 flex flex-col items-center justify-center rounded-xl bg-zinc-900 border border-amber-900/30 hover:border-amber-500/50 group transition-all"
                >
                  <span className="text-[10px] font-display font-bold text-amber-900/60 group-hover:text-amber-500/60">D</span>
                  <span className="text-xs font-display font-bold text-zinc-500 group-hover:text-amber-500 leading-none">{sides}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pb-2 hide-scrollbar overflow-x-auto">
            <button
              onClick={() => sendMessage("I look around to see what I can perceive.")}
              className="px-3 py-1.5 bg-zinc-900 border border-amber-900/30 text-amber-500/80 hover:text-amber-500 hover:border-amber-500/50 rounded-lg text-xs font-display tracking-widest uppercase transition-all whitespace-nowrap"
            >
              Look Around
            </button>
            <button
              onClick={() => sendMessage("I check my inventory and review my current condition.")}
              className="px-3 py-1.5 bg-zinc-900 border border-amber-900/30 text-amber-500/80 hover:text-amber-500 hover:border-amber-500/50 rounded-lg text-xs font-display tracking-widest uppercase transition-all whitespace-nowrap"
            >
              Check Status
            </button>
            <button
              onClick={() => sendMessage("I suggest we take a short rest here.")}
              className="px-3 py-1.5 bg-zinc-900 border border-amber-900/30 text-amber-500/80 hover:text-amber-500 hover:border-amber-500/50 rounded-lg text-xs font-display tracking-widest uppercase transition-all whitespace-nowrap"
            >
              Short Rest
            </button>
            <button
              onClick={() => sendMessage("I cautiously advance further into the area.")}
              className="px-3 py-1.5 bg-zinc-900 border border-amber-900/30 text-amber-500/80 hover:text-amber-500 hover:border-amber-500/50 rounded-lg text-xs font-display tracking-widest uppercase transition-all whitespace-nowrap"
            >
              Advance
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative group flex items-end">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-600/20 via-amber-400/20 to-amber-600/20 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-500"></div>
            <div className="relative flex items-end gap-2 bg-zinc-950 border border-amber-900/30 rounded-2xl p-2 pl-4 shadow-2xl w-full">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                    }
                  }
                }}
                rows={1}
                placeholder={`Speak to ${profile.name}... (Shift+Enter for new line)`}
                disabled={isTyping}
                className="flex-1 bg-transparent border-none focus:outline-none text-zinc-200 font-serif placeholder:text-zinc-600 py-3 resize-none custom-scrollbar"
                style={{ minHeight: '48px', maxHeight: '200px' }}
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!input.trim() || isTyping}
                className="bg-amber-600 hover:bg-amber-500 text-black p-3 rounded-xl transition-colors disabled:opacity-50 disabled:grayscale mb-1 shrink-0"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
