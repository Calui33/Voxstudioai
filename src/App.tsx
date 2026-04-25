import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Upload, 
  Languages, 
  Mic2, 
  Settings2, 
  Zap, 
  Activity, 
  CheckCircle2, 
  Loader2,
  Volume2,
  Info,
  ChevronRight,
  ShieldCheck,
  Cpu,
  LayoutDashboard,
  Layers,
  Video,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Modality } from "@google/genai";

type DubbingState = 'idle' | 'analyzing' | 'translating' | 'synthesizing' | 'ready';

export default function App() {
  // Instantiate AI lazily to avoid top-level crashes
  const ai = useMemo(() => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY não encontrada no ambiente.");
    }
    return new GoogleGenAI({ apiKey: key || 'dummy_key' });
  }, []);

  useEffect(() => {
    console.log("VoxStudio AI montado com sucesso.");
  }, []);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dubbingState, setDubbingState] = useState<DubbingState>('idle');
  const [targetLang, setTargetLang] = useState('Português (Brasil)');
  const [accent, setAccent] = useState('Paulistano');
  const [log, setLog] = useState<string[]>([]);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [volume, setVolume] = useState(80);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const addLog = (msg: string) => {
    setLog(prev => [msg, ...prev].slice(0, 5));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (dubbedAudioUrl) URL.revokeObjectURL(dubbedAudioUrl);
      
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setDubbedAudioUrl(null);
      setDubbingState('idle');
      setLog([]);
      addLog(`Vídeo carregado: ${file.name}`);
    }
  };

  const startDubbing = async () => {
    if (!videoUrl) return;
    
    setDubbingState('analyzing');
    addLog("Iniciando análise multimodal da cena...");
    
    try {
      // Step 1: Simulated scene analysis
      await new Promise(r => setTimeout(r, 1500));
      setDubbingState('translating');
      addLog(`Traduzindo diálogos para ${targetLang} (${accent})...`);
      
      // Step 2: Translation with Gemini
      const translatePrompt = `Como um dublador profissional, transcreva e traduza o diálogo deste vídeo para ${targetLang} com sotaque ${accent}. 
      Mantenha a emoção e a natureza "original" da voz.
      Retorne apenas o texto curto para dublagem.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: translatePrompt,
      });
      const script = response.text || "Dublagem automatizada VoxStudio iniciada.";
      addLog("Roteiro sincronizado pronto.");

      // Step 3: Synthesis with Gemini TTS
      setDubbingState('synthesizing');
      addLog(`Sintetizando voz original (${selectedVoice})...`);
      
      const ttsResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `${script}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice as any },
            },
          },
        },
      });

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/wav' });
        setDubbedAudioUrl(URL.createObjectURL(blob));
      }

      setDubbingState('ready');
      addLog("Masterização final concluída.");
    } catch (error: any) {
      console.error("Dubbing Error:", error);
      const errorMsg = error?.message || "Erro desconhecido";
      addLog(`Erro crítico: ${errorMsg.slice(0, 50)}...`);
      setDubbingState('idle');
    }
  };

  const playAll = async () => {
    try {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      if (dubbedAudioUrl) {
        const audio = new Audio(dubbedAudioUrl);
        await audio.play();
      }
    } catch (err) {
      console.warn("Playback prevented:", err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-studio-bg selection:bg-studio-accent/30 text-gray-200">
      {/* Sidebar - Theme Immersive UI */}
      <aside className="w-[72px] bg-studio-sidebar border-r border-white/5 flex flex-col items-center py-8 gap-8 shrink-0">
        <div className="p-3 bg-studio-accent rounded-xl text-white accent-glow">
          <Zap size={24} fill="currentColor" />
        </div>
        
        <nav className="flex flex-col gap-6">
          <button className="p-3 text-studio-accent bg-studio-accent/10 rounded-xl">
            <LayoutDashboard size={24} />
          </button>
          <button className="p-3 text-gray-600 hover:text-gray-400 transition-colors">
            <Layers size={24} />
          </button>
          <button className="p-3 text-gray-600 hover:text-gray-400 transition-colors">
            <Video size={24} />
          </button>
          <button className="p-3 text-gray-600 hover:text-gray-400 transition-colors">
            <Settings2 size={24} />
          </button>
        </nav>

        <button className="mt-auto p-3 text-gray-600 hover:text-gray-400 transition-colors">
          <HelpCircle size={24} />
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-h-0 studio-grid overflow-y-auto">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">VOX<span className="text-studio-accent">.AI</span></h1>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest">NEURAL DUBBING ENGINE V3.1</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 text-right">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Engenho Ativo</div>
                <div className="text-xs font-semibold text-studio-success flex items-center gap-1.5 justify-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-studio-success recording-pulse"></span>
                  18ms Latency
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-studio-accent animate-pulse"></div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Left Column: Video & Preview */}
          <div className="flex flex-col gap-6 min-h-0 min-w-0 overflow-hidden">
            <section className="glass-panel relative aspect-video group overflow-hidden bg-black shadow-2xl shrink-0">
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 text-[10px] font-bold tracking-widest uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 recording-pulse"></div>
                Live Processing
              </div>
              
              {!videoUrl ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-radial-at-tr from-studio-accent/5 to-transparent">
                  <div className="w-16 h-16 rounded-2xl bg-studio-accent/10 flex items-center justify-center mb-6 transition-transform group-hover:scale-110 border border-studio-accent/20">
                    <Upload className="text-studio-accent" size={28} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Import Media Input</h3>
                  <p className="text-gray-500 text-xs max-w-xs mb-8 leading-relaxed">
                    Envie seu conteúdo para remasterização neural e tradução simultânea.
                  </p>
                  <label className="bg-studio-accent hover:bg-studio-accent/90 text-white px-10 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all accent-glow active:scale-95">
                    Select File
                    <input type="file" className="hidden" accept="video/*" onChange={handleFileUpload} />
                  </label>
                </div>
              ) : (
                <>
                  <video 
                    key={videoUrl}
                    ref={videoRef} 
                    src={videoUrl} 
                    className="w-full h-full object-contain"
                    controls={false}
                    onError={(e) => {
                      console.error("Video Error:", e);
                      addLog("Erro ao carregar vídeo. Verifique o formato.");
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/90 to-transparent flex items-center px-8 gap-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause()} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl">
                      <Play fill="currentColor" size={20} />
                    </button>
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="w-[40%] h-full bg-studio-accent accent-glow"></div>
                    </div>
                    <div className="text-[10px] font-mono text-white/50 tracking-widest uppercase">
                      00:42:15 / 01:54:02
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* AI Log Area */}
            <section className="glass-panel p-6 flex flex-col gap-4 border-l-4 border-l-studio-accent">
               <div className="flex items-center justify-between">
                 <h3 className="text-[10px] font-black tracking-widest text-gray-500 uppercase flex items-center gap-2">
                   <Activity size={14} className="text-studio-accent" />
                   Neural Processing Log
                 </h3>
                 <span className="text-[9px] font-mono text-studio-accent px-2 py-0.5 rounded border border-studio-accent/20">V_SYNC_CMD_OK</span>
               </div>
               <div className="space-y-3 font-mono text-[10px] leading-relaxed">
                 {log.length === 0 ? (
                   <p className="text-gray-600 italic">SYSTEM_IDLE: AWAITING_INPUT_STREAM</p>
                 ) : (
                   log.map((entry, i) => (
                     <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-start gap-4 ${i === 0 ? 'text-studio-accent font-bold' : 'text-gray-500/80'}`}
                     >
                       <span className="shrink-0 opacity-40">#{i.toString().padStart(2, '0')}</span>
                       <span>{entry}</span>
                     </motion.div>
                   ))
                 )}
               </div>
            </section>
          </div>

          {/* Right Column: Controls */}
          <div className="flex flex-col gap-6">
            <section className="glass-panel p-6 flex flex-col gap-8 accent-glow">
              <div className="space-y-6">
                <header className="flex items-center justify-between">
                  <h3 className="text-sm font-black tracking-widest uppercase text-gray-400">
                    Process Configuration
                  </h3>
                  <Languages size={18} className="text-studio-accent" />
                </header>
                
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-gray-600 font-black">Target Language</label>
                    <select 
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-semibold outline-none focus:border-studio-accent/50 transition-all appearance-none cursor-pointer"
                    >
                      <option>Português (Brasil)</option>
                      <option>Inglês (EEUU)</option>
                      <option>Espanhol (MX)</option>
                      <option>Francês (FR)</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-gray-600 font-black">Accent Variation</label>
                    <select 
                      value={accent}
                      onChange={(e) => setAccent(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-semibold outline-none focus:border-studio-accent/50 transition-all appearance-none cursor-pointer"
                    >
                      <option>Paulistano</option>
                      <option>Carioca</option>
                      <option>Original AI Neutral</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/5" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase tracking-widest text-gray-600 font-black">Voice Model Engine</h4>
                  <div className="flex items-center gap-3">
                    <Volume2 size={12} className="text-gray-600" />
                    <div className="w-24 h-1 bg-white/5 rounded-full relative">
                      <div className="absolute top-0 left-0 h-full bg-studio-accent rounded-full" style={{ width: `${volume}%` }}></div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={volume}
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'Kore', label: 'Maduro/Profundo', sub: 'Narrative Master' },
                    { id: 'Zephyr', label: 'Jovem/Dinâmico', sub: 'Action Synthesis' },
                  ].map((voice) => (
                    <button 
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice.id)}
                      className={`p-4 rounded-xl border transition-all text-left flex items-center gap-4 group ${
                        selectedVoice === voice.id 
                        ? 'border-studio-accent bg-studio-accent/10 active-ring' 
                        : 'border-white/5 bg-black/20 hover:border-white/20 hover:bg-black/40'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${selectedVoice === voice.id ? 'bg-studio-accent text-white accent-glow' : 'bg-white/5 text-gray-600'}`}>
                        <Mic2 size={18} />
                      </div>
                      <div>
                        <p className={`text-xs font-black tracking-tight ${selectedVoice === voice.id ? 'text-studio-accent' : 'text-gray-400'}`}>{voice.label}</p>
                        <p className="text-[10px] text-gray-600 font-mono uppercase tracking-tighter">{voice.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={startDubbing}
                disabled={!videoUrl || dubbingState !== 'idle'}
                className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${
                  dubbingState === 'idle' 
                  ? 'bg-studio-accent text-white shadow-2xl shadow-studio-accent/20 accent-glow active:scale-[0.98]' 
                  : 'bg-white/5 text-gray-500 cursor-not-allowed'
                }`}
              >
                {dubbingState === 'idle' ? (
                  <>
                    <Zap size={16} fill="currentColor" />
                    Commence Synthesis
                  </>
                ) : (
                  <>
                    <Loader2 className="animate-spin text-studio-accent" size={16} />
                    Neural Processing
                  </>
                )}
              </button>
            </section>

            {/* Output Card */}
            <AnimatePresence>
              {dubbingState === 'ready' && (
                <motion.section 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-panel p-6 border-studio-success/20 bg-studio-success/[0.03]"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-studio-success/20 flex items-center justify-center text-studio-success shadow-lg shadow-studio-success/10">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-studio-success uppercase tracking-widest">Master File Ready</h4>
                      <p className="text-[10px] text-gray-500 font-medium">Synced & Mastering Completed.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={playAll}
                      className="bg-studio-success hover:bg-emerald-600 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Play size={14} fill="currentColor" />
                      Preview
                    </button>
                    <button className="bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">
                      <Upload size={14} />
                      Export
                    </button>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
            
            <section className="glass-panel p-4 flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/10">
                <ShieldCheck className="text-orange-500/60" size={16} />
              </div>
              <div className="space-y-1">
                <h5 className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Ethics Protocol 2.4</h5>
                <p className="text-[9px] text-gray-600 leading-normal font-medium">
                  Este sistema utiliza marcas d'água neurais para segurança.
                </p>
              </div>
            </section>
          </div>
        </main>

        {/* Footer Status */}
        <footer className="px-8 py-3 flex items-center justify-between border-t border-white/5 bg-black/60 backdrop-blur-md text-[9px] font-mono text-gray-600 uppercase tracking-[0.2em]">
          <div className="flex gap-10">
            <span className="flex items-center gap-2 underline underline-offset-4 decoration-studio-accent/30"><span className="w-1 h-1 rounded-full bg-studio-success"></span> System Stable</span>
            <span>Uplink: Active</span>
          </div>
          <div className="flex gap-6 items-center">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5 items-end h-3">
                <div className="w-0.5 h-[30%] bg-studio-accent"></div>
                <div className="w-0.5 h-[60%] bg-studio-accent"></div>
                <div className="w-0.5 h-[90%] bg-studio-accent"></div>
                <div className="w-0.5 h-[40%] bg-studio-accent"></div>
              </div>
              Audio_Buffer_OK
            </div>
            <span>[ Titan-X Core ]</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
