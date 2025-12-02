import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Sparkles,
  Clock,
  Zap,
  Star
} from "lucide-react";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday, addWeeks, subWeeks } from "date-fns";
import { zhTW } from "date-fns/locale";
import { QuadrantBadge, type QuadrantType, QUADRANTS } from "@/components/quadrant-tabs";
import type { Task, Monument } from "@shared/schema";

interface CalendarViewProps {
  monumentId?: string;
  tasks?: Task[];
  onAddTaskWithAI?: (date: Date) => void;
  onBack?: () => void;
  onComplete?: (taskId: string) => void;
  topKeyActionIds?: Set<string>;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getCategoryBadge(category: string | null) {
  const badges: Record<string, { label: string; className: string }> = {
    E: { label: "消", className: "bg-red-500/20 text-red-400" },
    A: { label: "累", className: "bg-green-500/20 text-green-400" },
    P: { label: "規", className: "bg-blue-500/20 text-blue-400" },
    X: { label: "驗", className: "bg-purple-500/20 text-purple-400" },
  };
  return category ? badges[category] : null;
}

interface TaskBlockProps {
  task: Task;
  onClick: () => void;
  onComplete?: (taskId: string) => void;
  isAutoHighlight?: boolean;
}

function TaskBlock({ task, onClick, onComplete, isAutoHighlight }: TaskBlockProps) {
  const categoryBadge = getCategoryBadge(task.category);
  const startHour = task.dueTime ? parseInt(task.dueTime.split(":")[0]) : 9;
  const duration = task.duration || 60;
  const heightPx = (duration / 60) * 48;
  
  const isCompleted = task.status === "completed";
  const isManualKeyAction = task.isKeyAction === 1;
  const isKeyAction = isManualKeyAction || isAutoHighlight;
  
  const handleCheckClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted && onComplete) {
      hapticSuccess();
      onComplete(task.id);
    }
  };
  
  return (
    <div
      className={cn(
        "absolute left-1 right-1 px-2 py-1 rounded-md text-xs cursor-pointer transition-all",
        "border-l-2 overflow-hidden",
        isCompleted && "opacity-50",
        task.quadrant === "Q1" && "bg-red-500/20 border-l-red-500",
        task.quadrant === "Q2" && "bg-blue-500/20 border-l-blue-500",
        task.quadrant === "Q3" && "bg-amber-500/20 border-l-amber-500",
        task.quadrant === "Q4" && "bg-gray-500/20 border-l-gray-500",
        !task.quadrant && "bg-muted border-l-border",
        isKeyAction && !isCompleted && "ring-1 ring-amber-500/50"
      )}
      style={{ 
        top: `${(startHour * 48) + 2}px`,
        height: `${Math.max(heightPx - 4, 20)}px`
      }}
      onClick={onClick}
      data-testid={`calendar-task-${task.id}`}
    >
      <div className="flex items-center gap-1">
        {onComplete && (
          <div 
            className={cn(
              "w-3 h-3 shrink-0 rounded border cursor-pointer",
              isCompleted ? "bg-emerald-500 border-emerald-500" : "border-current hover:bg-current/20"
            )}
            onClick={handleCheckClick}
            data-testid={`calendar-task-check-${task.id}`}
          />
        )}
        {isKeyAction && (
          <Star className={cn(
            "w-3 h-3 shrink-0",
            isManualKeyAction ? "text-amber-500 fill-amber-500" : "text-amber-400 fill-amber-400/50"
          )} />
        )}
        {categoryBadge && (
          <span className={cn("shrink-0 w-4 h-4 rounded text-[10px] flex items-center justify-center", categoryBadge.className)}>
            {categoryBadge.label}
          </span>
        )}
        <span className={cn("truncate font-medium", isCompleted && "line-through")}>
          {task.content}
        </span>
      </div>
      {duration > 30 && (
        <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{duration}分鐘</span>
        </div>
      )}
    </div>
  );
}

interface DayColumnProps {
  date: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (date: Date, hour?: number) => void;
  onComplete?: (taskId: string) => void;
  topKeyActionIds?: Set<string>;
}

