import { BadgeCheck, Snowflake, Shield, Sparkles, Hash, Star, Crown, Diamond, Heart, Award, Rocket, Leaf, Moon, Sun, Music, Book, Coffee, Gamepad, Gift, Smile, Trophy, Zap, ShoppingBag, ShoppingCart } from 'lucide-react';
import React from 'react';

export const BADGE_PRICES: Record<string, number> = {
  snowflake: 300,
  computer: 300,
  star: 200,
  crown: 1000,
  diamond: 1500,
  heart: 150,
  award: 400,
  rocket: 600,
  leaf: 100,
  moon: 250,
  sun: 250,
  music: 200,
  book: 150,
  coffee: 100,
  gamepad: 350,
  gift: 200,
  smile: 100,
  sparkles: 300
};

export const THEME_PRICES: Record<string, number> = {
  black: 200,
  pink: 150,
  gray: 100,
  green: 150,
  blue: 200,
  purple: 250,
  orange: 200,
  red: 250
};

export const PATTERN_PRICES: Record<string, number> = {
  circles: 100,
  triangles: 150,
  squares: 150,
  flowers: 200,
  hearts: 250,
  stars: 300
};

export const ACHIEVEMENT_PRICES: Record<string, number> = {
  shopkeeper: 500,
  buyer: 100,
  shopping: 300,
  collector: 1000,
  big_spender: 2000,
  legendary: 1500,
  completionist: 5000,
  daily_shopper: 800
};

export const SHOP_ACHIEVEMENTS = [
  { id: 'shopkeeper', title: "Shopkeepers' Favorite", icon: ShoppingCart, color: "text-purple-500", description: "Spent 500 Origins" },
  { id: 'buyer', title: "Buyer", icon: ShoppingBag, color: "text-green-500", description: "Made first purchase" },
  { id: 'shopping', title: "Shopping", icon: Zap, color: "text-yellow-500", description: "Bought 3 items" },
  { id: 'collector', title: "Collector", icon: Star, color: "text-amber-500", description: "Collected 5 badges" },
  { id: 'big_spender', title: "Big Spender", icon: Trophy, color: "text-red-500", description: "Spent 2000 Origins" },
  { id: 'legendary', title: "Legendary", icon: Crown, color: "text-yellow-500", description: "Bought a legendary item" },
  { id: 'completionist', title: "Completionist", icon: Award, color: "text-emerald-500", description: "Collected all badges" },
  { id: 'daily_shopper', title: "Daily Shopper", icon: ShoppingBag, color: "text-blue-500", description: "Bought 3 days in a row" },
];

export const BADGE_CONFIG: Record<string, { icon: React.ElementType; color: string; key: string }> = {
  verified: { icon: BadgeCheck, color: 'text-blue-500', key: 'verified' },
  snowflake: { icon: Snowflake, color: 'text-cyan-400', key: 'snowflake' },
  computer: { icon: Hash, color: 'text-slate-500', key: 'computer' },
  star: { icon: Star, color: 'text-amber-400', key: 'star' },
  crown: { icon: Crown, color: 'text-yellow-500', key: 'crown' },
  diamond: { icon: Diamond, color: 'text-sky-400', key: 'diamond' },
  heart: { icon: Heart, color: 'text-pink-500', key: 'heart' },
  award: { icon: Award, color: 'text-emerald-500', key: 'award' },
  rocket: { icon: Rocket, color: 'text-red-500', key: 'rocket' },
  leaf: { icon: Leaf, color: 'text-green-600', key: 'leaf' },
  moon: { icon: Moon, color: 'text-indigo-400', key: 'moon' },
  sun: { icon: Sun, color: 'text-orange-500', key: 'sun' },
  music: { icon: Music, color: 'text-pink-600', key: 'music' },
  book: { icon: Book, color: 'text-amber-700', key: 'book' },
  coffee: { icon: Coffee, color: 'text-amber-700', key: 'coffee' },
  gamepad: { icon: Gamepad, color: 'text-purple-600', key: 'gamepad' },
  gift: { icon: Gift, color: 'text-red-500', key: 'gift' },
  smile: { icon: Smile, color: 'text-yellow-500', key: 'smile' },
  sparkles: { icon: Sparkles, color: 'text-purple-400', key: 'sparkles' },
};

export const PET_CONFIG = [
  { id: 'cat', key: 'cat', price: 100, image: 'https://mavebo-puce.vercel.app/cat.png', color: 'bg-amber-100' },
  { id: 'dog', key: 'dog', price: 150, image: 'https://mavebo-puce.vercel.app/dog.png', color: 'bg-orange-100' },
  { id: 'bat', key: 'bat', price: 300, image: 'https://mavebo-puce.vercel.app/bat.png', color: 'bg-purple-100' },
  { id: 'owl', key: 'owl', price: 500, image: 'https://mavebo-puce.vercel.app/owl.png', color: 'bg-indigo-100' },
];

