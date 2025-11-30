import { Home, Mountain, History, User } from "lucide-react";
import { hapticLight } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export type NavTab = "home" | "monuments" | "history" | "profile";

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const navItems: { id: NavTab; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "首頁" },
  { id: "monuments", icon: Mountain, label: "奇觀" },
  { id: "history", icon: History, label: "歷史" },
  { id: "profile", icon: User, label: "我的" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-xl border-t border-border safe-area-inset-bottom z-50"
      data-testid="nav-bottom"
    >
      <div className="flex items-center justify-around h-full max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                hapticLight();
                onTabChange(item.id);
              }}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full",
                "transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              data-testid={`nav-${item.id}`}
            >
              <div
                className={cn(
                  "relative p-2 rounded-xl transition-all",
                  isActive && "bg-primary/10 shadow-lg shadow-primary/30"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform",
                    isActive && "scale-110"
                  )}
                />
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-primary/5 animate-pulse" />
                )}
              </div>
              <span className={cn(
                "text-xs mt-1",
                isActive && "font-medium"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
