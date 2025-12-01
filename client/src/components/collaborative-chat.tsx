import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronLeft, 
  Send, 
  Loader2, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Trash2,
  SplitSquareVertical,
  Plus,
  Zap,
  ListTodo,
  ImagePlus,
  X,
  MapPin,
  Mic,
  MicOff,
  Volume2
} from "lucide-react";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MonumentConfig } from "@/lib/monuments";
import type { Task } from "@shared/schema";
import { usePlacesSearch, type PlaceResult } from "@/hooks/use-places";
import { useVoice } from "@/hooks/use-voice";
import { PlacesCard, PlacesLoadingCard } from "@/components/places-card";

export interface ImageAttachment {
  data: string; // base64 encoded
  mimeType: string;
  name: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: ImageAttachment[];
  options?: string[];
  optionsNote?: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
}

interface CollaborativeChatProps {
  monument?: MonumentConfig | null;
  sessionId: string;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string, images?: ImageAttachment[]) => void;
  onSelectOption: (option: string) => void;
  onBack: () => void;
  onTasksUpdated?: () => void;
  onMonumentSelected?: (monument: MonumentConfig) => void;
  onSwitchToSedona?: () => void;
}

function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1 px-4 py-3">
      <div className="typing-dots flex space-x-1">
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
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

