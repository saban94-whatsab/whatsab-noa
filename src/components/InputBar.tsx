import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Send, Mic, Trash2, Image, FileText, User, Calculator, Volume2, Sparkles, Loader2 } from 'lucide-react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const InputBar: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isDictating, setIsDictating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const { sendMessage, sendGroupMessage, activeChatId, contacts } = useWhatsAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Real Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const activeContact = contacts.find((c) => c.id === activeChatId);
  const isGroupChat = activeContact?.tags?.includes('קבוצת הזמנות') || activeContact?.phone.includes('@g.us') || activeContact?.tags?.includes('קבוצה');

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

  // Clean up speech recognition & recording streams on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRealVoiceRecording = async () => {
    setSpeechError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setSpeechError('מיקרופון אינו נתמך בדפדפן זה');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(200);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
    } catch (err) {
      console.error('Failed to access microphone:', err);
      setSpeechError('נכשל חיבור למיקרופון - אנא אשר הרשאת מיקרופון בדפדפן');
      setTimeout(() => setSpeechError(null), 4000);
    }
  };

  const handleCancelVoice = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecordingVoice(false);
    setIsTranscribing(false);
    setRecordingSeconds(0);
  };

  const finishVoiceRecordingAndTranscribe = (autoSend: boolean = true) => {
    if (!mediaRecorderRef.current) {
      handleCancelVoice();
      return;
    }

    setIsTranscribing(true);
    const recorder = mediaRecorderRef.current;
    const recorderMime = recorder.mimeType || 'audio/webm';

    recorder.onstop = async () => {
      // Stop microphone stream tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: recorderMime });
      if (audioBlob.size === 0) {
        setSpeechError('לא הוקלט שמע');
        setTimeout(() => setSpeechError(null), 3000);
        setIsRecordingVoice(false);
        setIsTranscribing(false);
        return;
      }

      try {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;

          const response = await fetch('/api/transcribe-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Audio,
              mimeType: recorderMime,
            }),
          });

          const data = await response.json();

          if (response.ok && data.transcript) {
            const transcriptText = data.transcript.trim();
            if (autoSend) {
              if (isGroupChat && activeContact) {
                sendGroupMessage(
                  activeContact.phone || '120363390702096083@g.us',
                  transcriptText,
                  ['972526688768@c.us'],
                  '0526688768',
                  'חיים עמרם'
                );
              } else {
                sendMessage(activeChatId, transcriptText);
              }
            } else {
              setInputText((prev) => (prev ? `${prev.trim()} ${transcriptText}` : transcriptText));
              inputRef.current?.focus();
            }
          } else {
            setSpeechError(data.error || 'שגיאה בתמלול Gemini API');
            setTimeout(() => setSpeechError(null), 4000);
          }

          setIsRecordingVoice(false);
          setIsTranscribing(false);
          setRecordingSeconds(0);
        };
      } catch (err) {
        console.error('Audio transcription request failed:', err);
        setSpeechError('תקלה בתקשורת מול Gemini API');
        setTimeout(() => setSpeechError(null), 4000);
        setIsRecordingVoice(false);
        setIsTranscribing(false);
        setRecordingSeconds(0);
      }
    };

    try {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    } catch (err) {
      console.error('Error stopping MediaRecorder:', err);
      handleCancelVoice();
    }
  };

  const toggleDictation = () => {
    if (isDictating) {
      stopDictation();
      return;
    }

    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setSpeechError('זיהוי קולי אינו נתמך בדפדפן זה');
      setTimeout(() => setSpeechError(null), 3000);
      return;
    }

    try {
      const recognition = new SpeechRecognitionApi();
      recognition.lang = 'he-IL';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsDictating(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptChunk;
          }
        }

        if (finalTranscript) {
          setInputText((prev) => (prev ? `${prev.trim()} ${finalTranscript}` : finalTranscript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setSpeechError(`שגיאת זיהוי קולי: ${event.error}`);
          setTimeout(() => setSpeechError(null), 3000);
        }
        setIsDictating(false);
      };

      recognition.onend = () => {
        setIsDictating(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setSpeechError('תקלה בהפעלת מיקרופון');
      setTimeout(() => setSpeechError(null), 3000);
      setIsDictating(false);
    }
  };

  const stopDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsDictating(false);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    if (isDictating) stopDictation();

    if (isGroupChat && activeContact) {
      sendGroupMessage(
        activeContact.phone || '120363390702096083@g.us',
        inputText.trim(),
        ['972526688768@c.us'],
        '0526688768',
        'חיים עמרם'
      );
    } else {
      sendMessage(activeChatId, inputText.trim());
    }

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
      {/* Speech Error Banner */}
      {speechError && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-500 text-red-100 text-xs px-3 py-1 rounded-md shadow-lg z-50 animate-in fade-in">
          {speechError}
        </div>
      )}

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
        <div className="flex-1 bg-[#111b21] rounded-lg px-4 py-2 flex items-center justify-between border border-[#00ffaa]/40">
          {isTranscribing ? (
            <div className="flex items-center gap-3 text-[#00ffaa] text-sm font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-[#00ffaa]" />
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                Gemini AI מתמללת את ההקלטה הקולית...
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-red-400 text-sm font-semibold">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
              <span>מקליט הודעה קולית...</span>
              <span className="font-mono text-xs text-[#e0e6ed]">
                0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </span>
            </div>
          )}

          {!isTranscribing && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelVoice}
                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-full transition-colors"
                title="בטל הקלטה"
                id="btn-voice-cancel"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <button
                onClick={() => finishVoiceRecordingAndTranscribe(false)}
                className="px-2.5 py-1 bg-[#2a3942] hover:bg-[#3b4a54] text-[#e0e6ed] text-xs font-medium rounded-md flex items-center gap-1 transition-colors border border-white/10"
                title="תמלל את ההקלטה לתיבת הטקסט לצורך סקירה"
                id="btn-voice-to-input"
              >
                <FileText className="w-3.5 h-3.5 text-[#00ffaa]" />
                תמלל לטקסט
              </button>

              <button
                onClick={() => finishVoiceRecordingAndTranscribe(true)}
                className="px-3 py-1 bg-[#00ffaa] hover:bg-[#00cc88] text-[#0a0b10] font-bold rounded-md text-xs flex items-center gap-1.5 transition-all shadow-md shadow-[#00ffaa]/20"
                id="btn-voice-send-transcribed"
              >
                <Sparkles className="w-3.5 h-3.5" />
                תמלל ושלח (Gemini AI)
              </button>
            </div>
          )}
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
              title="צלי קובץ / תעודה"
              id="btn-input-attach"
            >
              <Paperclip className="w-6 h-6" />
            </button>
          </div>

          {/* Text Input Box with Voice-to-Text Button */}
          <div className="flex-1 relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              placeholder={isDictating ? "מכתיב דיבור... דבר/י עכשיו..." : "הקלד/י הודעה או השתמש/י במיקרופון..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] text-sm pl-10 pr-4 py-2.5 rounded-lg focus:outline-none border transition-colors ${
                isDictating 
                  ? 'border-emerald-400 bg-emerald-950/30 text-emerald-100 placeholder-emerald-400/80 ring-2 ring-emerald-500/30' 
                  : 'border-transparent focus:border-[#00ffaa]/60'
              }`}
              id="input-chat-message-text"
            />

            {/* Voice-to-Text (Dictation) Trigger Button inside Input */}
            <button
              onClick={toggleDictation}
              className={`absolute left-2.5 p-1.5 rounded-md transition-all ${
                isDictating
                  ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/50'
                  : 'text-[#8696a0] hover:text-[#00ffaa] hover:bg-[#182229]'
              }`}
              title={isDictating ? 'עצור הכתבה קולית (Voice to Text)' : 'הקלדה קולית - תמלול דיבור לטקסט (Voice to Text)'}
              id="btn-voice-to-text-dictate"
            >
              {isDictating ? (
                <Volume2 className="w-4 h-4 animate-bounce" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Voice Record / Send Button */}
          {inputText.trim() ? (
            <button
              onClick={handleSend}
              className="p-2.5 bg-[#00ffaa] text-[#0a0b10] rounded-full hover:bg-[#00cc88] transition-transform active:scale-95 shadow-md flex items-center justify-center shrink-0 font-bold"
              title="שלח הודעה"
              id="btn-chat-send-message"
            >
              <Send className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              onClick={startRealVoiceRecording}
              className="p-2.5 text-[#8696a0] hover:text-[#00ffaa] hover:bg-[#2a3942] rounded-full transition-colors shrink-0 relative group"
              title="הקלטת הודעה קולית עם תמלול Gemini AI (Voice Note)"
              id="btn-input-mic-record"
            >
              <Mic className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00ffaa] rounded-full border-2 border-[#202c33]" />
            </button>
          )}
        </>
      )}
    </div>
  );
};
