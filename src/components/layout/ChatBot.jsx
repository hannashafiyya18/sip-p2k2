import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles, Bot, User, Minimize2 } from 'lucide-react';
import { callGemini } from '../../services/ai';
import { formatRupiah } from '../../utils/helpers';

export default function ChatBot({ stats, dynamicGroups }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Halo! Saya Asisten AI SIP-P2K2. Ada yang bisa saya bantu hari ini seputar data KPM atau panduan pertemuan kelompok PKH?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const quickSuggestions = [
    { label: '📊 Ringkasan KPM', text: 'Tolong berikan ringkasan data KPM kita saat ini' },
    { label: '💰 Rincian Bantuan', text: 'Berapa estimasi total dana bantuan dan rinciannya?' },
    { label: '👥 Daftar Kelompok', text: 'Apa saja kelompok KPM yang terdaftar?' },
    { label: '💡 Panduan PKH', text: 'Apa itu P2K2 dalam PKH?' }
  ];

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    if (!textToSend) setInputMessage('');

    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Craft the system prompt with context
      const cleanGroups = dynamicGroups ? dynamicGroups.filter(g => g !== "Semua Kelompok") : [];
      const systemPrompt = `Anda adalah Asisten AI SIP-P2K2 (Sistem Informasi Pertemuan Peningkatan Kemampuan Keluarga). Anda adalah asisten pintar untuk pendamping sosial Program Keluarga Harapan (PKH).
Tugas Anda adalah membantu pengguna menjawab pertanyaan seputar aplikasi SIP-P2K2, panduan PKH, atau menganalisis ringkasan data KPM mereka.

Berikut ringkasan data KPM aktif saat ini di aplikasi pengguna:
- Total KPM: ${stats?.total || 0} orang
- Hadir: ${stats?.present || 0} orang
- Absen: ${stats?.absent || 0} orang
- Estimasi Total Dana Bantuan: ${formatRupiah(stats?.totalAid || 0)}
- Daftar Kelompok: ${cleanGroups.join(', ') || 'Belum ada kelompok'}
- Rincian Komponen Bantuan: SD (${stats?.componentsCount?.sd || 0}), SMP (${stats?.componentsCount?.smp || 0}), SMA (${stats?.componentsCount?.sma || 0}), Lansia (${stats?.componentsCount?.lansia || 0}), Balita (${stats?.componentsCount?.balita || 0}), Bumil (${stats?.componentsCount?.hamil || 0}), Disabilitas (${stats?.componentsCount?.disabilitas || 0})

Jawablah dengan bahasa Indonesia yang santun, profesional, ramah, dan ringkas. Jika ditanya mengenai data KPM, gunakan data ringkasan di atas untuk menjawab secara detail dan informatif. Jika data tidak tersedia atau pertanyaan terlalu spesifik tentang nama orang tertentu yang tidak ada di ringkasan, jelaskan dengan ramah bahwa Anda hanya memiliki akses ke ringkasan statistik saat ini di database lokal pendamping.`;

      const prompt = `${systemPrompt}\n\nUser Question: "${text}"`;
      
      const aiResponse = await callGemini(prompt);
      
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: aiResponse || 'Maaf, saya tidak mendapatkan respons yang valid dari server AI.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('ChatBot Error:', error);
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Maaf, terjadi kesalahan saat menghubungi layanan AI. Pastikan koneksi internet Anda aktif.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* FLOATING TOGGLE BUTTON */}
      {!isOpen && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60]">
          <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping opacity-75"></span>
          <button
            onClick={() => setIsOpen(true)}
            className="relative bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center border border-blue-500/20"
            title="Tanya Asisten AI"
          >
            <Sparkles size={24} className="animate-pulse" />
          </button>
        </div>
      )}

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 top-16 md:inset-auto md:bottom-24 md:right-6 md:w-96 md:h-[520px] bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 z-[70] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          
          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center shadow-md shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm relative">
                <Bot size={18} className="text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-blue-600 animate-pulse"></span>
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1">
                  Asisten AI SIP-P2K2 <Sparkles size={12} className="text-yellow-300 fill-yellow-300" />
                </h3>
                <p className="text-[10px] opacity-75">Tanya ringkasan data & info PKH</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
                title="Tutup Chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-950/20 custom-scrollbar">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-2.5 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-1 duration-200`}
              >
                <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white ${msg.sender === 'user' ? 'bg-indigo-600' : 'bg-blue-600'}`}>
                  {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-tl-none'}`}>
                    {msg.text.split('\n').map((para, i) => (
                      <p key={i} className={i > 0 ? 'mt-1.5' : ''}>{para}</p>
                    ))}
                  </div>
                  <span className={`block text-[9px] text-gray-400 dark:text-gray-500 mt-1 ${msg.sender === 'user' ? 'text-right' : ''}`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2.5 max-w-[85%] animate-in fade-in duration-200">
                <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white bg-blue-600">
                  <Bot size={16} />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 p-3 rounded-2xl rounded-tl-none text-xs text-gray-500 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-blue-600" />
                  <span>Sedang mengetik...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* SUGGESTIONS */}
          {messages.length === 1 && !isLoading && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <p className="text-[10px] text-gray-400 font-bold mb-2 uppercase tracking-wider">Pertanyaan Cepat:</p>
              <div className="flex flex-wrap gap-2">
                {quickSuggestions.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug.text)}
                    className="text-[11px] bg-white hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full font-semibold border border-gray-200 dark:border-gray-700 shadow-sm transition active:scale-95 text-left truncate max-w-full"
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* INPUT FORM */}
          <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Tulis pesan ke Asisten AI..."
              className="flex-1 text-xs p-2.5 bg-gray-50 dark:bg-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className={`p-2.5 rounded-xl transition ${inputMessage.trim() && !isLoading ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}
              title="Kirim Pesan"
            >
              <Send size={14} />
            </button>
          </div>

        </div>
      )}
    </>
  );
}
