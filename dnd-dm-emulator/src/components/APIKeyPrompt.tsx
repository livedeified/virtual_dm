import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Sparkles, ExternalLink, ArrowRight, Cpu, Loader2 } from 'lucide-react';
import { AIProviderType } from '../services/gemini';
import { initLocalModel } from '../services/webllm';

interface APIKeyPromptProps {
  onSetupComplete: (key: string | null, provider: AIProviderType) => void;
}

export function APIKeyPrompt({ onSetupComplete }: APIKeyPromptProps) {
  const [provider, setProvider] = useState<AIProviderType>('webllm');
  const [inputKey, setInputKey] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progressText, setProgressText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (provider === 'gemini') {
      if (inputKey.trim()) {
        onSetupComplete(inputKey.trim(), 'gemini');
      }
    } else {
      setIsDownloading(true);
      try {
        await initLocalModel((report) => {
          setProgressText(report.text);
        });
        onSetupComplete(null, 'webllm');
      } catch (err) {
        console.error(err);
        setProgressText('Failed to initialize local model. Does your browser support WebGPU?');
      } finally {
        setIsDownloading(false);
      }
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)] from-amber-900/10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl fantasy-border p-6 sm:p-10 rounded-3xl bg-zinc-950/80 backdrop-blur-xl shadow-2xl relative"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-10 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Sparkles className="w-10 h-10 text-amber-500" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-display font-bold text-amber-500 tracking-widest uppercase">
              Choose Your Engine
            </h2>
            <p className="text-zinc-400 font-serif italic text-sm leading-relaxed">
              Select how you want to power your Dungeon Master. 
              Cloud is faster, Local is 100% free and private.
            </p>
          </div>

          <div className="flex gap-4 w-full pt-4">
            {/* Cloud (Gemini) option removed to enforce local mode */}
            {/*
            <button
              onClick={() => setProvider('gemini')}
              className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                provider === 'gemini' 
                  ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-amber-500/50'
              }`}
            >
              <Cloud className={`w-8 h-8 ${provider === 'gemini' ? 'text-amber-500' : 'text-zinc-500'}`} />
              <div className="text-sm font-display tracking-widest uppercase font-bold text-zinc-200">Cloud (Gemini)</div>
              <div className="text-[10px] text-zinc-500 uppercase">Requires API Key</div>
            </button>
            */}

            <button
              onClick={() => setProvider('webllm')}
              className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                provider === 'webllm' 
                  ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-amber-500/50'
              }`}
            >
              <Cpu className={`w-8 h-8 ${provider === 'webllm' ? 'text-amber-500' : 'text-zinc-500'}`} />
              <div className="text-sm font-display tracking-widest uppercase font-bold text-zinc-200">Local (Gemma)</div>
              <div className="text-[10px] text-zinc-500 uppercase">100% Free / WebGPU</div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4 pt-4">
            <AnimatePresence mode="wait">
              {provider === 'gemini' ? (
                <motion.div
                  key="gemini"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-xl blur opacity-50 group-focus-within:opacity-100 transition duration-500"></div>
                    <input
                      type="password"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="Paste your Gemini API Key..."
                      className="relative w-full bg-zinc-900 border border-amber-900/50 rounded-xl px-5 py-4 text-zinc-200 font-mono text-sm focus:outline-none focus:border-amber-500/50 shadow-inner"
                    />
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={!inputKey.trim()}
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-black font-display font-bold uppercase tracking-widest py-4 rounded-xl transition-colors disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                  >
                    <Key className="w-5 h-5" />
                    Awaken the Master
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                  
                  <div className="pt-2">
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-xs font-display tracking-wider text-zinc-500 hover:text-amber-400 transition-colors uppercase group"
                    >
                      Get a free API key from Google AI Studio
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </a>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="webllm"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-amber-900/20 border border-amber-900/50 rounded-xl p-4 text-left space-y-2">
                    <p className="text-xs text-zinc-300 font-serif">
                      <strong className="text-amber-500 font-sans">Warning:</strong> Local mode downloads a ~1.5GB model (Gemma 2B) to your browser cache on first run. It requires a modern device with WebGPU support.
                    </p>
                    <p className="text-xs text-zinc-400 font-serif">
                      Voice mode will fallback to standard browser text-to-speech.
                    </p>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isDownloading}
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-black font-display font-bold uppercase tracking-widest py-4 rounded-xl transition-colors disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Initializing Engine...
                      </>
                    ) : (
                      <>
                        <Cpu className="w-5 h-5" />
                        Download & Start
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>

                  {progressText && (
                    <div className="text-[10px] text-amber-500 font-mono tracking-wider break-words max-w-full px-4">
                      {progressText}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
