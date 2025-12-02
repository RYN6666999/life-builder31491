import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronLeft, 
  ChevronDown, 
  ChevronRight, 
  Zap, 
  AlertTriangle,
  Plus
} from "lucide-react";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  QuadrantTabs, 
  QuadrantBadge, 
  type QuadrantType,
  QUADRANTS
} from "@/components/quadrant-tabs";
import { MONUMENTS, type MonumentConfig } from "@/lib/monuments";
import type { Task, Monument } from "@shared/schema";
import confetti from "canvas-confetti";

function getCategoryBadge(category: string | null) {
  const badges: Record<string, { label: string; className: string }> = {
    E: { label: "消除", className: "bg-red-500/20 text-red-400 border-red-500/30" },
    A: { label: "累積", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    P: { label: "規劃", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    X: { label: "體驗", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  };
  return category ? badges[category] : null;
}

interface TaskItemProps {
  task: Task;
  childTasks: Task[];
  allTasks: Task[];
  level: number;
  onComplete: (taskId: string) => void;
  onBreakdown: (taskId: string) => void;
  onUpdateQuadrant: (taskId: string, quadrant: QuadrantType) => void;
}

function TaskItem({ 
  task, 
  childTasks, 
  allTasks, 
  level, 
  onComplete, 
  onBreakdown,
  onUpdateQuadrant 
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showQuadrantPicker, setShowQuadrantPicker] = useState(false);
  const hasChildren = childTasks.length > 0;
  const isCompleted = task.status === "completed";
  const categoryBadge = getCategoryBadge(task.category);

  const handleCheck = () => {
    if (!isCompleted) {
      hapticSuccess();
      onComplete(task.id);
    }
  };

  return (
    <div className={cn("space-y-2", level > 0 && "ml-6 border-l border-border pl-4")}>
      <Card
        className={cn(
          "p-4 transition-all duration-300",
          isCompleted && "opacity-60",
          !isCompleted && "hover-elevate"
        )}
        data-testid={`card-task-${task.id}`}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleCheck}
            className={cn(
              "mt-0.5 w-5 h-5",
              isCompleted && "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            )}
            data-testid={`checkbox-task-${task.id}`}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn(
                "text-sm",
                isCompleted && "line-through text-muted-foreground"
              )}>
                {task.content}
              </p>
              {categoryBadge && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs py-0", categoryBadge.className)}
                >
                  {categoryBadge.label}
                </Badge>
              )}
              <div 
                className="cursor-pointer"
                onClick={() => {
                  hapticLight();
                  setShowQuadrantPicker(!showQuadrantPicker);
                }}
                data-testid={`toggle-quadrant-picker-${task.id}`}
              >
                <QuadrantBadge quadrant={task.quadrant as QuadrantType | null} taskId={task.id} />
                {!task.quadrant && (
                  <Badge 
                    variant="outline" 
                    className="text-xs py-0 opacity-50 hover:opacity-100"
                    data-testid={`badge-add-quadrant-${task.id}`}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    象限
                  </Badge>
                )}
              </div>
            </div>

            {showQuadrantPicker && !isCompleted && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {QUADRANTS.map((q) => {
                  const Icon = q.icon;
                  return (
                    <Button
                      key={q.id}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        hapticMedium();
                        onUpdateQuadrant(task.id, q.id);
                        setShowQuadrantPicker(false);
                      }}
                      className={cn(
                        "h-7 px-2 text-xs gap-1",
                        task.quadrant === q.id && q.badgeClass
                      )}
                      data-testid={`button-set-quadrant-${q.id}-${task.id}`}
                    >
                      <Icon className={cn("w-3 h-3", q.className)} />
                      {q.labelCn}
                    </Button>
                  );
                })}
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                {task.xpValue} XP
              </Badge>
              
              {!isCompleted && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    hapticMedium();
                    onBreakdown(task.id);
                  }}
                  className="h-6 text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 px-2"
                  data-testid={`button-breakdown-${task.id}`}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  太難了
                </Button>
              )}
            </div>
          </div>

          {hasChildren && (
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              onClick={() => {
                hapticLight();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </Card>

      {hasChildren && isExpanded && (
        <div className="space-y-2">
          {childTasks.map((child) => (
            <TaskItem
              key={child.id}
              task={child}
              childTasks={allTasks.filter((t) => t.parentId === child.id)}
              allTasks={allTasks}
              level={level + 1}
              onComplete={onComplete}
              onBreakdown={onBreakdown}
              onUpdateQuadrant={onUpdateQuadrant}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MonumentDetail() {
  const { toast } = useToast();
  const [, params] = useRoute("/monuments/:slug");
  const monumentSlug = params?.slug || "";
  
  const [activeQuadrant, setActiveQuadrant] = useState<QuadrantType | null>(null);

  const monumentConfig = MONUMENTS.find(m => m.slug === monumentSlug);

  const { data: monuments = [] } = useQuery<Monument[]>({
    queryKey: ["/api/monuments"],
  });

  const monument = monuments.find(m => m.slug === monumentSlug);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", monument?.id],
    enabled: !!monument,
  });

  const filteredTasks = useMemo(() => {
    if (!activeQuadrant) return tasks;
    return tasks.filter(t => t.quadrant === activeQuadrant);
  }, [tasks, activeQuadrant]);

  const taskCounts = useMemo(() => {
    const counts: Record<QuadrantType, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    tasks.forEach(t => {
      if (t.quadrant && t.status !== "completed") {
        counts[t.quadrant as QuadrantType]++;
      }
    });
    return counts;
  }, [tasks]);

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}/complete`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monuments"] });
      hapticSuccess();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#A855F7", "#3B82F6", "#10B981"],
      });
      toast({
        title: "任務完成！",
        description: "你已獲得經驗值",
      });
    },
  });

  const breakdownTask = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest("POST", `/api/tasks/${taskId}/breakdown`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "任務已拆解",
        description: "AI 已將任務分解為更小的步驟",
      });
    },
  });

  const updateTaskQuadrant = useMutation({
    mutationFn: async ({ taskId, quadrant }: { taskId: string; quadrant: QuadrantType }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}`, { quadrant });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "象限已更新",
        description: "任務優先級已調整",
      });
    },
  });

  if (!monumentConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">紀念碑未找到</p>
      </div>
    );
  }

  const Icon = monumentConfig.icon;
  const rootTasks = filteredTasks.filter((t) => !t.parentId);
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalXp = tasks
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.xpValue, 0);

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
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm space-y-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              hapticLight();
              window.history.back();
            }}
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Icon className={cn("w-5 h-5", getIconColor(monumentConfig.slug))} />
            <span className="font-medium">{monumentConfig.nameCn}</span>
          </div>
          <div className="flex-1" />
          <Badge variant="secondary">
            <Zap className="w-3 h-3 mr-1" />
            {totalXp} XP
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {completedCount} / {tasks.length} 完成
          </span>
        </div>

        <QuadrantTabs 
          activeQuadrant={activeQuadrant} 
          onQuadrantChange={setActiveQuadrant}
          taskCounts={taskCounts}
        />
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-2">
          {tasksLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">載入中...</p>
            </div>
          ) : rootTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {activeQuadrant ? `沒有 ${QUADRANTS.find(q => q.id === activeQuadrant)?.labelCn} 任務` : "暫無任務"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                開始與 AI 對話來創建任務
              </p>
            </div>
          ) : (
            rootTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                childTasks={filteredTasks.filter((t) => t.parentId === task.id)}
                allTasks={filteredTasks}
                level={0}
                onComplete={completeTask.mutate}
                onBreakdown={breakdownTask.mutate}
                onUpdateQuadrant={(taskId, quadrant) => updateTaskQuadrant.mutate({ taskId, quadrant })}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
