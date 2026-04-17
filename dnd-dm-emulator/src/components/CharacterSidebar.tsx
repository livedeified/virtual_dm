import React from 'react';
import { CharacterProfile } from '../services/gemini';
import { Shield, Sword, Heart, Brain, Zap, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface CharacterSidebarProps {
  profile: CharacterProfile;
}

export function CharacterSidebar({ profile }: CharacterSidebarProps) {
  const stats = [
    { label: 'STR', value: profile.keyStats?.strength || 10, icon: Sword, color: 'text-red-400' },
    { label: 'DEX', value: profile.keyStats?.dexterity || 10, icon: Zap, color: 'text-green-400' },
    { label: 'CON', value: profile.keyStats?.constitution || 10, icon: Heart, color: 'text-orange-400' },
    { label: 'INT', value: profile.keyStats?.intelligence || 10, icon: Brain, color: 'text-blue-400' },
    { label: 'WIS', value: profile.keyStats?.wisdom || 10, icon: Shield, color: 'text-indigo-400' },
    { label: 'CHA', value: profile.keyStats?.charisma || 10, icon: MessageCircle, color: 'text-pink-400' },
  ];

  const calculateModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : mod.toString();
  };

  return (
    <div className="w-80 bg-zinc-950/60 backdrop-blur-md border-r border-amber-900/40 h-full flex flex-col overflow-y-auto custom-scrollbar shadow-2xl relative z-10">
      <div className="p-8 border-b border-amber-900/20 bg-zinc-950/40 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none"></div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-3xl font-display font-bold text-amber-500 mb-2 tracking-tight group-hover:text-amber-400 transition-colors">
            {profile.name || 'Hero'}
          </h2>
          <p className="text-zinc-200 font-serif text-sm italic opacity-80">
            Level {profile.level || 1} {profile.race} {profile.characterClass}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="h-1px bg-amber-900/30 flex-1"></span>
            <p className="text-amber-900/60 font-display text-[9px] tracking-[0.3em] uppercase">{profile.alignment}</p>
            <span className="h-1px bg-amber-900/30 flex-1"></span>
          </div>
        </motion.div>
      </div>

      <div className="p-6 border-b border-amber-900/10">
        <h3 className="text-[10px] font-display font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">Vital Statistics</h3>
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.05, borderColor: 'rgba(245,158,11,0.3)' }}
              className="bg-zinc-900/50 rounded-xl p-3 flex flex-col items-center justify-center border border-amber-900/10 transition-all hover:shadow-[0_0_15px_rgba(245,158,11,0.05)]"
            >
              <stat.icon className={`w-3.5 h-3.5 mb-2 ${stat.color} opacity-70`} />
              <span className="text-[9px] text-zinc-600 font-display font-bold tracking-tighter">{stat.label}</span>
              <span className="text-lg font-display font-bold text-zinc-200">{stat.value}</span>
              <span className="text-[10px] text-amber-500/80 font-mono font-bold mt-1">
                {calculateModifier(stat.value)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="p-8 space-y-8 flex-1 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-[0.98]">
        <Section title="Epitaph & Traits" content={profile.personalityTraits} />
        <Section title="Guiding Ideals" content={profile.ideals} />
        <Section title="Sacred Bonds" content={profile.bonds} />
        <Section title="Character Flaws" content={profile.flaws} />
        <Section title="Physical Form" content={profile.appearance} />
        <Section title="Ancient Lore" content={profile.backstory} />
      </div>
    </div>
  );
}

function Section({ title, content }: { title: string; content?: string }) {
  if (!content) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-3">
        <h3 className="text-[10px] font-display font-bold text-amber-600/60 uppercase tracking-[0.3em] whitespace-nowrap">{title}</h3>
        <div className="h-1px bg-amber-900/20 w-full"></div>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed font-serif italic">{content}</p>
    </motion.div>
  );
}