export const GRADIENT_PRICES: Record<string, number> = {
  sunset: 3500,
  ocean: 4000,
  forest: 4500,
  fire: 5000,
  galaxy: 6000,
  candy: 3500,
  neon: 5500,
  retro: 4000
};

// Исправленные градиенты с универсальной поддержкой
export const GRADIENT_CONFIG: Record<string, { 
  key: string; 
  className: string;
  inlineStyle: React.CSSProperties;
}> = {
  sunset: { 
    key: 'sunset', 
    className: 'gradient-sunset',
    inlineStyle: {
      background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #ff9ff3 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block'
    }
  },
  ocean: { 
    key: 'ocean', 
    className: 'gradient-ocean',
    inlineStyle: {
      background: 'linear-gradient(135deg, #00b4db 0%, #0083b0 50%, #00d2ff 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block'
    }
  },
  forest: { 
    key: 'forest', 
    className: 'gradient-forest',
    inlineStyle: {
      background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 50%, #00b4db 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block'
    }
  },
  fire: { 
    key: 'fire', 
    className: 'gradient-fire',
    inlineStyle: {
      background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 50%, #f9d423 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block'
    }
  },
  galaxy: { 
    key: 'galaxy', 
    className: 'gradient-galaxy',
    inlineStyle: {
      background: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 50%, #6B46C1 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block'
    }
  },
  candy: { 
    key: 'candy', 
    className: 'gradient-candy',
    inlineStyle: {
      background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #a1c4fd 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block'
    }
  },
  neon: { 
    key: 'neon', 
    className: 'gradient-neon',
    inlineStyle: {
      background: 'linear-gradient(135deg, #00ff87 0%, #60efff 50%, #00d4ff 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block'
    }
  },
  retro: { 
    key: 'retro', 
    className: 'gradient-retro',
    inlineStyle: {
      background: 'linear-gradient(135deg, #f5af19 0%, #f12711 50%, #f5af19 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block'
    }
  }
};

// Функция для получения inline стиля градиента
export const getGradientStyle = (gradientName: string | null): React.CSSProperties => {
  if (!gradientName || !GRADIENT_CONFIG[gradientName]) {
    return {};
  }
  return GRADIENT_CONFIG[gradientName].inlineStyle;
};

export const FONT_PRICES: Record<string, number> = {
  modern: 0,
  serif: 2000,
  retro: 1500,
  futuristic: 2500,
  elegant: 3000,
  handwritten: 1000,
  comic: 4000,
  cute: 3500,
  scifi: 4500,
  marker: 3000,
  sf_italic: 5000
};

export const FONT_CONFIG: Record<string, { key: string; className: string; fontFamily?: string }> = {
  modern: { key: 'modern', className: 'font-sans', fontFamily: 'inherit' },
  serif: { key: 'serif', className: 'font-serif-display', fontFamily: '"Times New Roman", serif' },
  retro: { key: 'retro', className: 'font-retro-mono', fontFamily: '"Courier New", monospace' },
  futuristic: { key: 'futuristic', className: 'font-futuristic', fontFamily: '"Arial Black", sans-serif' },
  elegant: { key: 'elegant', className: 'font-elegant', fontFamily: '"Georgia", serif' },
  handwritten: { key: 'handwritten', className: 'font-handwritten', fontFamily: '"Comic Sans MS", cursive' },
  comic: { key: 'comic', className: 'font-comic tracking-wider', fontFamily: '"Comic Neue", cursive' },
  cute: { key: 'cute', className: 'font-cute', fontFamily: '"Quicksand", sans-serif' },
  scifi: { key: 'scifi', className: 'font-scifi tracking-tight', fontFamily: '"Orbitron", monospace' },
  marker: { key: 'marker', className: 'font-marker', fontFamily: '"Permanent Marker", cursive' },
  sf_italic: { key: 'sf_italic', className: 'font-[var(--font-sf)] italic uppercase font-bold tracking-tight', fontFamily: '"San Francisco", "Helvetica Neue", sans-serif' }
};

export const ALIAS_PRICES: Record<number, number> = {
  1: 10000,
  2: 8000,
  3: 6000,
  4: 4000,
  5: 2000,
  6: 900,
  7: 700
};

export function calculateAliasPrice(length: number): number {
  if (length === 0) return 0;
  return ALIAS_PRICES[length] || 500;
}
