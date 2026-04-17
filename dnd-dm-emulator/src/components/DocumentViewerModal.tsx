import React from 'react';
import { X, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { KnowledgeDocument } from '../services/gemini';

interface DocumentViewerModalProps {
  document: KnowledgeDocument | null;
  onClose: () => void;
}

export function DocumentViewerModal({ document, onClose }: DocumentViewerModalProps) {
  if (!document) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12"
      >
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-full flex flex-col bg-zinc-950 border border-amber-900/30 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.1)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-amber-900/20 bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-xl font-display font-bold text-amber-500 tracking-wider">
                {document.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] opacity-5 pointer-events-none"></div>
            <div className="prose prose-invert prose-amber max-w-none relative z-10 font-serif">
              {document.text ? (
                <Markdown>{document.text}</Markdown>
              ) : document.base64 ? (
                <div className="flex items-center justify-center h-64 text-zinc-500 italic">
                  Cannot render binary files. Please download to view.
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-zinc-500 italic">
                  Document is empty.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
