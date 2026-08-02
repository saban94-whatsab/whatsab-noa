import React from 'react';

export const WhatsAppDoodleBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-repeat z-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <pattern id="doodle" width="120" height="120" patternUnits="userSpaceOnUse">
          <path d="M20 20 h10 v10 h-10 z M60 20 a 10 10 0 1 0 0.1 0 M100 20 l10 15 h-20 z M30 70 h15 v5 h-15 z M80 70 a 8 8 0 1 1 0 -0.1" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-emerald-200" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#doodle)" />
      </svg>
    </div>
  );
};
