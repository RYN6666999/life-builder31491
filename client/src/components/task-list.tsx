import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronDown, ChevronRight, Zap, AlertTriangle } from "lucide-react";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { QuadrantBadge, type QuadrantType } from "./quadrant-tabs";
import type { Task } from "@shared/schema";
import type { MonumentConfig } from "@/lib/monuments";

interface TaskListProps {
  monument: MonumentConfig;
  tasks: Task[];
  onComplete: (taskId: string) => void;
  onBreakdown: (taskId: string) => void;
  onBack: () => void;
}

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
}

function TaskItem({ task, childTasks, allTasks, level, onComplete, onBreakdown }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
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
              <QuadrantBadge quadrant={task.quadrant as QuadrantType | null} />
            </div>
            
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskList({ monument, tasks, onComplete, onBreakdown, onBack }: TaskListProps) {
  const rootTasks = tasks.filter((t) => !t.parentId);
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalXp = tasks
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.xpValue, 0);

  const Icon = monument.icon;
  
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
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-3">
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
          <div className="flex items-center gap-2">
            <Icon className={cn("w-5 h-5", getIconColor(monument.slug))} />
            <span className="font-medium">{monument.nameCn} 任務</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {completedCount} / {tasks.length} 完成
          </span>
          <Badge variant="secondary">
            <Zap className="w-3 h-3 mr-1" />
            {totalXp} XP 已獲得
          </Badge>
        </div>
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-2">
          {rootTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">暫無任務</p>
              <p className="text-sm text-muted-foreground mt-1">
                開始與 AI 對話來創建任務
              </p>
            </div>
          ) : (
            rootTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                childTasks={tasks.filter((t) => t.parentId === task.id)}
                allTasks={tasks}
                level={0}
                onComplete={onComplete}
                onBreakdown={onBreakdown}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
