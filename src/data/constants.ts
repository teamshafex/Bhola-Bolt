/**
 * Static UI configuration constants for preview-kit.
 * Displays official avatars, handles, and Punjabi comedy taglines.
 */
import { Persona, ChatterRole } from '../types';

export const PERSONAS: Persona[] = [
  {
    id: 'bandya',
    name: 'Bandya',
    handle: '@bandya-hoon',
    avatar_url: 'https://yt3.googleusercontent.com/HrV877shV7Oap0w_w7K2fPr61P360G-tS4R3iygAmG0poP36sjpwY5tcOb7XAUc5du_VcLjjLw=s900-c-k-c0x00ffffff-no-rj',
    avatarUrl: 'https://yt3.googleusercontent.com/HrV877shV7Oap0w_w7K2fPr61P360G-tS4R3iygAmG0poP36sjpwY5tcOb7XAUc5du_VcLjjLw=s900-c-k-c0x00ffffff-no-rj',
    tagline: 'The Stressed Comedic Crybaby',
    sampleDialogues: [
      'Maalik ek baat kahun? Aap ek number ke kameenay ho...😭',
      'bottal ka jin samjha hai?',
      'maroge tum maroge',
    ],
    specialtyTags: ['#DramaKing', '#OverStressed', '#CowardRoaster'],
  },
  {
    id: 'bhola',
    name: 'Bhola',
    handle: '@bhola-hoon',
    avatar_url: 'https://yt3.googleusercontent.com/S0kWdOzASqg9XIGURD4aIqtAZaLIyv0MZSS-G2ZkXe434bn7N5KyfhtyVqgC90ghq36P9y8H=s900-c-k-c0x00ffffff-no-rj',
    avatarUrl: 'https://yt3.googleusercontent.com/S0kWdOzASqg9XIGURD4aIqtAZaLIyv0MZSS-G2ZkXe434bn7N5KyfhtyVqgC90ghq36P9y8H=s900-c-k-c0x00ffffff-no-rj',
    tagline: 'The Raw Desi Roaster (Uncensored Punjabi Banter)',
    sampleDialogues: [
      'اوۓ بچے لکا لو بھولا فیر بار آگیا جے! 😤😈 بچے کو کیوں چھیڑ رہا ہے، baap سے بات کر نا🌚',
      'mainu phar lo',
      'cheer ke rkh du ga',
    ],
    specialtyTags: ['RawDesi', 'AaTeraJinnKaddan', 'Salay', 'GharWarJana'],
  },
  {
    id: 'baburao',
    name: 'Babu Rao',
    handle: '@baburao-hoon',
    avatar_url: 'https://yt3.googleusercontent.com/rBd03_24svcGnSIwueK9-bE75hsIYM4gMC5nc1znT1tvoHvibUBpHx6gHBW6ljGHUHUs1yeI6g=s900-c-k-c0x00ffffff-no-rj',
    avatarUrl: 'https://yt3.googleusercontent.com/rBd03_24svcGnSIwueK9-bE75hsIYM4gMC5nc1znT1tvoHvibUBpHx6gHBW6ljGHUHUs1yeI6g=s900-c-k-c0x00ffffff-no-rj',
    tagline: 'Wise Comeback Artist (Hera Pheri Core)',
    sampleDialogues: [
      "Babu Bhaiya se direct 'Babu'?! Iska toh game bajana padega... Yeh Baburao ka style hai! 😆",
      'ye baburao ka style hai',
      'Iska tou game bajana parega',
    ],
    specialtyTags: ['KhopdiTod', 'StyleHaiApna', 'MastJoke', 'UthaLeReBaba'],
  },
];

export const ROLE_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bgSubtle: string;
    border: string;
    iconName: 'Crown' | 'Zap' | 'Flame' | 'Shield' | 'User' | 'Heart' | 'Smile' | 'ShieldCheck';
  }
> = {
  streamer: {
    label: 'Host / Streamer',
    color: 'text-amber-400',
    bgSubtle: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    iconName: 'Crown',
  },
  vip_superchatter: {
    label: 'VIP Superchatter',
    color: 'text-purple-400',
    bgSubtle: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    iconName: 'Crown',
  },
  vip: {
    label: 'VIP Superchatter',
    color: 'text-purple-400',
    bgSubtle: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    iconName: 'Crown',
  },
  troll: {
    label: 'Toxic Troll',
    color: 'text-red-400',
    bgSubtle: 'bg-red-500/10',
    border: 'border-red-500/30',
    iconName: 'Flame',
  },
  mod_male: {
    label: 'Mod (Bhai)',
    color: 'text-blue-400',
    bgSubtle: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    iconName: 'Shield',
  },
  mod_female: {
    label: 'Mod (Baji)',
    color: 'text-pink-400',
    bgSubtle: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    iconName: 'ShieldCheck',
  },
  moderator: {
    label: 'Moderator',
    color: 'text-blue-400',
    bgSubtle: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    iconName: 'Shield',
  },
  mod: {
    label: 'Moderator',
    color: 'text-blue-400',
    bgSubtle: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    iconName: 'Shield',
  },
  female_viewer: {
    label: 'Female Viewer',
    color: 'text-rose-400',
    bgSubtle: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    iconName: 'Heart',
  },
  female: {
    label: 'Female Viewer',
    color: 'text-rose-400',
    bgSubtle: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    iconName: 'Heart',
  },
  regular_buddy: {
    label: 'Regular Buddy',
    color: 'text-emerald-400',
    bgSubtle: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    iconName: 'Zap',
  },
  regular: {
    label: 'Regular Buddy',
    color: 'text-emerald-400',
    bgSubtle: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    iconName: 'Zap',
  },
  general_viewer: {
    label: 'General Viewer',
    color: 'text-zinc-400',
    bgSubtle: 'bg-zinc-500/10',
    border: 'border-zinc-500/30',
    iconName: 'User',
  },
};

export function getRoleMeta(role: ChatterRole | string, customRoles?: any) {
  const normalized = (role || '').toLowerCase();
  return (
    ROLE_CONFIG[normalized] || {
      label: role,
      color: 'text-zinc-400',
      bgSubtle: 'bg-zinc-500/10',
      border: 'border-zinc-500/30',
      iconName: 'User',
    }
  );
}
