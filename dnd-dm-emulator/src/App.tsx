import React, { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { PDFUploader } from './components/PDFUploader';
import { CharacterSidebar } from './components/CharacterSidebar';
import { ChatWindow } from './components/ChatWindow';
import { LiveVoiceChat } from './components/LiveVoiceChat';
import { KnowledgeBaseUploader } from './components/KnowledgeBaseUploader';
import { APIKeyPrompt } from './components/APIKeyPrompt';
import { CombatHUD } from './components/CombatHUD';
import { WORLD_STATE_TEMPLATE, NPC_LEDGER_TEMPLATE, COMBAT_TRACKER_TEMPLATE, SESSION_LOG_TEMPLATE } from './lib/templates';
import { extractCharacterProfile, createDMChat, CharacterProfile, KnowledgeDocument, initGeminiClient } from './services/gemini';
import { Sparkles, RefreshCw, ScrollText, Swords, Wand2, Eye, Heart, Shield, Music, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initLocalModel, isEngineReady } from './services/webllm';
import { LocalEngineLoader } from './components/LocalEngineLoader';



const PREGEN_CHARACTERS = [
  {
    profile: {
      name: "Thorek Ironfist",
      race: "Dwarf",
      characterClass: "Fighter",
      level: 1,
      background: "Soldier",
      alignment: "Lawful Good",
      personalityTraits: "I face problems head-on. A simple, direct solution is the best path to success.",
      ideals: "Responsibility. I do what I must and obey just authority.",
      bonds: "I fight for those who cannot fight for themselves.",
      flaws: "I have little respect for anyone who is not a proven warrior.",
      appearance: "Broad shoulders, a thick braided beard, clad in heavy chainmail.",
      backstory: "A veteran of the Goblin Wars, Thorek travels the realm looking for a new purpose after his company was disbanded.",
      startingScenario: "You stand at the blood-stained gates of Fort Ironblood. A horde of goblins has just breached the outer wall, and the local militia is routing in a panic. As a seasoned veteran, it is up to you to rally the defenders, hold the gate, or carve a path through the vanguard to find the goblin chieftain orchestrating this chaotic assault.",
      keyStats: { strength: 16, dexterity: 10, constitution: 16, intelligence: 10, wisdom: 12, charisma: 9 }
    },
    icon: Swords,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    borderColor: "border-red-400/30",
  },
  {
    profile: {
      name: "Elowen Starweaver",
      race: "High Elf",
      characterClass: "Wizard",
      level: 1,
      background: "Sage",
      alignment: "Neutral Good",
      personalityTraits: "I use polysyllabic words that convey the impression of great erudition.",
      ideals: "Knowledge. The path to power and self-improvement is through study.",
      bonds: "I sold my soul for knowledge. I hope to do great deeds and win it back.",
      flaws: "I am easily distracted by the promise of information.",
      appearance: "Tall, slender, with silver hair and piercing blue eyes, wearing flowing blue robes.",
      backstory: "Elowen spent decades in the Great Library of Silverymoon before realizing true knowledge is found in the field.",
      startingScenario: "You are deep within the arcane archives of the Sunken Tower. Suddenly, the ancient runes on the central obelisk begin glowing an erratic, sickly purple, and the magical wards binding a captive fire elemental are shuddering and failing. You must decipher the arcane leakage, stabilize the wards, or prepare to combat the entity before it burns the library to ash.",
      keyStats: { strength: 8, dexterity: 14, constitution: 12, intelligence: 16, wisdom: 13, charisma: 10 }
    },
    icon: Wand2,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/30",
  },
  {
    profile: {
      name: "Finnick Nimblefingers",
      race: "Halfling",
      characterClass: "Rogue",
      level: 1,
      background: "Criminal",
      alignment: "Chaotic Neutral",
      personalityTraits: "I always have a plan for what to do when things go wrong.",
      ideals: "Freedom. Chains are meant to be broken, as are those who would forge them.",
      bonds: "I'm trying to pay off an old debt I owe to a generous benefactor.",
      flaws: "When I see something valuable, I can't think about anything but how to steal it.",
      appearance: "Short, curly brown hair, wearing dark leathers with many hidden pockets.",
      backstory: "Raised in the alleys of Waterdeep, Finnick learned early that a quick hand feeds a hungry stomach.",
      startingScenario: "The pouring rain masks the sound of your footsteps on the slick slate roofs of the Merchant District. You've successfully tracked the corrupt guildmaster to a heavily guarded warehouse, where he is currently meeting a secretive buyer. You need to gather intelligence from the skylight, slip inside undetected to secure the guild's ledger, or set up a devastating ambush.",
      keyStats: { strength: 8, dexterity: 17, constitution: 12, intelligence: 13, wisdom: 10, charisma: 14 }
    },
    icon: Eye,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    borderColor: "border-green-400/30",
  },
  {
    profile: {
      name: "Brother Kaelen",
      race: "Human",
      characterClass: "Cleric",
      level: 1,
      background: "Acolyte",
      alignment: "Neutral Good",
      personalityTraits: "I see omens in every event and action. The gods try to speak to us, we just need to listen.",
      ideals: "Charity. I always try to help those in need, no matter what the personal cost.",
      bonds: "I owe my life to the priest who took me in when my parents died.",
      flaws: "I judge others harshly, and myself even more severely.",
      appearance: "Shaved head, warm hazel eyes, wearing simple vestments marked with the symbol of Lathander.",
      backstory: "An orphan raised by the Morninglord's clergy, dispatched to bring light to the darkest corners of the realm.",
      startingScenario: "A plague of unnatural, clinging shadows has descended upon the village of Oakhaven. Several villagers are gripped by a terrifying slumber that no medicine can break. The Morninglord has guided you to a ruined shrine at the edge of the Whispering Woods, where strange, dark energy pulses visibly from a desecrated altar. You must cleanse the site and end the corruption.",
      keyStats: { strength: 14, dexterity: 9, constitution: 14, intelligence: 11, wisdom: 16, charisma: 11 }
    },
    icon: Heart,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    borderColor: "border-amber-400/30",
  },
  {
    profile: {
      name: "Kriv Nemmonis",
      race: "Dragonborn",
      characterClass: "Paladin",
      level: 1,
      background: "Noble",
      alignment: "Lawful Good",
      personalityTraits: "My eloquent flattery makes everyone I talk to feel like the most wonderful and important person in the world.",
      ideals: "Respect. I respect the expectations of my noble lineage.",
      bonds: "My loyalty to my sovereign is unwavering.",
      flaws: "I hide a truly scandalous secret that could ruin my family forever.",
      appearance: "Gleaming golden scales, wearing heavy plate armor bearing a noble crest.",
      backstory: "Exiled from his clan for a crime he didn't commit, Kriv seeks to restore his family's honor through heroic deeds.",
      startingScenario: "You have spent weeks tracking the infamous Bandit King to his fortified encampment in the craggy Vanguard Peaks. He has taken several captive villagers and his lieutenants are preparing a dark blood ritual on a cliff edge. Time is running out. You must burst into the camp, draw their attention to rescue the hostages, and smite the Bandit King before the ritual completes.",
      keyStats: { strength: 16, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 11, charisma: 15 }
    },
    icon: Shield,
    color: "text-indigo-400",
    bgColor: "bg-indigo-400/10",
    borderColor: "border-indigo-400/30",
  },
  {
    profile: {
      name: "Lilith Whisperwind",
      race: "Tiefling",
      characterClass: "Bard",
      level: 1,
      background: "Entertainer",
      alignment: "Chaotic Good",
      personalityTraits: "I change my mood or my mind as quickly as I change key in a song.",
      ideals: "Beauty. When I perform, I make the world better than it was.",
      bonds: "My instrument is my most treasured possession, and it reminds me of someone I love.",
      flaws: "I'm a sucker for a pretty face.",
      appearance: "Crimson skin, swept-back horns, carrying a beautifully crafted lute.",
      backstory: "Using her demonic heritage to add flair to her performances, Lilith wanders the Sword Coast looking for the greatest story ever told.",
      startingScenario: "You've successfully secured an invitation to the extravagant, decadent masked ball of Duke Veridian, a noble heavily suspected of treason. Rumors say his contact is mingling among the dancers tonight to exchange a magical cipher. The orchestra is playing a waltz, and the room is full of suspects in elaborate disguises. You must use your charm and performances to gather whispers, identify the traitorous contact, and secure the cipher without raising the guards' alarms.",
      keyStats: { strength: 10, dexterity: 15, constitution: 13, intelligence: 10, wisdom: 10, charisma: 17 }
    },
    icon: Music,
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
    borderColor: "border-pink-400/30",
  }
];

export default function App() {
  const [profile, setProfile] = useState<CharacterProfile | null>(null);
  const [chatSession, setChatSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>([]);
  const [isDocsLoaded, setIsDocsLoaded] = useState(false);
  const [mode, setMode] = useState<'text' | 'voice'>('voice');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [provider, setProvider] = useState<any>('webllm');
  const [isSetupComplete, setIsSetupComplete] = useState(() => !!localStorage.getItem('ai_provider'));
  const [isEngineLoaded, setIsEngineLoaded] = useState(false);



  useEffect(() => {
    const savedProvider = localStorage.getItem('ai_provider');
    if (savedProvider) {
      setProvider(savedProvider as any);
      if (savedProvider === 'webllm') {
        // We don't auto-init here anymore to allow the Setup screen to handle it with UI feedback
      } else {
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) {
          setApiKey(savedKey);
          initGeminiClient(savedKey);
        }
      }
    } else {
      setIsSetupComplete(false);
    }

    get('characterProfile').then(p => {
      if (p) {
        setProfile(p);
        // We will initialize the chat session once both profile and docs are ready
      }
    });


    get('knowledgeDocs')
      .then((docs) => {
        let currentDocs = docs || [];
        const requiredDocs = [
          { name: 'world_state.md', text: WORLD_STATE_TEMPLATE, mimeType: 'text/markdown' },
          { name: 'npc_ledger.md', text: NPC_LEDGER_TEMPLATE, mimeType: 'text/markdown' },
          { name: 'combat_tracker.md', text: COMBAT_TRACKER_TEMPLATE, mimeType: 'text/markdown' },
          { name: 'session_log.md', text: SESSION_LOG_TEMPLATE, mimeType: 'text/markdown' },
        ];

        let updated = false;
        for (const req of requiredDocs) {
          if (!currentDocs.find((d: any) => d.name === req.name)) {
            currentDocs.push(req);
            updated = true;
          }
        }

        setKnowledgeDocs(currentDocs);
        if (updated) {
          set('knowledgeDocs', currentDocs).catch(console.error);
        }
        setIsDocsLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to load knowledge docs from IndexedDB', err);
        setIsDocsLoaded(true);
      });
  }, []);

  // Initialize chat session once both profile and docs are loaded
  useEffect(() => {
    if (profile && isDocsLoaded && !chatSession) {
      const session = createDMChat(profile, knowledgeDocs, provider);
      setChatSession(session);
    }
  }, [profile, isDocsLoaded, chatSession, knowledgeDocs, provider]);

  const saveProfile = (p: CharacterProfile | null) => {
    setProfile(p);
    set('characterProfile', p).catch(console.error);
  };


  const handleSetupComplete = (key: string | null, newProvider: any) => {
    setProvider(newProvider);
    localStorage.setItem('ai_provider', newProvider);
    if (newProvider === 'gemini' && key) {
      localStorage.setItem('gemini_api_key', key);
      setApiKey(key);
      initGeminiClient(key);
    }
    setIsSetupComplete(true);
  };

  const clearSetup = () => {
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('ai_provider');
    setApiKey(null);
    setIsSetupComplete(false);
    saveProfile(null);
  };


  const handleDocsChange = (newDocs: KnowledgeDocument[]) => {
    setKnowledgeDocs(newDocs);
    set('knowledgeDocs', newDocs).catch(console.error);
    if (chatSession) {
      chatSession.updateDocs(newDocs);
    }
  };


  const handleUpload = async (base64Pdf: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const extractedProfile = await extractCharacterProfile(base64Pdf);
      saveProfile(extractedProfile);
      
      const session = createDMChat(extractedProfile, knowledgeDocs, provider);
      setChatSession(session);
    } catch (err: any) {
      console.error(err);
      if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
        setError('The magical weave is exhausted (API Quota Exceeded). Please try again later.');
      } else {
        setError('Failed to awaken character. Ensure the PDF is a valid D&D character sheet and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetCharacter = () => {
    saveProfile(null);
    setChatSession(null);
    setError(null);
  };


  const handleUpdateDoc = (docName: string, newContent: string) => {
    const newDocs = [...knowledgeDocs];
    const idx = newDocs.findIndex(d => d.name === docName);
    if (idx >= 0) {
      newDocs[idx] = { ...newDocs[idx], text: newContent };
    } else {
      newDocs.push({ name: docName, text: newContent, mimeType: 'text/markdown' });
    }
    handleDocsChange(newDocs);
  };

  if (!isSetupComplete) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans flex flex-col">
        <APIKeyPrompt onSetupComplete={handleSetupComplete} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans flex flex-col overflow-hidden relative">
      {provider === 'webllm' && !isEngineLoaded && !isEngineReady() && (
        <LocalEngineLoader onComplete={() => setIsEngineLoaded(true)} />
      )}

      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.img 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.75, scale: 1 }}
          transition={{ duration: 3 }}
          src="https://images.unsplash.com/photo-1618331835717-801e976710b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
          alt="Vibrant Magical Realm" 
          className="w-full h-full object-cover mix-blend-screen"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/20 to-zinc-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_var(--tw-gradient-to)_100%)] from-transparent to-amber-900/30" />
      </div>

      <header className="h-20 border-b border-amber-500/30 bg-zinc-950/60 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-20 shadow-2xl relative">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.6)]">
            <Sparkles className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 drop-shadow-sm">
            VOICE DUNGEON MASTER
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-900/80 rounded-xl p-1 border border-amber-500/30 shadow-inner backdrop-blur-sm">
            <button 
              onClick={() => setMode('text')} 
              title="Text Mode"
              className={`p-2 rounded-lg transition-all duration-300 ${mode === 'text' ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'text-zinc-400 hover:text-amber-400'}`}
            >
              <ScrollText className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setMode('voice')} 
              title="Voice Mode"
              className={`p-2 rounded-lg transition-all duration-300 ${mode === 'voice' ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'text-zinc-400 hover:text-amber-400'}`}
            >
              <Music className="w-5 h-5" />
            </button>
          </div>
          {profile && (
            <button 
              onClick={resetCharacter}
              title="New Quest"
              className="p-2.5 rounded-xl bg-zinc-900/80 border border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-black transition-all duration-300 group shadow-lg backdrop-blur-sm"
            >
              <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            </button>
          )}
          {isSetupComplete && (
            <button 
              onClick={clearSetup}
              title="API Settings"
              className="p-2.5 rounded-xl bg-zinc-900/80 border border-amber-500/30 text-zinc-400 hover:bg-amber-500 hover:text-black transition-all duration-300 group shadow-lg backdrop-blur-sm"
            >
              <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
            </button>
          )}
        </div>
      </header>

      <CombatHUD document={knowledgeDocs.find(d => d.name === 'combat_tracker.md')} />

      <main className="flex-1 overflow-hidden relative z-10 flex">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/90 text-red-200 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 border border-red-500/50">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-300 hover:text-white font-bold">×</button>
          </div>
        )}

        {!profile ? (
          <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center justify-center gap-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)] from-amber-900/5">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl text-center space-y-4"
            >
              <h2 className="text-5xl font-display font-bold text-amber-500 tracking-tighter drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]">
                CHOOSE YOUR PATH
              </h2>
              <p className="text-zinc-400 font-serif text-lg leading-relaxed max-w-md mx-auto italic">
                The realm of Faerûn awaits. Begin your journey by presenting your scrolls of identity.
              </p>
            </motion.div>

            {provider !== 'webllm' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full max-w-2xl p-8 rounded-3xl fantasy-border"
              >
                <PDFUploader onUpload={handleUpload} isLoading={isLoading} />
              </motion.div>
            )}

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-2xl flex flex-col items-center gap-6"
            >
              <div className="flex items-center gap-4 w-full max-w-sm mb-2">
                <div className="h-px flex-1 bg-amber-900/30"></div>
                <span className="text-amber-900/50 font-display text-xs tracking-[0.3em] uppercase">Or Choose A Hero</span>
                <div className="h-px flex-1 bg-amber-900/30"></div>
              </div>

              <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {PREGEN_CHARACTERS.map((pregen, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.03, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      saveProfile(pregen.profile);
                      setChatSession(createDMChat(pregen.profile, knowledgeDocs, provider));
                    }}

                    className={`group relative p-5 overflow-hidden rounded-2xl bg-zinc-950/80 border ${pregen.borderColor} backdrop-blur-sm text-left flex flex-col gap-3 shadow-lg hover:shadow-2xl transition-all`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-zinc-900/50 pointer-events-none"></div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)] from-amber-500/5 transition-opacity duration-500 pointer-events-none"></div>
                    
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`p-3 rounded-xl ${pregen.bgColor} border ${pregen.borderColor}`}>
                        <pregen.icon className={`w-5 h-5 ${pregen.color}`} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-amber-500 tracking-wider text-sm">{pregen.profile.name}</h3>
                        <p className="text-zinc-400 font-serif italic text-xs">{pregen.profile.race} {pregen.profile.characterClass}</p>
                      </div>
                    </div>
                    
                    <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2 relative z-10">
                      {pregen.profile.backstory}
                    </p>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="w-full max-w-2xl"
            >
              {isDocsLoaded ? (
                <div className="fantasy-border rounded-3xl p-1">
                  <KnowledgeBaseUploader documents={knowledgeDocs} onDocumentsChange={handleDocsChange} />
                </div>
              ) : (
                <div className="bg-zinc-950 border border-amber-900/20 rounded-3xl p-6 shadow-2xl flex items-center justify-center h-48">
                  <div className="animate-pulse text-amber-900/50 font-display tracking-widest uppercase text-xs">Unrolling Tomes...</div>
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="flex-1 flex h-full">
            <div className="hidden md:block">
              <CharacterSidebar profile={profile} />
            </div>
            {mode === 'text' ? (
              <ChatWindow profile={profile} chatSession={chatSession} onUpdateDoc={handleUpdateDoc} />
            ) : (
              <LiveVoiceChat profile={profile} provider={provider} />
            )}

          </div>
        )}
      </main>
    </div>
  );
}
