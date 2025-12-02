import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { List, Calendar, FolderTree, History } from "lucide-react";
import { hapticMedium } from "@/lib/haptics";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserSettings } from "@shared/schema";

export type ViewMode = "list" | "calendar" | "tree";

interface ViewModeInfo {
  id: ViewMode;
  label: string;
  labelCn: string;
  icon: typeof List;
  description: string;
}

export const VIEW_MODES: ViewModeInfo[] = [
  {
    id: "list",
    label: "List",
    labelCn: "清單",
    icon: List,
    description: "傳統任務清單檢視",
  },
  {
    id: "calendar",
    label: "Calendar",
    labelCn: "行事曆",
    icon: Calendar,
    description: "週行事曆時間軸檢視",
  },
  {
    id: "tree",
    label: "Tree",
    labelCn: "樹狀",
    icon: FolderTree,
    description: "階層式任務結構檢視",
  },
];

interface ViewModeToggleProps {
  currentMode?: ViewMode;
  onModeChange?: (mode: ViewMode) => void;
  compact?: boolean;
}

export function ViewModeToggle({ 
  currentMode: externalMode, 
  onModeChange: externalOnChange,
  compact = false 
}: ViewModeToggleProps) {
  const { toast } = useToast();

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const updateViewMode = useMutation({
    mutationFn: async (newMode: ViewMode) => {
      const response = await apiRequest("PATCH", "/api/settings", { viewMode: newMode });
      return response.json();
    },
    onMutate: async (newMode) => {
      await queryClient.cancelQueries({ queryKey: ["/api/settings"] });
      const previousSettings = queryClient.getQueryData<UserSettings>(["/api/settings"]);
      queryClient.setQueryData<UserSettings>(["/api/settings"], (old) => {
        if (!old) return old;
        return { ...old, viewMode: newMode };
      });
      return { previousSettings };
    },
    onError: (_err, _newMode, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(["/api/settings"], context.previousSettings);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const recordViewChange = useMutation({
    mutationFn: async ({ fromMode, toMode }: { fromMode?: ViewMode; toMode: ViewMode }) => {
      const response = await apiRequest("POST", "/api/view-mode-history", {
        fromMode,
        toMode,
        metadata: { triggeredBy: "user" },
      });
      return response.json();
    },
  });

  const currentMode = externalMode || (settings?.viewMode as ViewMode) || "list";

  const handleModeChange = (newMode: ViewMode) => {
    if (newMode === currentMode) return;
    
    hapticMedium();
    
    recordViewChange.mutate({ 
      fromMode: currentMode, 
      toMode: newMode 
    });
    
    if (externalOnChange) {
      externalOnChange(newMode);
    } else {
      updateViewMode.mutate(newMode);
    }
    
    const modeInfo = VIEW_MODES.find(m => m.id === newMode);
    toast({
      title: `切換至${modeInfo?.labelCn}模式`,
      description: modeInfo?.description,
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
        {VIEW_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          
          return (
            <Button
              key={mode.id}
              variant={isActive ? "secondary" : "ghost"}
              size="icon"
              className="w-8 h-8"
              onClick={() => handleModeChange(mode.id)}
              data-testid={`button-view-mode-${mode.id}`}
            >
              <Icon className={cn("w-4 h-4", isActive && "text-primary")} />
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex gap-2 p-1 bg-muted/30 rounded-lg">
      {VIEW_MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;
        
        return (
          <Button
            key={mode.id}
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 gap-2",
              isActive && "bg-background shadow-sm"
            )}
            onClick={() => handleModeChange(mode.id)}
            data-testid={`button-view-mode-${mode.id}`}
          >
            <Icon className={cn("w-4 h-4", isActive && "text-primary")} />
            <span className="hidden sm:inline">{mode.labelCn}</span>
          </Button>
        );
      })}
    </div>
  );
}

interface ViewModeHistoryProps {
  maxItems?: number;
}

export function ViewModeHistory({ maxItems = 10 }: ViewModeHistoryProps) {
  const { data: history = [] } = useQuery<Array<{
    id: string;
    fromMode: ViewMode | null;
    toMode: ViewMode;
    createdAt: string;
    metadata?: { triggeredBy?: string };
  }>>({
    queryKey: ["/api/view-mode-history"],
  });

  if (history.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        尚無檢視切換記錄
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.slice(0, maxItems).map((item) => {
        const fromInfo = item.fromMode ? VIEW_MODES.find(m => m.id === item.fromMode) : null;
        const toInfo = VIEW_MODES.find(m => m.id === item.toMode);
        const FromIcon = fromInfo?.icon || History;
        const ToIcon = toInfo?.icon || List;
        
        return (
          <div 
            key={item.id}
            className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/30"
          >
            <History className="w-4 h-4 text-muted-foreground shrink-0" />
            
            {fromInfo ? (
              <>
                <Badge variant="outline" className="gap-1">
                  <FromIcon className="w-3 h-3" />
                  {fromInfo.labelCn}
                </Badge>
                <span className="text-muted-foreground">→</span>
              </>
            ) : (
              <span className="text-muted-foreground">首次選擇</span>
            )}
            
            <Badge variant="secondary" className="gap-1">
              <ToIcon className="w-3 h-3" />
              {toInfo?.labelCn || item.toMode}
            </Badge>
            
            <span className="flex-1" />
            
            <span className="text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleString("zh-TW", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
