import { Card } from "@/components/ui/card";
import { Heart, Zap, Sparkles } from "lucide-react";
import { hapticMedium } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { WisdomTicker } from "./wisdom-ticker";
import { Link } from "wouter";

interface StateCheckProps {
  onSelect: (type: "mood" | "task") => void;
}

export function StateCheck({ onSelect }: StateCheckProps) {
  const handleSelect = (type: "mood" | "task") => {
    hapticMedium();
    onSelect(type);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4 py-8">
      <div className="text-center mb-12">
        <h1 
          className="text-4xl font-bold text-foreground mb-1"
          data-testid="text-greeting"
        >
          歡迎回來 大師
        </h1>
        <p className="text-xs text-muted-foreground mb-6" data-testid="text-subtitle-en">
          welcome back, Master
        </p>
        <p className="text-xl text-foreground font-medium" data-testid="text-question">
          今天的顯化是什麼？
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 w-full max-w-sm">
        <Card
          className={cn(
            "relative p-8 cursor-pointer transition-all duration-300",
            "hover-elevate active-elevate-2 border border-border",
            "bg-gradient-to-br from-purple-900/20 to-purple-800/10",
            "hover:border-purple-500/50"
          )}
          onClick={() => handleSelect("mood")}
          data-testid="card-mood"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Heart className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                調頻 (Alignment)
              </h2>
              <p className="text-muted-foreground">
                處理情緒，清理內在空間
              </p>
            </div>
          </div>
          <div className="absolute inset-0 rounded-md bg-purple-500/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
        </Card>

        <Card
          className={cn(
            "relative p-8 cursor-pointer transition-all duration-300",
            "hover-elevate active-elevate-2 border border-border",
            "bg-gradient-to-br from-blue-900/20 to-blue-800/10",
            "hover:border-blue-500/50"
          )}
          onClick={() => handleSelect("task")}
          data-testid="card-task"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Zap className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                創造 (Creation)
              </h2>
              <p className="text-muted-foreground">
                執行任務，建構人生奇觀
              </p>
            </div>
          </div>
          <div className="absolute inset-0 rounded-md bg-blue-500/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
        </Card>

        <Link href="/test-mandalart">
          <Card
            className={cn(
              "relative p-8 cursor-pointer transition-all duration-300",
              "hover-elevate active-elevate-2 border border-border",
              "bg-gradient-to-br from-amber-900/20 to-amber-800/10",
              "hover:border-amber-500/50"
            )}
            onClick={() => hapticMedium()}
            data-testid="card-summon"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  召喚 (Summon)
                </h2>
                <p className="text-muted-foreground">
                  AI 曼陀羅計劃生成
                </p>
              </div>
            </div>
            <div className="absolute inset-0 rounded-md bg-amber-500/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
          </Card>
        </Link>
      </div>

      <div className="mt-12 w-full">
        <WisdomTicker />
      </div>
    </div>
  );
}
