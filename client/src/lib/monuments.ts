// Monument configuration and styling

import { Briefcase, Coins, Heart, Users, Activity, Compass } from "lucide-react";

export interface MonumentConfig {
  id: string;
  slug: string;
  name: string;
  nameCn: string;
  icon: typeof Briefcase;
  color: string;
  bgGradient: string;
  glowColor: string;
  description: string;
}

export const MONUMENTS: MonumentConfig[] = [
  {
    id: "career",
    slug: "career",
    name: "Career",
    nameCn: "事業",
    icon: Briefcase,
    color: "#3B82F6",
    bgGradient: "from-blue-600 to-blue-800",
    glowColor: "shadow-blue-500/50",
    description: "專業成就與知識精進",
  },
  {
    id: "wealth",
    slug: "wealth",
    name: "Wealth",
    nameCn: "財富",
    icon: Coins,
    color: "#F59E0B",
    bgGradient: "from-amber-500 to-amber-700",
    glowColor: "shadow-amber-500/50",
    description: "財務安全與經濟自由",
  },
  {
    id: "emotion",
    slug: "emotion",
    name: "Emotion",
    nameCn: "情感",
    icon: Heart,
    color: "#A855F7",
    bgGradient: "from-purple-500 to-purple-700",
    glowColor: "shadow-purple-500/50",
    description: "內在平靜與心靈福祉",
  },
  {
    id: "family",
    slug: "family",
    name: "Family",
    nameCn: "家庭",
    icon: Users,
    color: "#EC4899",
    bgGradient: "from-pink-500 to-pink-700",
    glowColor: "shadow-pink-500/50",
    description: "家庭連結與人際關係",
  },
  {
    id: "health",
    slug: "health",
    name: "Health",
    nameCn: "健康",
    icon: Activity,
    color: "#10B981",
    bgGradient: "from-emerald-500 to-emerald-700",
    glowColor: "shadow-emerald-500/50",
    description: "身體活力與心理韌性",
  },
  {
    id: "experience",
    slug: "experience",
    name: "Experience",
    nameCn: "體驗",
    icon: Compass,
    color: "#F97316",
    bgGradient: "from-orange-500 to-orange-700",
    glowColor: "shadow-orange-500/50",
    description: "人生體驗與利他貢獻",
  },
];

export function getMonumentBySlug(slug: string): MonumentConfig | undefined {
  return MONUMENTS.find((m) => m.slug === slug);
}

export function getMonumentById(id: string): MonumentConfig | undefined {
  return MONUMENTS.find((m) => m.id === id);
}
