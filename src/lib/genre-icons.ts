import {
  User, UserRound, Cat, Dog, Bird, Fish, Rabbit, Squirrel, Turtle,
  Bug, Ghost, Skull, Crown, Heart, Star, Flame, Gem, Shield,
  Swords, Wand2, Eye, Moon, Sun, Leaf, Flower2, Snail,
  CircleHelp, Bot, Rat, Drama,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface GenreIconDef {
  name: string;
  icon: LucideIcon;
}

export const GENRE_ICONS: GenreIconDef[] = [
  { name: "user", icon: User },
  { name: "user-round", icon: UserRound },
  { name: "cat", icon: Cat },
  { name: "dog", icon: Dog },
  { name: "bird", icon: Bird },
  { name: "fish", icon: Fish },
  { name: "rabbit", icon: Rabbit },
  { name: "squirrel", icon: Squirrel },
  { name: "turtle", icon: Turtle },
  { name: "bug", icon: Bug },
  { name: "snail", icon: Snail },
  { name: "rat", icon: Rat },
  { name: "ghost", icon: Ghost },
  { name: "skull", icon: Skull },
  { name: "bot", icon: Bot },
  { name: "crown", icon: Crown },
  { name: "heart", icon: Heart },
  { name: "star", icon: Star },
  { name: "flame", icon: Flame },
  { name: "gem", icon: Gem },
  { name: "shield", icon: Shield },
  { name: "swords", icon: Swords },
  { name: "wand-2", icon: Wand2 },
  { name: "eye", icon: Eye },
  { name: "moon", icon: Moon },
  { name: "sun", icon: Sun },
  { name: "leaf", icon: Leaf },
  { name: "flower-2", icon: Flower2 },
  { name: "circle-help", icon: CircleHelp },
  { name: "drama", icon: Drama },
];

export const GENRE_COLORS: string[] = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#6b7280", // gray
  "#78716c", // stone
  "#888888", // default
];

export function getGenreIcon(name: string): LucideIcon {
  return GENRE_ICONS.find((i) => i.name === name)?.icon ?? User;
}
