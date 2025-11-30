import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MONUMENTS, type MonumentConfig } from "@/lib/monuments";
import { cn } from "@/lib/utils";
import { Zap, Trophy, TrendingUp, ChevronLeft } from "lucide-react";
import { hapticLight } from "@/lib/haptics";

interface MonumentProgress {
  slug: string;
  totalXp: number;
  completedTasks: number;
  level: number;
}

interface MonumentVisualizationProps {
  progress: MonumentProgress[];
  onSelectMonument: (monument: MonumentConfig) => void;
  onBack?: () => void;
}

function ProgressRing({ 
  progress, 
  size = 120, 
  strokeWidth = 8,
  color 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-muted/30"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="progress-ring-circle"
      />
    </svg>
  );
}

function MonumentCard({ 
  monument, 
  progress,
  onSelect 
}: { 
  monument: MonumentConfig; 
  progress: MonumentProgress;
  onSelect: () => void;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const Icon = monument.icon;
  
  const level = progress.level;
  const xpForNextLevel = (level + 1) * 100;
  const currentLevelXp = progress.totalXp % 100;
  const progressPercent = (currentLevelXp / 100) * 100;

  const getGlowClass = (slug: string) => {
    const glowMap: Record<string, string> = {
      career: "glow-blue",
      wealth: "glow-amber",
      emotion: "glow-purple",
      family: "glow-pink",
      health: "glow-emerald",
      experience: "glow-orange",
    };
    return glowMap[slug] || "";
  };

  const getColorHex = (slug: string) => {
    const colorMap: Record<string, string> = {
      career: "#3B82F6",
      wealth: "#F59E0B",
      emotion: "#A855F7",
      family: "#EC4899",
      health: "#10B981",
      experience: "#F97316",
    };
    return colorMap[slug] || "#8B5CF6";
  };

  const getIconColor = (slug: string) => {
    const colorMap: Record<string, string> = {
      career: "text-blue-400",
      wealth: "text-amber-400",
      emotion: "text-purple-400",
      family: "text-pink-400",
      health: "text-emerald-400",
      experience: "text-orange-400",
    };
    return colorMap[slug] || "";
  };

  useEffect(() => {
    if (progress.totalXp > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [progress.totalXp]);

  return (
    <Card
      className={cn(
        "relative overflow-visible p-6 cursor-pointer transition-all duration-300",
        "hover-elevate active-elevate-2 border border-border",
        level >= 5 && getGlowClass(monument.slug),
        isAnimating && "completion-pulse"
      )}
      onClick={() => {
        hapticLight();
        onSelect();
      }}
      data-testid={`card-monument-viz-${monument.slug}`}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <ProgressRing 
            progress={progressPercent} 
            size={80}
            strokeWidth={6}
            color={getColorHex(monument.slug)}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className={cn("w-8 h-8", getIconColor(monument.slug))} />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{monument.nameCn}</h3>
            <Badge variant="outline" className="text-xs">
              Lv.{level}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {monument.description}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {progress.totalXp} XP
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              {progress.completedTasks} 任務
            </span>
          </div>
        </div>

        <TrendingUp className={cn("w-5 h-5", getIconColor(monument.slug))} />
      </div>

      {/* Floating bricks animation on XP gain */}
      {isAnimating && (
        <div className="absolute -top-2 right-4">
          <div className={cn(
            "w-4 h-4 rounded-sm brick-fly",
            monument.slug === "career" && "bg-blue-500",
            monument.slug === "wealth" && "bg-amber-500",
            monument.slug === "emotion" && "bg-purple-500",
            monument.slug === "family" && "bg-pink-500",
            monument.slug === "health" && "bg-emerald-500",
            monument.slug === "experience" && "bg-orange-500",
          )} />
        </div>
      )}
    </Card>
  );
}

export function MonumentVisualization({ 
  progress, 
  onSelectMonument,
  onBack 
}: MonumentVisualizationProps) {
  const totalXp = progress.reduce((sum, p) => sum + p.totalXp, 0);
  const totalTasks = progress.reduce((sum, p) => sum + p.completedTasks, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                hapticLight();
                onBack();
              }}
              data-testid="button-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="text-xl font-semibold">我的人生奇觀</h1>
        </div>
        
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">{totalXp}</p>
            <p className="text-sm text-muted-foreground">總經驗值</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">{totalTasks}</p>
            <p className="text-sm text-muted-foreground">完成任務</p>
          </div>
        </div>
      </div>

      {/* Monument List */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {MONUMENTS.map((monument) => {
            const monumentProgress = progress.find((p) => p.slug === monument.slug) || {
              slug: monument.slug,
              totalXp: 0,
              completedTasks: 0,
              level: 0,
            };
            
            return (
              <MonumentCard
                key={monument.id}
                monument={monument}
                progress={monumentProgress}
                onSelect={() => onSelectMonument(monument)}
              />
            );
          })}
        </div>
      </ScrollArea>

      <div className="px-4 py-3 text-center border-t border-border">
        <p className="text-sm text-muted-foreground">
          R = ((E × A) × P) + X
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          每一份努力都在建構你的人生奇觀
        </p>
      </div>
    </div>
  );
}
