import { Home, Mountain, History, Settings, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export type NavTab = "home" | "monuments" | "history" | "settings";

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCreateProject?: () => void;
}

const navItems: { id: NavTab | "create"; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "首頁" },
  { id: "monuments", icon: Mountain, label: "奇觀" },
  { id: "create", icon: Plus, label: "建立" },
  { id: "history", icon: History, label: "歷史" },
  { id: "settings", icon: Settings, label: "設定" },
];

export function BottomNav({ activeTab, onTabChange, onCreateProject }: BottomNavProps) {
  const [, setLocation] = useLocation();
  
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-xl border-t border-border safe-area-inset-bottom z-50"
      data-testid="nav-bottom"
    >
      <div className="flex items-center justify-around h-full max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id !== "create" && activeTab === item.id;
          const isCreateButton = item.id === "create";

          if (isCreateButton) {
            return (
              <button
                key={item.id}
                onClick={() => {
                  hapticSuccess();
                  onCreateProject?.();
                }}
                className="flex flex-col items-center justify-center w-16 h-full -mt-4"
                data-testid="nav-create-project"
              >
                <div className="relative p-3 rounded-full bg-primary shadow-lg shadow-primary/40 transition-transform active:scale-95">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                  <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse" />
                </div>
                <span className="text-xs mt-1 text-primary font-medium">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => {
                hapticLight();
                if (item.id === "settings") {
                  setLocation("/settings");
                } else {
                  onTabChange(item.id as NavTab);
                }
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
