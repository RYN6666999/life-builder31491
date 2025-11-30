import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MONUMENTS, type MonumentConfig } from "@/lib/monuments";
import { hapticMedium, hapticSelection } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

interface MonumentSelectionProps {
  onSelect: (monument: MonumentConfig) => void;
  onBack: () => void;
  monumentProgress?: Record<string, number>;
}

export function MonumentSelection({ onSelect, onBack, monumentProgress = {} }: MonumentSelectionProps) {
  const handleSelect = (monument: MonumentConfig) => {
    hapticMedium();
    onSelect(monument);
  };

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

  const getBgGradient = (slug: string) => {
    const gradientMap: Record<string, string> = {
      career: "from-blue-600/20 to-blue-800/10",
      wealth: "from-amber-500/20 to-amber-700/10",
      emotion: "from-purple-500/20 to-purple-700/10",
      family: "from-pink-500/20 to-pink-700/10",
      health: "from-emerald-500/20 to-emerald-700/10",
      experience: "from-orange-500/20 to-orange-700/10",
    };
    return gradientMap[slug] || "";
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

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] px-4 py-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            hapticSelection();
            onBack();
          }}
          data-testid="button-back"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground ml-2" data-testid="text-title">
          選擇目標領域
        </h1>
      </div>

      <p className="text-muted-foreground text-center mb-8" data-testid="text-subtitle">
        你想要建構哪一座人生奇觀？
      </p>

      <div className="grid grid-cols-2 gap-4 flex-1">
        {MONUMENTS.map((monument) => {
          const Icon = monument.icon;
          const progress = monumentProgress[monument.slug] || 0;
          
          return (
            <Card
              key={monument.id}
              className={cn(
                "relative aspect-square cursor-pointer transition-all duration-300",
                "hover-elevate active-elevate-2 border border-border",
                "bg-gradient-to-br",
                getBgGradient(monument.slug),
                "hover:scale-[1.02]",
                progress > 50 && getGlowClass(monument.slug)
              )}
              onClick={() => handleSelect(monument)}
              data-testid={`card-monument-${monument.slug}`}
            >
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <div 
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center mb-3",
                    "bg-background/30 backdrop-blur-sm"
                  )}
                >
                  <Icon className={cn("w-7 h-7", getIconColor(monument.slug))} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {monument.nameCn}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {monument.description}
                </p>
                
                {progress > 0 && (
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="h-1.5 bg-background/30 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          monument.slug === "career" && "bg-blue-500",
                          monument.slug === "wealth" && "bg-amber-500",
                          monument.slug === "emotion" && "bg-purple-500",
                          monument.slug === "family" && "bg-pink-500",
                          monument.slug === "health" && "bg-emerald-500",
                          monument.slug === "experience" && "bg-orange-500",
                        )}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {progress} XP
                    </p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground mt-6 text-center" data-testid="text-formula">
        R = ((E × A) × P) + X
      </p>
    </div>
  );
}
