import React, { useEffect, useRef } from 'react';
import { Check, CheckCheck, FileText, Download, Bot, Sparkles, UserCheck, ShieldAlert } from 'lucide-react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';
import { WhatsAppDoodleBackground } from './WhatsAppDoodleBackground';
import { AudioPlayerWaveform } from './AudioPlayerWaveform';

export const MessageList: React.FC = () => {
  const { messages, activeChatId, contacts, sendMessage } = useWhatsAppStore();
  const chatMessages = messages[activeChatId] || [];
  const activeContact = contacts.find((c) => c.id === activeChatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, activeChatId]);

  const handleQuickChipClick = (chipText: string) => {
    sendMessage(activeChatId, chipText);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 relative bg-[#0b141a] space-y-3 dir-rtl">
      {/* WhatsApp Doodle Pattern Overlay */}
      <WhatsAppDoodleBackground />

      {/* Date Header Badge */}
      <div className="flex justify-center my-2 relative z-10">
        <span className="bg-[#182229] border border-[#222d34] text-[#8696a0] text-xs px-3 py-1 rounded-md shadow-xs font-medium">
          היום
        </span>
      </div>

      {/* Security Info Banner */}
      <div className="max-w-md mx-auto bg-[#182229]/80 border border-[#222d34] rounded-lg p-2.5 text-center text-xs text-[#ffd279] shadow-xs relative z-10">
        🔒 השיחות מוצפנות מקצה לקצה ומחוברות לפלאגין JONI Firebase Realtime DB & Webhook Listener v2.4.
      </div>

      {/* Messages */}
      {chatMessages.map((msg) => {
        const isUser = msg.sender === 'user';
        const isAI = msg.sender === 'ai';
        const isSystem = msg.sender === 'system';

        if (isSystem) {
          return (
            <div key={msg.id} className="flex justify-center my-2 relative z-10">
              <div className="bg-[#182229] border border-amber-800/50 text-amber-300 text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>[נציג אנושי]: {msg.text}</span>
                <span className="text-[10px] text-amber-500/80 font-mono">{msg.timestamp}</span>
              </div>
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            className={`flex flex-col relative z-10 ${
              isUser ? 'items-start' : 'items-end'
            }`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-lg p-3 text-sm shadow-md relative group ${
                isUser
                  ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                  : isAI
                  ? 'bg-[#202c33] text-[#e9edef] rounded-tl-none border-l-2 border-[#00a884]'
                  : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
              }`}
            >
              {/* Sender Tag Header if AI */}
              {isAI && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#00a884] mb-1">
                  <Bot className="w-3.5 h-3.5" />
                  <span>נועה AI (ח. סבן)</span>
                </div>
              )}

              {/* Message Content */}
              {msg.type === 'audio' ? (
                <AudioPlayerWaveform duration={msg.audioDuration || 18} isIncoming={!isUser} />
              ) : msg.type === 'document' ? (
                <div className="flex items-center gap-3 bg-[#111b21]/50 p-2.5 rounded-md border border-[#2a3942] my-1">
                  <FileText className="w-8 h-8 text-[#00a884] shrink-0" />
                  <div className="flex-1 min-w-0 text-right">
                    <p className="font-medium text-xs text-[#e9edef] truncate">
                      {msg.fileName || 'חשבונית_חומרי_בניין.pdf'}
                    </p>
                    <span className="text-[10px] text-[#8696a0]">1.4 MB • PDF</span>
                  </div>
                  <button className="p-1.5 text-[#8696a0] hover:text-[#e9edef] bg-[#202c33] rounded-full">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ) : msg.mediaUrl ? (
                <div className="my-1 overflow-hidden rounded-md">
                  <img
                    src={msg.mediaUrl}
                    alt="קובץ מצורף"
                    className="w-full max-h-60 object-cover rounded-md"
                  />
                  {msg.text && <p className="mt-2 text-sm">{msg.text}</p>}
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed text-right">{msg.text}</p>
              )}

              {/* Timestamp and Delivery Ticks */}
              <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0] mt-1 font-mono select-none">
                <span>{msg.timestamp}</span>
                {isUser && (
                  <span
                    className="inline-flex items-center ml-0.5"
                    title={msg.status === 'sent' ? 'נשלח' : msg.status === 'delivered' ? 'נמסר' : 'נקרא'}
                  >
                    {msg.status === 'sent' ? (
                      <Check className="w-3.5 h-3.5 text-[#8696a0] transition-all duration-300 stroke-[2]" />
                    ) : msg.status === 'delivered' ? (
                      <CheckCheck className="w-3.5 h-3.5 text-[#8696a0] transition-all duration-300 stroke-[2]" />
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] transition-all duration-500 scale-110 animate-in fade-in zoom-in-75 stroke-[2]" />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* AI Quick Reply Suggested Chips */}
      {activeContact && (
        <div className="pt-2 flex flex-wrap gap-2 justify-center relative z-10">
          <span className="w-full text-center text-[11px] text-[#8696a0] flex items-center justify-center gap-1 mb-1">
            <Sparkles className="w-3 h-3 text-[#00a884]" />
            הצעות מהירות לפנייה לנועה AI:
          </span>
          {[
            'מה שעות הפעילות של המגרש?',
            'כמה עולה באלה חול ים?',
            'צריך תיאום פריקת מנוף ברמת גן',
            'מחירון גבס ומלט אפור',
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => handleQuickChipClick(chip)}
              className="bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] hover:border-[#00a884]/60 text-[#e9edef] text-xs px-3 py-1.5 rounded-full transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>{chip}</span>
            </button>
          ))}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
