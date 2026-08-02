import React, { useState } from 'react';
import { Lock, KeyRound, X, AlertCircle, ShieldCheck, Check } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DEFAULT_ADMIN_PASSCODE = '1125';

export const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setErrorMsg('');

      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const verifyPin = (enteredPin: string) => {
    if (enteredPin === DEFAULT_ADMIN_PASSCODE) {
      setIsSuccess(true);
      setErrorMsg('');
      setTimeout(() => {
        setIsSuccess(false);
        setPin('');
        onSuccess();
      }, 400);
    } else {
      setErrorMsg('קוד שגוי! הסיסמה ברירת המחדל היא 1125');
      setTimeout(() => {
        setPin('');
      }, 700);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 4) {
      verifyPin(pin);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 dir-rtl animate-in fade-in duration-200">
      <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-[#e9edef] overflow-hidden">
        {/* Header close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-[#8696a0] hover:text-[#e9edef] p-1.5 rounded-full hover:bg-[#202c33] transition-colors"
          title="סגור"
          id="btn-close-password-modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lock Icon Banner */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 transition-all ${
            isSuccess 
              ? 'bg-[#00a884]/20 border-2 border-[#00a884] text-[#00a884] scale-110' 
              : errorMsg 
                ? 'bg-rose-500/20 border-2 border-rose-500 text-rose-400 animate-bounce' 
                : 'bg-[#202c33] border border-[#2a3942] text-[#00a884]'
          }`}>
            {isSuccess ? (
              <Check className="w-8 h-8 stroke-[3]" />
            ) : (
              <Lock className="w-8 h-8 stroke-[2.2]" />
            )}
          </div>

          <h3 className="text-xl font-bold text-[#e9edef] flex items-center gap-2">
            כניסה מוגנת לדפי ניהול
          </h3>
          <p className="text-xs text-[#8696a0] mt-1">
            הזן קוד מורשה לפתיחת דפי הניהול (ברירת מחדל: <span className="font-mono text-[#00a884] font-bold">1125</span>)
          </p>
        </div>

        {/* PIN Circles Display */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex justify-center items-center gap-4 dir-ltr mb-3">
            {[0, 1, 2, 3].map((index) => {
              const hasDigit = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-11 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold font-mono transition-all ${
                    hasDigit
                      ? 'border-[#00a884] bg-[#00a884]/15 text-[#00a884] shadow-md shadow-[#00a884]/10'
                      : 'border-[#2a3942] bg-[#202c33] text-[#8696a0]'
                  }`}
                >
                  {hasDigit ? '●' : ''}
                </div>
              );
            })}
          </div>

          {/* Error Message Alert */}
          {errorMsg ? (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2 rounded-lg text-center animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1 text-[11px] text-[#8696a0]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00a884]" />
              <span>מאובטח ע"י סיסמת מנהל ח. סבן</span>
            </div>
          )}
        </form>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-12 rounded-xl bg-[#202c33] border border-[#2a3942] hover:bg-[#2a3942] active:bg-[#00a884] active:text-[#111b21] text-lg font-bold font-mono text-[#e9edef] flex items-center justify-center transition-all shadow-sm"
              id={`btn-keypad-${num}`}
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl bg-[#182229] border border-[#2a3942] hover:bg-rose-950/40 text-xs text-[#8696a0] hover:text-rose-400 font-semibold flex items-center justify-center transition-all"
            id="btn-keypad-clear"
          >
            ניקוי
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-xl bg-[#202c33] border border-[#2a3942] hover:bg-[#2a3942] active:bg-[#00a884] active:text-[#111b21] text-lg font-bold font-mono text-[#e9edef] flex items-center justify-center transition-all shadow-sm"
            id="btn-keypad-0"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-[#182229] border border-[#2a3942] hover:bg-[#2a3942] text-xs text-[#8696a0] hover:text-[#e9edef] font-semibold flex items-center justify-center transition-all"
            id="btn-keypad-backspace"
          >
            מחק ⌫
          </button>
        </div>

        <div className="mt-5 text-center">
          <span className="text-[10px] text-[#8696a0] block">
            סיסמת ברירת מחדל מוגדרת במערכת: <strong className="text-[#00a884] font-mono">1125</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