function DayColumn({ date, tasks, onTaskClick, onAddTask, onComplete, topKeyActionIds }: DayColumnProps) {
  const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), date));
  const isCurrentDay = isToday(date);
  
  return (
    <div className="flex-1 min-w-[100px] border-r border-border last:border-r-0">
      <div 
        className={cn(
          "sticky top-0 z-10 p-2 text-center border-b border-border bg-background",
          isCurrentDay && "bg-primary/10"
        )}
      >
        <div className="text-xs text-muted-foreground">
          {format(date, "EEE", { locale: zhTW })}
        </div>
        <div className={cn(
          "text-lg font-semibold",
          isCurrentDay && "text-primary"
        )}>
          {format(date, "d")}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 mt-1"
          onClick={() => {
            hapticLight();
            onAddTask(date);
          }}
          data-testid={`button-add-task-${format(date, 'yyyy-MM-dd')}`}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="relative" style={{ height: `${24 * 48}px` }}>
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 h-12 border-b border-border/50 hover:bg-muted/30 cursor-pointer"
            style={{ top: `${hour * 48}px` }}
            onClick={() => {
              hapticLight();
              onAddTask(date, hour);
            }}
          />
        ))}
        
        {dayTasks.map((task) => (
          <TaskBlock
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            onComplete={onComplete}
            isAutoHighlight={topKeyActionIds?.has(task.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  hour?: number;
  monumentId?: string;
  onAddManual: (content: string, dueDate: Date, dueTime: string, duration: number) => void;
  onAddWithAI: () => void;
}

function AddTaskDialog({ 
  open, 
  onOpenChange, 
  date, 
  hour = 9, 
  monumentId,
  onAddManual,
  onAddWithAI 
}: AddTaskDialogProps) {
  const [content, setContent] = useState("");
  const [duration, setDuration] = useState(60);
  const [selectedHour, setSelectedHour] = useState(hour);
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantType>("Q2");

  const handleSubmit = () => {
    if (!content.trim()) return;
    const dueTime = `${selectedHour.toString().padStart(2, '0')}:00`;
    onAddManual(content, date, dueTime, duration);
    setContent("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            新增任務到 {format(date, "M月d日 EEEE", { locale: zhTW })}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">任務內容</label>
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="輸入任務描述..."
              data-testid="input-calendar-task-content"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">開始時間</label>
              <select 
                value={selectedHour}
                onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                className="w-full p-2 rounded-md border bg-background"
                data-testid="select-task-hour"
              >
                {HOURS.map(h => (
                  <option key={h} value={h}>
                    {h.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">持續時間</label>
              <select 
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full p-2 rounded-md border bg-background"
                data-testid="select-task-duration"
              >
                <option value={15}>15 分鐘</option>
                <option value={30}>30 分鐘</option>
                <option value={45}>45 分鐘</option>
                <option value={60}>1 小時</option>
                <option value={90}>1.5 小時</option>
                <option value={120}>2 小時</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">優先級（象限）</label>
            <div className="flex gap-2 flex-wrap">
              {QUADRANTS.map((q) => {
                const Icon = q.icon;
                return (
                  <Button
                    key={q.id}
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedQuadrant(q.id)}
                    className={cn(
                      "gap-1",
                      selectedQuadrant === q.id && q.badgeClass
                    )}
                    data-testid={`button-quadrant-${q.id}`}
                  >
                    <Icon className={cn("w-3 h-3", q.className)} />
                    {q.labelCn}
                  </Button>
                );
              })}
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => {
                hapticMedium();
                onAddWithAI();
                onOpenChange(false);
              }}
              data-testid="button-add-with-ai"
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
              AI 協助
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!content.trim()}
              data-testid="button-add-manual"
            >
              <Plus className="w-4 h-4 mr-1" />
              新增
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CalendarView({ monumentId, tasks: propTasks, onAddTaskWithAI, onBack, onComplete, topKeyActionIds: propTopKeyActionIds }: CalendarViewProps) {
  const { toast } = useToast();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const { data: fetchedTasks = [], isLoading } = useQuery<Task[]>({
    queryKey: monumentId ? ["/api/tasks", monumentId] : ["/api/tasks"],
    enabled: !propTasks,
  });
  
  const tasks = propTasks || fetchedTasks;

  // Use passed topKeyActionIds or calculate locally as fallback
  const localTopKeyActionIds = useMemo(() => {
    const pendingLeafTasks = tasks.filter(t => 
      t.status !== "completed" && 
      !tasks.some(child => child.parentId === t.id)
    );
    const sorted = [...pendingLeafTasks].sort((a, b) => (b.xpValue || 0) - (a.xpValue || 0));
    const top3 = sorted.slice(0, 3);
    return new Set(top3.map(t => t.id));
  }, [tasks]);
  
  const topKeyActionIds = propTopKeyActionIds || localTopKeyActionIds;

  const { data: monuments = [] } = useQuery<Monument[]>({
    queryKey: ["/api/monuments"],
  });

  const createTask = useMutation({
    mutationFn: async (taskData: {
      content: string;
      dueDate: Date;
      dueTime: string;
      duration: number;
      monumentId?: string;
      quadrant?: QuadrantType;
    }) => {
      const response = await apiRequest("POST", "/api/tasks", {
        content: taskData.content,
        dueDate: taskData.dueDate.toISOString(),
        dueTime: taskData.dueTime,
        duration: taskData.duration,
        monumentId: taskData.monumentId,
        quadrant: taskData.quadrant,
        status: "pending",
        type: "action",
        xpValue: 10,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      hapticSuccess();
      toast({
        title: "任務已新增",
        description: "已加入行事曆",
      });
    },
    onError: () => {
      toast({
        title: "新增失敗",
        description: "請稍後再試",
        variant: "destructive",
      });
    },
  });

  const handlePrevWeek = () => {
    hapticLight();
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    hapticLight();
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handleToday = () => {
    hapticLight();
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handleAddTask = (date: Date, hour?: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setDialogOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    hapticLight();
    toast({
      title: task.content,
      description: `${task.xpValue} XP · ${task.dueTime || "未設定時間"}`,
    });
  };

  const handleAddManual = (content: string, dueDate: Date, dueTime: string, duration: number) => {
    createTask.mutate({
      content,
      dueDate,
      dueTime,
      duration,
      monumentId,
      quadrant: "Q2",
    });
  };

  const handleAddWithAI = () => {
    if (onAddTaskWithAI && selectedDate) {
      onAddTaskWithAI(selectedDate);
    }
  };

  const internalCompleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}/complete`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monuments"] });
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

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              data-testid="button-calendar-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevWeek}
            data-testid="button-prev-week"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextWeek}
            data-testid="button-next-week"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            data-testid="button-today"
          >
            今天
          </Button>
        </div>
        
        <div className="text-sm font-medium">
          {format(currentWeekStart, "yyyy年 M月d日", { locale: zhTW })} - {format(weekEnd, "M月d日", { locale: zhTW })}
        </div>
        
        <Badge variant="secondary" className="gap-1">
          <Zap className="w-3 h-3" />
          {tasks.filter(t => t.status === "completed").reduce((sum, t) => sum + t.xpValue, 0)} XP
        </Badge>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="flex">
          <div className="w-12 shrink-0 border-r border-border">
            <div className="h-[72px] border-b border-border" />
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-12 flex items-start justify-end pr-2 text-xs text-muted-foreground"
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
          
          <div className="flex flex-1 overflow-x-auto">
            {weekDays.map((date) => (
              <DayColumn
                key={date.toISOString()}
                date={date}
                tasks={tasks}
                onTaskClick={handleTaskClick}
                onAddTask={handleAddTask}
                onComplete={handleComplete}
                topKeyActionIds={topKeyActionIds}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
      
      {selectedDate && (
        <AddTaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          date={selectedDate}
          hour={selectedHour}
          monumentId={monumentId}
          onAddManual={handleAddManual}
          onAddWithAI={handleAddWithAI}
        />
      )}
    </div>
  );
}
