'use client';

import { useState, useRef, useEffect } from 'react';

export const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: 'sentiment_satisfied',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', 
      '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😜', '🤪', '😎', 
      '🥳', '😏', '🤔', '🤫', '🫡', '🤐', '😴', '🤯', '😱', '🥺'
    ],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    icon: 'front_hand',
    emojis: [
      '👍', '👎', '👌', '🤌', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', 
      '👈', '👉', '👆', '👇', '✋', '🤚', '👋', '👏', '🙌', '👐', 
      '🤝', '🙏', '💪', '👊', '✊', '🤛', '🤜', ' salute'
    ].filter((e) => e.trim().length > 0 && e !== ' salute'),
  },
  {
    id: 'vibes',
    name: 'Vibes',
    icon: 'favorite',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', 
      '❤️‍🔥', '💖', '💗', '💓', '💞', '💕', '✨', '🌟', '⭐', '🔥', 
      '💥', '💯', '🎉', '🎊', '🎈', '🏆', '🥇', '👑', '💎', '🌈'
    ],
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: 'sports_esports',
    emojis: [
      '🎮', '🕹️', '👾', '🎲', '🎯', '⚔️', '🛡️', '🏹', '🔮', '🚀', 
      '🛸', '💣', '⚡', '🤖', '👻', '💀', '☠️', '🍄', '🍕', '🍔', 
      '🍟', '🍿', '☕', '🥤', '🍺', '🕹', '🧩', '🏆', '🥇', '🥈'
    ],
  },
];

export function EmojiPicker({ onSelect, onClose, align = 'left', className = '' }) {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [search, setSearch] = useState('');
  const pickerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0];
  const filteredEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
    : currentCategory.emojis;

  return (
    <div
      ref={pickerRef}
      className={`z-40 w-72 bg-surface-container-lowest border-[1.5px] border-tertiary/40 rounded-xl shadow-pixel-lg backdrop-blur-md p-2 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150 select-none ${className}`}
    >
      {/* Header & Tabs */}
      <div className="flex items-center justify-between border-b border-tertiary/15 pb-1.5 px-0.5">
        <div className="flex items-center gap-1">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setSearch('');
              }}
              className={`p-1 rounded-lg transition-all ${
                activeCategory === cat.id && !search
                  ? 'bg-secondary-container text-primary font-bold shadow-pixel-xs'
                  : 'text-tertiary hover:text-on-surface hover:bg-surface-container'
              }`}
              title={cat.name}
            >
              <span className="material-symbols-outlined text-[17px] block leading-none">{cat.icon}</span>
            </button>
          ))}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 rounded flex items-center justify-center text-tertiary hover:text-on-surface hover:bg-surface-container text-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        )}
      </div>

      {/* Emoji Grid */}
      <div className="max-h-48 overflow-y-auto grid grid-cols-7 gap-1 p-0.5 scrollbar-thin scrollbar-thumb-tertiary/20">
        {filteredEmojis.map((emoji, idx) => (
          <button
            key={`${emoji}-${idx}`}
            type="button"
            onClick={() => {
              onSelect?.(emoji);
            }}
            className="w-8 h-8 flex items-center justify-center text-[18px] rounded-lg hover:bg-surface-container hover:scale-125 transition-transform press cursor-pointer select-none"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
