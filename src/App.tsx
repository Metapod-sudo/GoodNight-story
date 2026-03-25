/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { Moon, Stars, Heart, Play, Pause, RefreshCw, Sparkles, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const themes = [
  { id: 'forest', name: '森林秘境', icon: '🌲', prompt: '在一個充滿螢火蟲的森林裡' },
  { id: 'ocean', name: '深海奇緣', icon: '🌊', prompt: '在一個波光粼粼的海底城堡' },
  { id: 'space', name: '星際漫遊', icon: '🚀', prompt: '在一顆閃爍的小行星上' },
  { id: 'fairy', name: '童話王國', icon: '🏰', prompt: '在一個雲朵上的城堡' },
  { id: 'custom', name: '自訂場景', icon: '✨', prompt: '' },
];

const moods = [
  { id: 'sweet', name: '甜蜜', icon: '🍭' },
  { id: 'calm', name: '寧靜', icon: '🌙' },
  { id: 'funny', name: '幽默', icon: '🎈' },
  { id: 'absurd', name: '無厘頭', icon: '🤪' },
];

export default function App() {
  const [name, setName] = useState('');
  const [storyElements, setStoryElements] = useState('');
  const [theme, setTheme] = useState(themes[0]);
  const [customThemePrompt, setCustomThemePrompt] = useState('');
  const [mood, setMood] = useState(moods[0]);
  const [story, setStory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateStory = async () => {
    if (!name.trim()) {
      alert('請輸入女朋友的名字或暱稱喔！');
      return;
    }

    setIsLoading(true);
    setStory('');
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const scenePrompt = theme.id === 'custom' ? customThemePrompt : theme.prompt;
      if (theme.id === 'custom' && !customThemePrompt.trim()) {
        alert('請輸入自訂場景的描述喔！');
        setIsLoading(false);
        return;
      }

      const elementsPrompt = storyElements.trim() ? `故事中必須包含以下元素：${storyElements}。` : '';

      let promptSuffix = '';
      if (mood.id === 'absurd') {
        promptSuffix = `這是一個「無厘頭」版本。故事要極度荒誕、不按牌理出牌、充滿冷笑話或超現實情節（例如：突然出現一隻會跳芭蕾的章魚，或者月亮變成了一塊巨大的起司）。風格要幽默、無厘頭，但最後要強行轉折回溫馨的晚安祝福，讓 ${name} 在困惑中感到一絲甜蜜。`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `請寫一個適合哄女朋友睡覺的短篇故事。
        女主角的名字是：${name}。
        場景：${scenePrompt}。
        語氣：${mood.name}。
        ${elementsPrompt}
        ${promptSuffix}
        要求：
        1. 故事要短小精悍，大約 300-500 字。
        2. 結尾要溫馨，帶有晚安祝福。
        3. 使用繁體中文。
        4. 故事中要自然地提到 ${name} 的名字。`,
      });

      setStory(response.text || '哎呀，故事書掉到床底下了，請再試一次吧。');
    } catch (error) {
      console.error('Generation error:', error);
      setStory('星星今天有點害羞，沒能寫出故事。請稍後再試。');
    } finally {
      setIsLoading(false);
    }
  };

  const playTTS = async () => {
    if (!story || isAudioLoading) return;

    if (audioRef.current && audioRef.current.src) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    setIsAudioLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `用溫柔、緩慢、催眠的語氣朗讀這個故事：${story}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is a soft voice
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioBlob = await fetch(`data:audio/wav;base64,${base64Audio}`).then(res => res.blob());
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('TTS error:', error);
      alert('聲音魔法暫時失效了...');
    } finally {
      setIsAudioLoading(false);
    }
  };

  useEffect(() => {
    const audio = new Audio();
    audio.onended = () => setIsPlaying(false);
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a051a] text-white font-sans selection:bg-purple-500/30 overflow-x-hidden relative">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-12 flex flex-col items-center">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 mb-4">
            <Moon className="w-8 h-8 text-yellow-200 animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-purple-200 to-blue-200 bg-clip-text text-transparent">
            暖心睡前故事
          </h1>
          <p className="text-white/60 text-sm">為心愛的她，編織一個溫柔的夢境</p>
        </motion.div>

        {/* Setup Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl mb-8"
        >
          <div className="space-y-6">
            {/* Name Input */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-white/40 mb-2 ml-1">
                她的名字 / 暱稱
              </label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：小寶貝、親愛的..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-white/20"
              />
            </div>

            {/* Story Elements Input */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-white/40 mb-2 ml-1">
                想加入的元素 (選填)
              </label>
              <input 
                type="text"
                value={storyElements}
                onChange={(e) => setStoryElements(e.target.value)}
                placeholder="例如：一隻小貓、草莓蛋糕、下雨天..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-white/20"
              />
            </div>

            {/* Theme Selection */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-white/40 mb-3 ml-1">
                故事場景
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
                      theme.id === t.id 
                        ? 'bg-purple-500/20 border-purple-500/50 text-white' 
                        : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <span className="text-sm font-medium">{t.name}</span>
                  </button>
                ))}
              </div>
              
              <AnimatePresence>
                {theme.id === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3"
                  >
                    <input 
                      type="text"
                      value={customThemePrompt}
                      onChange={(e) => setCustomThemePrompt(e.target.value)}
                      placeholder="描述你想發生的場景（例如：在巴黎鐵塔下...）"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-white/20 text-sm"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mood Selection */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-white/40 mb-3 ml-1">
                故事語氣
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {moods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMood(m)}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-2xl border transition-all ${
                      mood.id === m.id 
                        ? 'bg-blue-500/20 border-blue-500/50 text-white' 
                        : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span className="text-sm font-medium">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateStory}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>開始編織故事</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Story Display */}
        <AnimatePresence>
          {story && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Audio Controls */}
              <div className="absolute top-6 right-6 flex gap-2">
                <button
                  onClick={playTTS}
                  disabled={isAudioLoading}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/10 disabled:opacity-50"
                  title={isPlaying ? "暫停" : "朗讀故事"}
                >
                  {isAudioLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="prose prose-invert max-w-none">
                <div className="flex items-center gap-2 mb-6 text-purple-300">
                  <Stars className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">晚安故事</span>
                </div>
                
                <div className="text-white/90 leading-relaxed text-lg font-serif italic">
                  <ReactMarkdown>{story}</ReactMarkdown>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-white/40 text-xs italic">
                  <div className="flex items-center gap-2">
                    <Heart className="w-3 h-3 text-red-400/60" />
                    <span>祝 {name} 有個好夢</span>
                  </div>
                  <span>AI 編織於星光之下</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-12 text-white/20 text-[10px] uppercase tracking-[0.2em] text-center">
          Made with love for peaceful nights
        </footer>
      </main>
    </div>
  );
}
