import React from 'react';

export interface IconProps { className?: string }

const base = 'w-7 h-7 text-white';

export const IconShirt: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className || base} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3l3 2 3-2 4 2-3 4v12H8V9L5 5l4-2z"/>
  </svg>
);

export const IconHoodie: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className || base} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 8a5 5 0 0 1 10 0v11H7V8z"/>
    <path d="M7 8l-3 3v8h3M17 8l3 3v8h-3"/>
  </svg>
);

export const IconMug: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className || base} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="6" width="10" height="12" rx="2"/>
    <path d="M14 9h3a3 3 0 0 1 0 6h-3"/>
  </svg>
);

export const IconPhoneCase: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className || base} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="20" rx="3"/>
    <circle cx="14" cy="6" r="1"/>
  </svg>
);

export const IconTote: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className || base} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 10h12l-1 10H7L6 10z"/>
    <path d="M9 10V8a3 3 0 0 1 6 0v2"/>
  </svg>
);

export const IconPoster: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className || base} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="2"/>
    <path d="M8 8h8M8 12h6M8 16h5"/>
  </svg>
);

export const IconCanvas: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className || base} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="5" width="16" height="12" rx="2"/>
    <path d="M8 19h8"/>
  </svg>
);

export const IconBlanket: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className || base} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7c4-3 12-3 16 0v10c-4 3-12 3-16 0V7z"/>
  </svg>
);

export const IconPillow: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className || base} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="6" width="14" height="12" rx="3"/>
  </svg>
);

export const IconSticker: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className || base} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 5h7l4 4v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z"/>
    <path d="M14 5v4h4"/>
  </svg>
);

export const IconJournal: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className || base} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 5h9a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z"/>
    <path d="M7 12h12"/>
  </svg>
);


