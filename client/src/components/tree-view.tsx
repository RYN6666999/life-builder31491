import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { 
  ChevronRight, 
  ChevronDown,
  Zap,
  AlertTriangle,
  GitBranch,
  FolderTree
} from "lucide-react";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QuadrantBadge, type QuadrantType } from "@/components/quadrant-tabs";
import { MONUMENTS } from "@/lib/monuments";
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

interface TreeNodeProps {
  task: Task;
  children: Task[];
  allTasks: Task[];
  level: number;
  onComplete: (taskId: string) => void;
  onBreakdown: (taskId: string) => void;
  expandedNodes: Set<string>;
  toggleNode: (taskId: string) => void;
}

function TreeNode({ 
  task, 
  children, 
  allTasks,
  level,
  onComplete,
  onBreakdown,
  expandedNodes,
  toggleNode
}: TreeNodeProps) {
  const hasChildren = children.length > 0;
  const isExpanded = expandedNodes.has(task.id);
  const isCompleted = task.status === "completed";
  const categoryBadge = getCategoryBadge(task.category);
  
  const completedChildren = children.filter(c => c.status === "completed").length;
  const totalChildren = children.length;

  const handleCheck = () => {
    if (!isCompleted) {
      hapticSuccess();
      onComplete(task.id);
    }
  };

  return (
    <div className="relative">
      {level > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 border-l-2 border-border/50"
          style={{ left: `${(level - 1) * 24 + 10}px` }}
        />
      )}
      
      <div 
        className={cn(
          "flex items-start gap-2 py-2 px-3 rounded-md transition-all",
          "hover:bg-muted/50",
          isCompleted && "opacity-60"
        )}
        style={{ paddingLeft: `${level * 24 + 8}px` }}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5 shrink-0 -ml-1"
            onClick={() => {
              hapticLight();
              toggleNode(task.id);
            }}
            data-testid={`button-toggle-tree-${task.id}`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        ) : (
          <div className="w-5 h-5 shrink-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-border" />
          </div>
        )}
        
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleCheck}
          className={cn(
            "mt-0.5 w-4 h-4 shrink-0",
            isCompleted && "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
          )}
          data-testid={`checkbox-tree-${task.id}`}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-sm",
              isCompleted && "line-through text-muted-foreground"
            )}>
              {task.content}
            </span>
            
            {categoryBadge && (
              <Badge 
                variant="outline" 
                className={cn("text-xs py-0", categoryBadge.className)}
              >
                {categoryBadge.label}
              </Badge>
            )}
            
            <QuadrantBadge quadrant={task.quadrant as QuadrantType | null} taskId={task.id} />
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs h-5">
              <Zap className="w-3 h-3 mr-1" />
              {task.xpValue}
            </Badge>
            
            {hasChildren && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs h-5 gap-1",
                  completedChildren === totalChildren && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                )}
              >
                <GitBranch className="w-3 h-3" />
                {completedChildren}/{totalChildren}
              </Badge>
            )}
            
            {!isCompleted && !hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  hapticMedium();
                  onBreakdown(task.id);
                }}
                className="h-5 text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 px-1.5"
                data-testid={`button-breakdown-tree-${task.id}`}
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                拆解
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {children.map(child => (
            <TreeNode
              key={child.id}
              task={child}
              children={allTasks.filter(t => t.parentId === child.id)}
              allTasks={allTasks}
              level={level + 1}
              onComplete={onComplete}
              onBreakdown={onBreakdown}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MonumentTreeProps {
  monument: Monument;
  tasks: Task[];
  onComplete: (taskId: string) => void;
  onBreakdown: (taskId: string) => void;
  expandedNodes: Set<string>;
  toggleNode: (taskId: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

function MonumentTree({ 
  monument, 
  tasks, 
  onComplete, 
  onBreakdown,
  expandedNodes,
  toggleNode,
  isExpanded,
  onToggle
}: MonumentTreeProps) {
  const monumentConfig = MONUMENTS.find(m => m.slug === monument.slug);
  if (!monumentConfig) return null;
  
  const Icon = monumentConfig.icon;
  const rootTasks = tasks.filter(t => !t.parentId);
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const totalXp = tasks.filter(t => t.status === "completed").reduce((sum, t) => sum + t.xpValue, 0);
  
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
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Card 
          className="p-3 hover-elevate cursor-pointer"
          data-testid={`card-monument-tree-${monument.slug}`}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              "bg-muted"
            )}>
              <Icon className={cn("w-5 h-5", getIconColor(monument.slug))} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{monumentConfig.nameCn}</span>
                <Badge variant="secondary" className="text-xs">
                  <Zap className="w-3 h-3 mr-0.5" />
                  {totalXp}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{completedTasks}/{tasks.length} 完成</span>
                <span>·</span>
                <span>{rootTasks.length} 根任務</span>
              </div>
            </div>
            
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </Card>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="ml-5 mt-2 border-l-2 border-border/50 pl-2">
          {rootTasks.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground text-sm">
              暫無任務
            </div>
          ) : (
            rootTasks.map(task => (
              <TreeNode
                key={task.id}
                task={task}
                children={tasks.filter(t => t.parentId === task.id)}
                allTasks={tasks}
                level={0}
                onComplete={onComplete}
                onBreakdown={onBreakdown}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
              />
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

import type { MonumentConfig } from "@/lib/monuments";
import { ChevronLeft as BackIcon } from "lucide-react";

interface TreeViewProps {
  tasks?: Task[];
  monument?: MonumentConfig;
  onBack?: () => void;
  onComplete?: (taskId: string) => void;
}

export function TreeView({ tasks: propTasks, monument, onBack, onComplete }: TreeViewProps) {
  const { toast } = useToast();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [expandedMonuments, setExpandedMonuments] = useState<Set<string>>(new Set());

  const { data: monuments = [] } = useQuery<Monument[]>({
    queryKey: ["/api/monuments"],
  });

  const { data: fetchedTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: !propTasks,
  });
  
  const allTasks = propTasks || fetchedTasks;

  const tasksByMonument = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    monuments.forEach(m => {
      grouped[m.id] = allTasks.filter(t => t.monumentId === m.id);
    });
    return grouped;
  }, [monuments, allTasks]);

  const internalCompleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}/complete`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monuments"] });
      hapticSuccess();
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
        colors: ["#A855F7", "#3B82F6", "#10B981"],
      });
      toast({
        title: "任務完成！",
        description: "你已獲得經驗值",
      });
    },
  });
  
  const handleComplete = (taskId: string) => {
    if (onComplete) {
      onComplete(taskId);
    } else {
      internalCompleteTask.mutate(taskId);
    }
  };

  const breakdownTask = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest("POST", `/api/tasks/${taskId}/breakdown`, {});
      return response.json();
    },
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setExpandedNodes(prev => new Set([...prev, taskId]));
      toast({
        title: "任務已拆解",
        description: "AI 已將任務分解為更小的步驟",
      });
    },
  });

  const toggleNode = (taskId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleMonument = (monumentId: string) => {
    hapticLight();
    setExpandedMonuments(prev => {
      const next = new Set(prev);
      if (next.has(monumentId)) {
        next.delete(monumentId);
      } else {
        next.add(monumentId);
      }
      return next;
    });
  };

  const expandAll = () => {
    hapticMedium();
    setExpandedMonuments(new Set(monuments.map(m => m.id)));
    setExpandedNodes(new Set(allTasks.map(t => t.id)));
  };

  const collapseAll = () => {
    hapticMedium();
    setExpandedMonuments(new Set());
    setExpandedNodes(new Set());
  };

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === "completed").length;
  const totalXp = allTasks.filter(t => t.status === "completed").reduce((sum, t) => sum + t.xpValue, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              data-testid="button-tree-back"
            >
              <BackIcon className="w-5 h-5" />
            </Button>
          )}
          <FolderTree className="w-5 h-5 text-primary" />
          <span className="font-medium">任務樹</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
            data-testid="button-expand-all"
          >
            全展開
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            data-testid="button-collapse-all"
          >
            全收合
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border text-sm">
        <span className="text-muted-foreground">
          {completedTasks}/{totalTasks} 完成
        </span>
        <Badge variant="secondary">
          <Zap className="w-3 h-3 mr-1" />
          {totalXp} XP
        </Badge>
      </div>
      
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-3">
          {monuments.map(m => (
            <MonumentTree
              key={m.id}
              monument={m}
              tasks={tasksByMonument[m.id] || []}
              onComplete={handleComplete}
              onBreakdown={breakdownTask.mutate}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              isExpanded={expandedMonuments.has(m.id)}
              onToggle={() => toggleMonument(m.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
