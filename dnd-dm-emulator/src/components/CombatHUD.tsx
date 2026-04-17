import React from 'react';
import { Swords, Shield, Heart, Skull, Activity, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { KnowledgeDocument } from '../services/gemini';

interface CombatHUDProps {
  document?: KnowledgeDocument;
}

export function CombatHUD({ document }: CombatHUDProps) {
  if (!document || !document.text) return null;

  const text = document.text;
  
  // Parse general combat info
  const statusMatch = text.match(/\*\*Encounter Status:\*\*\s*(Active|Inactive|\[Active\]|\[Inactive\])/i);
  const rawStatus = statusMatch?.[1]?.replace(/[\[\]]/g, '')?.toLowerCase() || 'inactive';
  const isActive = rawStatus === 'active';
  
  if (!isActive) return null;

  const roundMatch = text.match(/\*\*Current Round:\*\*\s*(\d+)/i);
  const round = roundMatch ? roundMatch[1] : '0';
  
  const turnMatch = text.match(/\*\*Current Turn:\*\*\s*(.+)/i);
  const currentTurn = turnMatch ? turnMatch[1].replace(/[\[\]\*_]/g, '').trim() : 'N/A';

  // Parse initiative table
  // Match lines that start with a pipe character
  const tableLines = text.split('\n').filter(line => line.trim().startsWith('|'));
  
  // We expect at least header + separator. Actual entities start at index 2.
  const entitiesLines = tableLines.length >= 2 ? tableLines.slice(2) : [];
  
  const entities = entitiesLines.map(line => {
    // split by pipe, ignore empty first/last parts from markdown table format
    const cols = line.split('|').map(c => c.trim());
    // actual columns start at index 1 because of leading pipe
    if (cols.length >= 6) {
      const init = cols[1];
      const name = cols[2];
      const hpStr = cols[3];
      const ac = cols[4];
      const conditions = cols[5];
      
      // Parse HP for health bar (e.g. "45/50")
      let curHp = 0;
      let maxHp = 0;
      let hpPercent = 100;
      
      const hpParts = hpStr.split('/');
      if (hpParts.length === 2) {
        curHp = parseInt(hpParts[0].replace(/\D/g, '')) || 0;
        maxHp = parseInt(hpParts[1].replace(/\D/g, '')) || 1;
        hpPercent = Math.max(0, Math.min(100, (curHp / maxHp) * 100));
      } else {
        curHp = parseInt(hpStr) || 0;
        maxHp = curHp;
      }
      
      // Don't render empty rows
      if (init === '-' && name === '-') return null;

      const isCurrentTurn = currentTurn.toLowerCase() === name.toLowerCase();

      return { init, name, hpStr, curHp, maxHp, hpPercent, ac, conditions, isCurrentTurn };
    }
    return null;
  }).filter(Boolean);

  if (entities.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed right-8 top-24 w-80 bg-zinc-950/80 backdrop-blur-xl border border-red-900/50 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.15)] overflow-hidden z-40 flex flex-col max-h-[calc(100vh-8rem)]"
      >
        <div className="bg-gradient-to-r from-red-950/80 to-zinc-950/80 p-4 border-b border-red-900/50 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-red-500">
              <Swords className="w-5 h-5" />
              <h3 className="font-display font-bold tracking-widest text-sm uppercase">Active Combat</h3>
            </div>
            <div className="flex items-center gap-1 bg-red-500/10 text-red-400 px-2 py-1 rounded text-xs font-bold border border-red-500/20">
              <Clock className="w-3 h-3" />
              RND {round}
            </div>
          </div>
          <div className="text-xs text-zinc-400 font-serif">
            Current Turn: <span className="text-zinc-100 font-bold">{currentTurn}</span>
          </div>
        </div>

        <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-2">
          {entities.map((ent: any, idx) => (
            <motion.div 
              key={idx}
              layout
              className={`p-3 rounded-xl border transition-all ${
                ent.isCurrentTurn 
                  ? 'bg-red-900/20 border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.2)]' 
                  : 'bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 flex items-center justify-center rounded-md font-display font-bold text-xs ${ent.isCurrentTurn ? 'bg-red-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                    {ent.init}
                  </div>
                  <span className={`font-serif font-bold text-sm truncate max-w-[120px] ${ent.isCurrentTurn ? 'text-red-400' : 'text-zinc-200'}`}>
                    {ent.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20" title="Armor Class">
                    <Shield className="w-3 h-3" /> {ent.ac}
                  </div>
                </div>
              </div>
              
              {/* HP Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold tracking-widest text-zinc-500">
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-emerald-500" /> HP</span>
                  <span>{ent.hpStr}</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${ent.hpPercent}%` }}
                    className={`h-full rounded-full ${
                      ent.hpPercent > 50 ? 'bg-emerald-500' : ent.hpPercent > 20 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>

              {ent.conditions && ent.conditions !== '-' && ent.conditions.toLowerCase() !== 'none' && (
                <div className="mt-2 text-[10px] text-zinc-400 flex items-start gap-1">
                  <Activity className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                  <span className="italic leading-tight">{ent.conditions}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
