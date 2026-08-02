import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Send, Mic, Trash2, Image, FileText, User, Calculator, StopCircle } from 'lucide-react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';

export const InputBar: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const { sendMessage, activeChatId } = useWhatsAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Emojis list
  const EMOJI_LIST = ['🏗️', '🧱', '🚛', '🔨', '👍', '😊', '🙏', '📦', '📋', '✅', '💪', '📍', '💰', '📞', '📐'];

  useEffect(() => {
    if (isRecordingVoice) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecordingVoice]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(activeChatId, inputText.trim());
    setInputText('');
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCancelVoice = () => {
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  const handleSendVoice = () => {
    setIsRecordingVoice(false);
    sendMessage(activeChatId, '', 'audio', undefined, undefined);
    setRecordingSeconds(0);
  };

  const handleAttachImage = () => {
    sendMessage(
      activeChatId,
      'תעודת משלוח - באלה חול וסומסום 🏗️',
      'image',
      'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=600&auto=format&fit=crop&q=80',
      'תעודת_משלוח_1042.jpg'
    );
    setShowAttachMenu(false);
  };

  const handleAttachPdf = () => {
    sendMessage(
      activeChatId,
      'הצעת מחיר ח. סבן חומרי בניין בע"מ',
      'document',
      undefined,
      'הצעת_מחיר_ח_סבן_2026.pdf'
    );
    setShowAttachMenu(false);
  };

  return (
    <div className="bg-[#202c33] px-4 py-2.5 flex items-center gap-2 border-t border-[#222d34] relative z-20 shrink-0 select-none">
      {/* Attachment Menu Popup */}
      {showAttachMenu && (
        <div className="absolute bottom-16 right-12 bg-[#233138] border border-[#2a3942] rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 w-48 animate-in fade-in zoom-in-95">
          <button
            onClick={handleAttachImage}
            className="flex items-center gap-3 px-3 py-2 text-sm text-[#e9edef] hover:bg-[#182229] rounded-lg transition-colors text-right"
          >
            <Image className="w-4 h-4 text-emerald-400" />
            תמונה / תעודת משלוח
          </button>
          <button
            onClick={handleAttachPdf}
            className="flex items-center gap-3 px-3 py-2 text-sm text-[#e9edef] hover:bg-[#182229] rounded-lg transition-colors text-right"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            מסמך / הצעת מחיר
          </button>
          <button
            onClick={() => {
              sendMessage(activeChatId, 'מחירון מרוכז: באלה חול (140 ₪), סומסום (150 ₪), מלט (38 ₪), גבס לבן (42 ₪).');
              setShowAttachMenu(false);
            }}
            className="flex items-center gap-3 px-3 py-2 text-sm text-[#e9edef] hover:bg-[#182229] rounded-lg transition-colors text-right"
          >
            <Calculator className="w-4 h-4 text-purple-400" />
            מחירון מהיר
          </button>
          <button
            onClick={() => {
              sendMessage(activeChatId, 'איש קשר לסידור עבודה: מנהל מגרש 050-1234567');
              setShowAttachMenu(false);
            }}
            className="flex items-center gap-3 px-3 py-2 text-sm text-[#e9edef] hover:bg-[#182229] rounded-lg transition-colors text-right"
          >
            <User className="w-4 h-4 text-amber-400" />
            שיתוף איש קשר
          </button>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 right-4 bg-[#233138] border border-[#2a3942] rounded-xl shadow-2xl p-3 z-50 grid grid-cols-5 gap-2 w-64 animate-in fade-in zoom-in-95">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setInputText((prev) => prev + emoji);
                inputRef.current?.focus();
              }}
              className="text-2xl hover:bg-[#182229] p-1.5 rounded-md transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Recording Mode Bar */}
      {isRecordingVoice ? (
        <div className="flex-1 bg-[#111b21] rounded-lg px-4 py-2 flex items-center justify-between border border-red-500/40 animate-pulse">
          <div className="flex items-center gap-3 text-red-400 text-sm font-semibold">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
            <span>מקליט הודעה קולית...</span>
            <span className="font-mono text-xs text-[#e9edef]">
              0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelVoice}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-full"
              title="בטל הקלטה"
              id="btn-voice-cancel"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleSendVoice}
              className="px-3 py-1 bg-[#00a884] text-[#111b21] font-bold rounded-md text-xs flex items-center gap-1 hover:bg-[#029676]"
              id="btn-voice-send"
            >
              <Send className="w-3.5 h-3.5" />
              שלח קולי
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Action Triggers */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowAttachMenu(false);
              }}
              className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#2a3942] transition-colors"
              title="אימוג'י"
              id="btn-input-emoji"
            >
              <Smile className="w-6 h-6" />
            </button>

            <button
              onClick={() => {
                setShowAttachMenu(!showAttachMenu);
                setShowEmojiPicker(false);
              }}
              className="p-2 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#2a3942] transition-colors"
              title="צצילי קובץ / תעודה"
              id="btn-input-attach"
            >
              <Paperclip className="w-6 h-6" />
            </button>
          </div>

          {/* Text Input Box */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="הקלד/י הודעה..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] text-sm px-4 py-2.5 rounded-lg focus:outline-none border border-transparent focus:border-[#00a884]/60 transition-colors"
              id="input-chat-message-text"
            />
          </div>

          {/* Voice Record / Send Button */}
          {inputText.trim() ? (
            <button
              onClick={handleSend}
              className="p-2.5 bg-[#00a884] text-[#111b21] rounded-full hover:bg-[#029676] transition-transform active:scale-95 shadow-md flex items-center justify-center shrink-0"
              title="שלח הודעה"
              id="btn-chat-send-message"
            >
              <Send className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => setIsRecordingVoice(true)}
              className="p-2.5 text-[#8696a0] hover:text-[#00a884] hover:bg-[#2a3942] rounded-full transition-colors shrink-0"
              title="הקלטת הודעה קולית"
              id="btn-input-mic-record"
            >
              <Mic className="w-6 h-6" />
            </button>
          )}
        </>
      )}
    </div>
  );
};
