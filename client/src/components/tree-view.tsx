import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
  ChevronRight, 
  ChevronDown,
  Zap,
  AlertTriangle,
  GitBranch,
  FolderTree,
  Pencil,
  Plus,
  Copy,
  Clock,
  Star,
  Calendar,
  Share2,
  Percent
} from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
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
  onEdit: (task: Task) => void;
  onAddSubtask: (parentId: string) => void;
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
  onEdit,
  onAddSubtask,
  expandedNodes,
  toggleNode
}: TreeNodeProps) {
  const hasChildren = children.length > 0;
  const isExpanded = expandedNodes.has(task.id);
  const isCompleted = task.status === "completed";
  const categoryBadge = getCategoryBadge(task.category);
  const isKeyAction = task.isKeyAction === 1;
  
  const completedChildren = children.filter(c => c.status === "completed").length;
  const totalChildren = children.length;
  
  const calculateChildrenWeight = () => {
    if (!hasChildren) return 0;
    return children.reduce((sum, c) => sum + (c.weightPercent || 0), 0);
  };
  
  const calculateProgress = () => {
    if (!hasChildren) return isCompleted ? 100 : 0;
    let completedWeight = 0;
    children.forEach(c => {
      if (c.status === "completed") {
        completedWeight += c.weightPercent || 0;
      }
    });
    const totalWeight = calculateChildrenWeight();
    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  };

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
          "flex items-start gap-2 py-2 px-3 rounded-md transition-all group",
          "hover:bg-muted/50",
          isCompleted && "opacity-60",
          isKeyAction && "ring-1 ring-amber-500/30 bg-amber-500/5"
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
            {isKeyAction && (
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            )}
            <span className={cn(
              "text-sm",
              isCompleted && "line-through text-muted-foreground"
            )}>
              {task.content}
            </span>
            
            {task.weightPercent !== null && task.weightPercent !== undefined && (
              <Badge variant="outline" className="text-xs py-0 gap-1 bg-primary/10 border-primary/30 text-primary">
                <Percent className="w-2.5 h-2.5" />
                {task.weightPercent}%
              </Badge>
            )}
            
            {categoryBadge && (
              <Badge 
                variant="outline" 
                className={cn("text-xs py-0", categoryBadge.className)}
              >
                {categoryBadge.label}
              </Badge>
            )}
            
            <QuadrantBadge quadrant={task.quadrant as QuadrantType | null} taskId={task.id} />
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-5 h-5"
                onClick={() => {
                  hapticLight();
                  onEdit(task);
                }}
                data-testid={`button-edit-tree-${task.id}`}
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-5 h-5"
                onClick={() => {
                  hapticLight();
                  onAddSubtask(task.id);
                }}
                data-testid={`button-add-subtask-${task.id}`}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.estimatedAt && (
              <Badge variant="outline" className="text-xs h-5 gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(task.estimatedAt), "M/d HH:mm", { locale: zhTW })}
              </Badge>
            )}
            
            <Badge variant="secondary" className="text-xs h-5">
              <Zap className="w-3 h-3 mr-1" />
              {task.xpValue}
            </Badge>
            
            {hasChildren && (
              <>
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
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs h-5 gap-1",
                    calculateProgress() === 100 && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  )}
                >
                  {calculateProgress()}% 完成
                </Badge>
              </>
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
                AI拆解
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
              onEdit={onEdit}
              onAddSubtask={onAddSubtask}
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
  onEdit: (task: Task) => void;
  onAddSubtask: (parentId: string) => void;
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
  onEdit,
  onAddSubtask,
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
                onEdit={onEdit}
                onAddSubtask={onAddSubtask}
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingSubtaskParentId, setAddingSubtaskParentId] = useState<string | null>(null);
  const [newSubtaskContent, setNewSubtaskContent] = useState("");
  const [editForm, setEditForm] = useState({
    content: "",
    weightPercent: 100,
    estimatedAt: "",
    quadrant: "" as string,
    isKeyAction: false,
  });

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
  
  const updateTask = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setEditingTask(null);
      toast({
        title: "任務已更新",
        description: "任務資訊已儲存",
      });
    },
  });
  
  const createSubtask = useMutation({
    mutationFn: async ({ parentId, content }: { parentId: string; content: string }) => {
      const parentTask = allTasks.find(t => t.id === parentId);
      const response = await apiRequest("POST", "/api/tasks", {
        content,
        parentId,
        monumentId: parentTask?.monumentId,
        weightPercent: 50,
        quadrant: parentTask?.quadrant || "Q2",
      });
      return response.json();
    },
    onSuccess: (_, { parentId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setExpandedNodes(prev => new Set([...prev, parentId]));
      setAddingSubtaskParentId(null);
      setNewSubtaskContent("");
      toast({
        title: "子任務已新增",
        description: "新子任務已建立",
      });
    },
  });
  
  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setEditForm({
      content: task.content,
      weightPercent: task.weightPercent || 100,
      estimatedAt: task.estimatedAt ? format(new Date(task.estimatedAt), "yyyy-MM-dd'T'HH:mm") : "",
      quadrant: task.quadrant || "",
      isKeyAction: task.isKeyAction === 1,
    });
  };
  
  const handleSaveEdit = () => {
    if (!editingTask) return;
    updateTask.mutate({
      taskId: editingTask.id,
      updates: {
        content: editForm.content,
        weightPercent: editForm.weightPercent,
        estimatedAt: editForm.estimatedAt ? new Date(editForm.estimatedAt) : null,
        quadrant: (editForm.quadrant || null) as Task["quadrant"],
        isKeyAction: editForm.isKeyAction ? 1 : 0,
      },
    });
  };
  
  const handleAddSubtask = (parentId: string) => {
    setAddingSubtaskParentId(parentId);
    setNewSubtaskContent("");
  };
  
  const handleConfirmAddSubtask = () => {
    if (!addingSubtaskParentId || !newSubtaskContent.trim()) return;
    createSubtask.mutate({
      parentId: addingSubtaskParentId,
      content: newSubtaskContent.trim(),
    });
  };
  
  const generateExportText = () => {
    const buildTaskTree = (tasks: Task[], parentId: string | null = null, level: number = 0): string => {
      return tasks
        .filter(t => t.parentId === parentId)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(task => {
          const indent = "  ".repeat(level);
          const keyMark = task.isKeyAction === 1 ? "★" : "-";
          const status = task.status === "completed" ? "✓" : "○";
          const weight = task.weightPercent ? ` (${task.weightPercent}%)` : "";
          const deadline = task.estimatedAt ? ` [預計: ${format(new Date(task.estimatedAt), "yyyy-MM-dd HH:mm")}]` : "";
          const quadrant = task.quadrant ? ` [${task.quadrant}]` : "";
          
          let line = `${indent}${keyMark} ${status} ${task.content}${weight}${deadline}${quadrant}\n`;
          line += buildTaskTree(tasks, task.id, level + 1);
          return line;
        })
        .join("");
    };
    
    let exportText = "# 任務清單導出\n\n";
    exportText += `導出時間: ${format(new Date(), "yyyy-MM-dd HH:mm")}\n`;
    exportText += `總任務數: ${allTasks.length} | 已完成: ${allTasks.filter(t => t.status === "completed").length}\n\n`;
    
    monuments.forEach(m => {
      const monumentTasks = allTasks.filter(t => t.monumentId === m.id);
      if (monumentTasks.length > 0) {
        const config = MONUMENTS.find(mc => mc.slug === m.slug);
        exportText += `## ${config?.nameCn || m.name}\n\n`;
        exportText += buildTaskTree(monumentTasks);
        exportText += "\n";
      }
    });
    
    exportText += "\n---\n";
    exportText += "請根據以上任務清單，協助我進行以下分析：\n";
    exportText += "1. 識別最關鍵的 80/20 任務\n";
    exportText += "2. 建議任務的優先順序\n";
    exportText += "3. 評估時間安排是否合理\n";
    
    return exportText;
  };
  
  const handleExport = async () => {
    const text = generateExportText();
    try {
      await navigator.clipboard.writeText(text);
      hapticSuccess();
      toast({
        title: "已複製到剪貼簿",
        description: "可以貼上到其他 AI 進行討論",
      });
    } catch {
      toast({
        title: "複製失敗",
        description: "請手動選取並複製",
        variant: "destructive",
      });
    }
  };

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
  const keyActionCount = allTasks.filter(t => t.isKeyAction === 1).length;

  return (
    <>
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
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              data-testid="button-export-tasks"
              className="gap-1"
            >
              <Share2 className="w-4 h-4" />
              導出
            </Button>
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
        
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border text-sm flex-wrap">
          <span className="text-muted-foreground">
            {completedTasks}/{totalTasks} 完成
          </span>
          <Badge variant="secondary">
            <Zap className="w-3 h-3 mr-1" />
            {totalXp} XP
          </Badge>
          {keyActionCount > 0 && (
            <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-500 border-amber-500/30">
              <Star className="w-3 h-3 fill-amber-500" />
              {keyActionCount} 關鍵任務
            </Badge>
          )}
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
                onEdit={handleEdit}
                onAddSubtask={handleAddSubtask}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
                isExpanded={expandedMonuments.has(m.id)}
                onToggle={() => toggleMonument(m.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
      
      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>編輯任務</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>任務內容</Label>
              <Input
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                placeholder="具體、可衡量的任務描述"
                data-testid="input-edit-task-content"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                權重百分比: {editForm.weightPercent}%
              </Label>
              <Slider
                value={[editForm.weightPercent]}
                onValueChange={([val]) => setEditForm({ ...editForm, weightPercent: val })}
                min={1}
                max={100}
                step={5}
                data-testid="slider-weight-percent"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                預估完成時間
              </Label>
              <Input
                type="datetime-local"
                value={editForm.estimatedAt}
                onChange={(e) => setEditForm({ ...editForm, estimatedAt: e.target.value })}
                data-testid="input-estimated-at"
              />
            </div>
            
            <div className="space-y-2">
              <Label>緊急重要程度</Label>
              <Select
                value={editForm.quadrant}
                onValueChange={(val) => setEditForm({ ...editForm, quadrant: val })}
              >
                <SelectTrigger data-testid="select-quadrant">
                  <SelectValue placeholder="選擇象限" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1 緊急且重要</SelectItem>
                  <SelectItem value="Q2">Q2 不緊急但重要</SelectItem>
                  <SelectItem value="Q3">Q3 緊急但不重要</SelectItem>
                  <SelectItem value="Q4">Q4 不緊急也不重要</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="isKeyAction"
                checked={editForm.isKeyAction}
                onCheckedChange={(checked) => setEditForm({ ...editForm, isKeyAction: !!checked })}
                data-testid="checkbox-key-action"
              />
              <Label htmlFor="isKeyAction" className="flex items-center gap-2 cursor-pointer">
                <Star className="w-4 h-4 text-amber-500" />
                80/20 關鍵任務
              </Label>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingTask(null)}
              >
                取消
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveEdit}
                disabled={updateTask.isPending}
                data-testid="button-save-edit"
              >
                {updateTask.isPending ? "儲存中..." : "儲存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Add Subtask Dialog */}
      <Dialog open={!!addingSubtaskParentId} onOpenChange={(open) => !open && setAddingSubtaskParentId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增子任務</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>子任務內容</Label>
              <Input
                value={newSubtaskContent}
                onChange={(e) => setNewSubtaskContent(e.target.value)}
                placeholder="輸入具體的子任務"
                data-testid="input-new-subtask"
                autoFocus
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAddingSubtaskParentId(null)}
              >
                取消
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmAddSubtask}
                disabled={!newSubtaskContent.trim() || createSubtask.isPending}
                data-testid="button-confirm-subtask"
              >
                {createSubtask.isPending ? "新增中..." : "新增"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
