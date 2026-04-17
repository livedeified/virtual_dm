import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, Cpu, AlertTriangle } from 'lucide-react';
import { initLocalModel, isEngineReady } from '../services/webllm';

interface LocalEngineLoaderProps {
  onComplete: () => void;
}

export function LocalEngineLoader({ onComplete }: LocalEngineLoaderProps) {
  const [progress, setProgress] = useState('Initializing WebGPU...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEngineReady()) {
      onComplete();
      return;
    }

    initLocalModel((report) => {
      setProgress(report.text);
    })
    .then(() => {
      onComplete();
    })
    .catch((err) => {
      console.error(err);
      setError('Failed to initialize local model. Please ensure your browser supports WebGPU and you have enough RAM (~8GB).');
    });
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950/90 backdrop-blur-xl flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full fantasy-border p-10 rounded-3xl bg-zinc-900 shadow-2xl text-center space-y-6"
      >
        <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 inline-block">
          {error ? (
            <AlertTriangle className="w-10 h-10 text-red-500" />
          ) : (
            <Cpu className="w-10 h-10 text-amber-500 animate-pulse" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-amber-500 tracking-widest uppercase">
            {error ? 'Engine Error' : 'Awakening Engine'}
          </h2>
          <p className="text-zinc-400 font-serif italic text-sm">
            {error || 'Summoning the local intelligence from your device...'}
          </p>
        </div>

        {!error ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              <div className="text-[10px] text-amber-500/80 font-mono tracking-wider break-words max-w-full px-4">
                {progress}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl text-red-400 text-xs font-serif">
            {error}
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 block w-full py-2 bg-red-500 text-black font-display font-bold uppercase rounded-lg hover:bg-red-400 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