function MessageBubble({ 
  message, 
  onSelectOption,
  isLatest 
}: { 
  message: Message; 
  onSelectOption?: (option: string) => void;
  isLatest?: boolean;
}) {
  const isUser = message.role === "user";
  
  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] px-4 py-3 rounded-2xl",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-card border border-border rounded-bl-md"
        )}
      >
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.images.map((img, idx) => (
              <img
                key={idx}
                src={`data:${img.mimeType};base64,${img.data}`}
                alt={img.name}
                className="max-w-[200px] max-h-[150px] rounded-lg object-cover"
              />
            ))}
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
      
      {isLatest && message.options && message.options.length > 0 && (
        <div className="mt-3 space-y-2 w-full max-w-[85%]">
          {message.optionsNote && (
            <p className="text-xs text-muted-foreground mb-2">{message.optionsNote}</p>
          )}
          {message.options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              className={cn(
                "w-full justify-start text-left h-auto py-3 px-4",
                "rounded-xl border-border bg-card/50",
                "hover-elevate active-elevate-2"
              )}
              onClick={() => {
                hapticMedium();
                onSelectOption?.(option);
              }}
              data-testid={`button-option-${index}`}
            >
              <span className="text-sm">{option}</span>
            </Button>
          ))}
        </div>
      )}

      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="mt-2 space-y-1">
          {message.toolCalls.map((tool, index) => (
            <div 
              key={index}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <Check className="w-3 h-3 text-emerald-500" />
              <span>
                {tool.name === "create_task_list" && "已創建任務清單"}
                {tool.name === "add_tasks" && "已新增任務"}
                {tool.name === "remove_tasks" && "已移除任務"}
                {tool.name === "breakdown_task" && "已拆解任務"}
                {tool.name === "complete_tasks" && "已完成任務"}
                {tool.name === "create_smart_task" && "已創建任務"}
                {tool.name === "award_xp" && "已獲得經驗值"}
                {tool.name === "recursive_breakdown" && "已拆解任務"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  childTasks: Task[];
  allTasks: Task[];
  level: number;
  onComplete: (taskId: string) => void;
  onUncomplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onBreakdown: (taskId: string) => void;
}

function TaskItem({ 
  task, 
  childTasks, 
  allTasks, 
  level, 
  onComplete, 
  onUncomplete,
  onDelete,
  onBreakdown 
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = childTasks.length > 0;
  const isCompleted = task.status === "completed";
  const categoryBadge = getCategoryBadge(task.category);

  const handleCheck = () => {
    if (isCompleted) {
      hapticLight();
      onUncomplete(task.id);
    } else {
      hapticSuccess();
      onComplete(task.id);
    }
  };

  return (
    <div className={cn("space-y-1", level > 0 && "ml-4 border-l border-border/50 pl-3")}>
      <div
        className={cn(
          "flex items-start gap-2 py-2 px-2 rounded-lg transition-all",
          isCompleted && "opacity-60",
          !isCompleted && "hover:bg-accent/30"
        )}
      >
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleCheck}
          className={cn(
            "mt-0.5 w-4 h-4",
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
                className={cn("text-[10px] py-0 px-1", categoryBadge.className)}
              >
                {categoryBadge.label}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1 mt-1">
            <Badge variant="secondary" className="text-[10px] py-0 px-1">
              <Zap className="w-2 h-2 mr-0.5" />
              {task.xpValue}
            </Badge>
            
            {!isCompleted && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    hapticMedium();
                    onBreakdown(task.id);
                  }}
                  className="h-5 text-[10px] text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 px-1"
                  data-testid={`button-breakdown-${task.id}`}
                >
                  <SplitSquareVertical className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    hapticLight();
                    onDelete(task.id);
                  }}
                  className="h-5 text-[10px] text-destructive/70 hover:text-destructive hover:bg-destructive/10 px-1"
                  data-testid={`button-delete-${task.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="w-5 h-5 p-0"
            onClick={() => {
              hapticLight();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
          </Button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="space-y-1">
          {childTasks.map((child) => (
            <TaskItem
              key={child.id}
              task={child}
              childTasks={allTasks.filter((t) => t.parentId === child.id)}
              allTasks={allTasks}
              level={level + 1}
              onComplete={onComplete}
              onUncomplete={onUncomplete}
              onDelete={onDelete}
              onBreakdown={onBreakdown}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CollaborativeChat({
  monument,
  sessionId,
  messages,
  isLoading,
  onSendMessage,
  onSelectOption,
  onBack,
  onTasksUpdated,
  onMonumentSelected,
  onSwitchToSedona,
}: CollaborativeChatProps) {
  const [input, setInput] = useState("");
  const [isTaskListOpen, setIsTaskListOpen] = useState(true);
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([]);
  const [placesResults, setPlacesResults] = useState<{ keyword: string; places: PlaceResult[] } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Places search hook
  const { searchNearby, loading: placesLoading } = usePlacesSearch();
  
  // Voice interface hook
  const { 
    isListening, 
    finalTranscript, 
    isSupported: voiceSupported,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearTranscript,
  } = useVoice({ lang: "zh-TW" });
  
  // Track if user is manually editing
  const [isManualInput, setIsManualInput] = useState(false);

  // Fetch tasks for this session
  const { data: tasks = [], refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ['/api/sessions', sessionId, 'tasks'],
  });

  // Complete task mutation
  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}/complete`);
    },
    onSuccess: () => {
      refetchTasks();
      queryClient.invalidateQueries({ queryKey: ['/api/monuments'] });
      onTasksUpdated?.();
    },
  });

  // Uncomplete task mutation
  const uncompleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}/uncomplete`);
    },
    onSuccess: () => {
      refetchTasks();
      queryClient.invalidateQueries({ queryKey: ['/api/monuments'] });
      onTasksUpdated?.();
    },
  });

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      refetchTasks();
      onTasksUpdated?.();
    },
  });

  // Breakdown task mutation
  const breakdownMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest("POST", `/api/tasks/${taskId}/breakdown`);
    },
    onSuccess: () => {
      refetchTasks();
      onTasksUpdated?.();
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [messages, isLoading]);

  // Refetch tasks when messages change (AI might have created/updated tasks)
  useEffect(() => {
    refetchTasks();
  }, [messages, refetchTasks]);

  // Track previous listening state for detecting when listening ends
  const wasListeningRef = useRef(false);
  
  // When listening ends, copy finalTranscript to input for review/editing
  // Skip if user has manually typed (isManualInput flag)
  useEffect(() => {
    if (wasListeningRef.current && !isListening && finalTranscript?.trim() && !isManualInput) {
      setInput(finalTranscript.trim());
      clearTranscript();
    }
    wasListeningRef.current = isListening;
  }, [isListening, finalTranscript, clearTranscript, isManualInput]);

  // Voice toggle handler
  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      hapticLight();
    } else {
      setIsManualInput(false);
      clearTranscript();
      startListening();
      hapticMedium();
    }
  }, [isListening, startListening, stopListening, clearTranscript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || pendingImages.length > 0) && !isLoading) {
      hapticLight();
      onSendMessage(input.trim() || "請分析這張圖片", pendingImages.length > 0 ? pendingImages : undefined);
      setInput("");
      setPendingImages([]);
      setIsManualInput(false);
    }
  };

  const handlePlacesSearch = async () => {
    if (!input.trim()) {
      const defaultKeywords: Record<string, string> = {
        career: "coworking",
        wealth: "bank",
        emotion: "spa",
        family: "park",
        health: "gym",
        experience: "museum",
      };
      const keyword = monument ? (defaultKeywords[monument.slug] || "cafe") : "cafe";
      hapticLight();
      try {
        const results = await searchNearby(keyword, { radius: 2000, maxResults: 5 });
        setPlacesResults({ keyword, places: results });
      } catch (error) {
        console.error("Places search error:", error);
      }
    } else {
      hapticLight();
      try {
        const results = await searchNearby(input.trim(), { radius: 2000, maxResults: 5 });
        setPlacesResults({ keyword: input.trim(), places: results });
      } catch (error) {
        console.error("Places search error:", error);
      }
    }
  };

  const handleSelectPlace = (place: PlaceResult) => {
    hapticMedium();
    onSendMessage(`我想去「${place.name}」，距離約 ${place.distance}公尺`);
    setPlacesResults(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ImageAttachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.readAsDataURL(file);
      });

      newImages.push({
        data: base64,
        mimeType: file.type,
        name: file.name,
      });
    }

    setPendingImages((prev) => [...prev, ...newImages]);
    hapticLight();
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
    hapticLight();
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

  const Icon = monument?.icon;
  const rootTasks = tasks.filter((t) => !t.parentId);
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalXp = tasks
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.xpValue, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
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
            {Icon ? (
              <Icon className={cn("w-5 h-5", getIconColor(monument?.slug || ""))} />
            ) : (
              <Zap className="w-5 h-5 text-primary" />
            )}
            <span className="font-medium">
              {monument?.nameCn || "AI 引導對話"}
            </span>
          </div>
        </div>
        {tasks.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            {totalXp} XP
          </Badge>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              onSelectOption={onSelectOption}
              isLatest={index === messages.length - 1}
            />
          ))}
          {isLoading && (
            <div className="flex items-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-md">
                <TypingIndicator />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Collapsible Task List */}
      {tasks.length > 0 && (
        <Collapsible open={isTaskListOpen} onOpenChange={setIsTaskListOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card/50 cursor-pointer hover:bg-card/80 transition-colors">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">協作任務清單</span>
                <Badge variant="outline" className="text-xs">
                  {completedCount}/{tasks.length}
                </Badge>
              </div>
              {isTaskListOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="max-h-48 overflow-y-auto px-2 py-2 border-t border-border/50 bg-card/30">
              {rootTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  childTasks={tasks.filter((t) => t.parentId === task.id)}
                  allTasks={tasks}
                  level={0}
                  onComplete={(id) => completeMutation.mutate(id)}
                  onUncomplete={(id) => uncompleteMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onBreakdown={(id) => breakdownMutation.mutate(id)}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Places Results */}
      {placesLoading && <PlacesLoadingCard />}
      {placesResults && !placesLoading && (
        <div className="px-4 py-2 border-t border-border bg-card/30">
          <PlacesCard
            places={placesResults.places}
            keyword={placesResults.keyword}
            onSelectPlace={handleSelectPlace}
          />
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs text-muted-foreground"
            onClick={() => setPlacesResults(null)}
            data-testid="button-close-places"
          >
            關閉搜尋結果
          </Button>
        </div>
      )}

      {/* Input */}
      <form 
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t border-border bg-background safe-area-inset-bottom"
      >
        {/* Pending Images Preview */}
        {pendingImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {pendingImages.map((img, idx) => (
              <div key={idx} className="relative">
                <img
                  src={`data:${img.mimeType};base64,${img.data}`}
                  alt={img.name}
                  className="w-16 h-16 rounded-lg object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={() => removePendingImage(idx)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  data-testid={`button-remove-image-${idx}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            data-testid="button-upload-image"
          >
            <ImagePlus className="w-5 h-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handlePlacesSearch}
            disabled={isLoading || placesLoading}
            title="搜尋附近地點"
            data-testid="button-search-places"
          >
            <MapPin className="w-5 h-5" />
          </Button>
          {voiceSupported && (
            <Button
              type="button"
              size="icon"
              variant={isListening ? "default" : "outline"}
              onClick={handleVoiceToggle}
              disabled={isLoading}
              title={isListening ? "停止語音輸入" : "開始語音輸入"}
              className={cn(
                isListening && "bg-red-500 hover:bg-red-600 animate-pulse"
              )}
              data-testid="button-voice"
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
          )}
          {isSpeaking && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={stopSpeaking}
              title="停止語音播放"
              data-testid="button-stop-speaking"
            >
              <Volume2 className="w-5 h-5 animate-pulse text-primary" />
            </Button>
          )}
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setIsManualInput(true);
            }}
            placeholder={isListening ? "正在聆聽..." : (pendingImages.length > 0 ? "描述圖片或直接發送..." : "輸入目標或調整任務...")}
            className="flex-1 bg-card border-border"
            disabled={isLoading}
            data-testid="input-message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={(!input.trim() && pendingImages.length === 0) || isLoading}
            data-testid="button-send"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
