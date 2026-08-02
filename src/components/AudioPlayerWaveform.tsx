import React, { useState, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface AudioPlayerWaveformProps {
  duration?: number;
  isIncoming?: boolean;
}

export const AudioPlayerWaveform: React.FC<AudioPlayerWaveformProps> = ({
  duration = 14,
  isIncoming = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + (100 / (duration * 10)) * speed;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration, speed]);

  const toggleSpeed = () => {
    if (speed === 1) setSpeed(1.5);
    else if (speed === 1.5) setSpeed(2);
    else setSpeed(1);
  };

  const currentSeconds = Math.floor((progress / 100) * duration);
  const formattedTime = `0:${currentSeconds < 10 ? '0' : ''}${currentSeconds}`;

  return (
    <div className="flex items-center gap-3 py-1.5 px-1 min-w-[220px] max-w-[280px]">
      {/* Mic Avatar */}
      <div className="relative shrink-0">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isIncoming ? 'bg-[#111b21] text-emerald-400' : 'bg-[#00a884] text-[#111b21]'
          }`}
        >
          <Mic className="w-5 h-5" />
        </div>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center shadow-md hover:scale-105 transition-transform"
          id="btn-[#btn-voice-play-pause]"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </button>
      </div>

      {/* Waveform & Progress */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-0.5 h-6">
          {[40, 65, 30, 85, 95, 45, 70, 60, 30, 90, 100, 75, 40, 60, 80, 50, 35, 70, 85, 40].map(
            (heightPct, idx) => {
              const barPct = (idx / 20) * 100;
              const isPlayed = barPct <= progress;
              return (
                <div
                  key={idx}
                  onClick={() => setProgress(barPct)}
                  className={`flex-1 rounded-full cursor-pointer transition-colors ${
                    isPlayed
                      ? 'bg-[#00a884]'
                      : isIncoming
                      ? 'bg-[#3b4a54]'
                      : 'bg-[#267566]'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              );
            }
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#8696a0] font-mono">
          <span>{formattedTime}</span>
          <button
            onClick={toggleSpeed}
            className="hover:text-[#e9edef] px-1 bg-[#111b21]/40 rounded text-[10px]"
          >
            {speed}x
          </button>
        </div>
      </div>
    </div>
  );
};
