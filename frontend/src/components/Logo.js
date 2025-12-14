import React from 'react';

export default function Logo({ className = '', size = 'md' }) {
  const sizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-5xl'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
        <div className="relative bg-gradient-to-br from-primary to-amber-600 p-3 rounded-xl">
          <svg className="w-8 h-8 text-zinc-950" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
        </div>
      </div>
      <div className="flex flex-col">
        <h1 className={`font-black tracking-tight ${sizes[size]} bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent`}>
          FETHMES
        </h1>
        <p className="text-xs text-muted-foreground font-mono tracking-wider uppercase">Üretim Takip Sistemi</p>
      </div>
    </div>
  );
}