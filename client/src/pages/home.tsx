import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StateCheck } from "@/components/state-check";
import { MonumentSelection } from "@/components/monument-selection";
import { ChatInterface, type Message } from "@/components/chat-interface";
import { TaskList } from "@/components/task-list";
import { SedonaRelease, type SedonaMessage } from "@/components/sedona-release";
import { BottomNav, type NavTab } from "@/components/bottom-nav";
import { MonumentVisualization } from "@/components/monument-visualization";
import { hapticSuccess } from "@/lib/haptics";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  saveConversation, 
  loadConversation, 
  clearConversation, 
  saveOrMergeProject,
  loadProjects,
  archiveProject,
  deleteProject,
  clearAllProjects,
  type Project 
} from "@/lib/storage";
import { HistoryView } from "@/components/history-view";
import { MONUMENTS, type MonumentConfig } from "@/lib/monuments";
import type { Task, Monument, Session } from "@shared/schema";
import confetti from "canvas-confetti";

type FlowStep = "state-check" | "monument-selection" | "chat" | "tasks" | "sedona";

interface MonumentProgress {
  slug: string;
  totalXp: number;
  completedTasks: number;
  level: number;
}

interface FlowHistory {
  step: FlowStep;
  monument?: MonumentConfig;
  flowType?: "mood" | "task";
}

export default function Home() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [flowStep, setFlowStep] = useState<FlowStep>("state-check");
  const [flowType, setFlowType] = useState<"mood" | "task" | null>(null);
  const [selectedMonument, setSelectedMonument] = useState<MonumentConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [previousFlow, setPreviousFlow] = useState<FlowHistory | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Sedona state
  const [sedonaMessages, setSedonaMessages] = useState<SedonaMessage[]>([]);
  const [sedonaStep, setSedonaStep] = useState(1);
  const [sedonaComplete, setSedonaComplete] = useState(false);
  const [showModeSwitchPrompt, setShowModeSwitchPrompt] = useState(false);
  const [switchReason, setSwitchReason] = useState<string | undefined>();
  
  // Projects refresh trigger
  const [projectsRefresh, setProjectsRefresh] = useState(0);

  // Load saved conversation on mount
  useEffect(() => {
    const cached = loadConversation();
    if (cached) {
      setFlowStep(cached.flowStep as FlowStep);
      setFlowType(cached.flowType);
      setMessages(cached.messages);
      setSedonaMessages(cached.sedonaMessages);
      setSedonaStep(cached.sedonaStep);
    }
  }, []);

  // Auto-save conversation and project whenever it changes
  useEffect(() => {
    if (flowStep !== "state-check" && (messages.length > 0 || sedonaMessages.length > 0)) {
      // Save current session cache
      saveConversation({
        flowStep,
        flowType,
        monumentId: selectedMonument?.id,
        monumentName: selectedMonument?.nameCn,
        messages,
        sedonaMessages,
        sedonaStep,
        timestamp: Date.now(),
        activeProjectId: activeProjectId || undefined,
      });
      
      // Save/merge into project (every message update)
      const type = flowStep === "sedona" ? "sedona" : "chat";
      const projectId = saveOrMergeProject(
        type,
        flowStep,
        flowType,
        messages,
        sedonaMessages,
        sedonaStep,
        selectedMonument?.id,
        selectedMonument?.nameCn,
        selectedMonument?.slug,
        activeProjectId || undefined
      );
      if (projectId && projectId !== activeProjectId) {
        setActiveProjectId(projectId);
      }
    }
  }, [flowStep, flowType, messages, sedonaMessages, sedonaStep, selectedMonument, activeProjectId]);

  // Fetch monuments
  const { data: monuments = [] } = useQuery<Monument[]>({
    queryKey: ["/api/monuments"],
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", selectedMonument?.id],
    enabled: !!selectedMonument,
  });

  // Calculate monument progress
  const monumentProgress: MonumentProgress[] = monuments.map((m) => {
    const monumentTasks = tasks.filter((t) => t.monumentId === m.id);
    const completedTasks = monumentTasks.filter((t) => t.status === "completed");
    return {
      slug: m.slug,
      totalXp: m.totalXp,
      completedTasks: completedTasks.length,
      level: Math.floor(m.totalXp / 100),
    };
  });

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (data: { flowType: "mood" | "task"; monumentId?: string }) => {
      const response = await apiRequest("POST", "/api/sessions", data);
      return response.json();
    },
    onSuccess: (data: Session) => {
      setSessionId(data.id);
    },
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (data: { sessionId: string; message: string }) => {
      const response = await apiRequest("POST", "/api/chat", data);
      return response.json();
    },
  });

  // Complete task mutation
  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}/complete`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monuments"] });
      
      // Trigger celebration
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

  // Breakdown task mutation
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

  // Handle state check selection
  const handleStateCheckSelect = useCallback((type: "mood" | "task") => {
    setFlowType(type);
    if (type === "mood") {
      setFlowStep("sedona");
      // Initialize Sedona flow
      setSedonaMessages([{
        id: "1",
        role: "assistant",
        content: "來地球玩的大師，我看到你需要調頻。讓我們一起清理這些能量，為你的顯化騰出空間。\n\n告訴我：此刻在你心中最清晰的感受是什麼？無須分析，只需要感受和敘述。",
        step: 1,
      }]);
      createSession.mutate({ flowType: "mood" });
    } else {
      setFlowStep("monument-selection");
    }
  }, [createSession]);

  // Handle monument selection
  const handleMonumentSelect = useCallback((monument: MonumentConfig) => {
    setPreviousFlow({ step: "monument-selection", monument, flowType: "task" });
    setSelectedMonument(monument);
    setFlowStep("chat");
    // Initialize chat
    setMessages([{
      id: "1",
      role: "assistant",
      content: `來地球玩的大師，你已選擇了「${monument.nameCn}」這個遊戲場景。\n\n現在告訴我：在這個領域，你真正想體驗和創造什麼？不需要完美的目標，你的每一個想法都是靈感的種子。讓我幫你把它轉化為可行動的冒險任務。`,
    }]);
    createSession.mutate({ flowType: "task", monumentId: monument.id });
  }, [createSession]);

  // Handle chat message
  const handleSendMessage = useCallback(async (content: string) => {
    if (!sessionId) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendMessage.mutateAsync({ 
        sessionId, 
        message: content 
      });
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        options: response.options,
        toolCalls: response.toolCalls,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Refresh tasks if any were created
      if (response.toolCalls?.some((t: { name: string }) => t.name === "create_smart_task")) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      }
      
      // Handle UI mode change
      if (response.uiMode === "sedona") {
        setFlowStep("sedona");
        setSedonaMessages([{
          id: "1",
          role: "assistant",
          content: "我感受到你可能有一些情緒阻力。讓我們先來處理這個。\n\n此刻你心中有什麼感受？",
          step: 1,
        }]);
      }
    } catch (error) {
      toast({
        title: "發送失敗",
        description: "請稍後再試",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, sendMessage, toast]);

  // Handle option selection
  const handleSelectOption = useCallback((option: string) => {
    handleSendMessage(option);
  }, [handleSendMessage]);

  // Handle stuck button
  const handleStuck = useCallback(() => {
    handleSendMessage("我卡住了，這個任務對我來說太難了");
  }, [handleSendMessage]);

  // Handle Sedona message
  const handleSedonaMessage = useCallback(async (content: string) => {
    if (!sessionId) return;
    
    const userMessage: SedonaMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      step: sedonaStep,
    };
    setSedonaMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendMessage.mutateAsync({ 
        sessionId, 
        message: content 
      });
      
      const assistantMessage: SedonaMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        step: response.sedonaStep || sedonaStep,
        suggestModeSwitch: response.suggestModeSwitch,
        switchReason: response.switchReason,
      };
      setSedonaMessages((prev) => [...prev, assistantMessage]);
      
      // Update step
      if (response.sedonaStep) {
        setSedonaStep(response.sedonaStep);
      }
      
      // Check if AI detected mode switch intent
      if (response.suggestModeSwitch) {
        setShowModeSwitchPrompt(true);
        setSwitchReason(response.switchReason);
      } else {
        // Clear prompt if AI no longer suggests switching
        setShowModeSwitchPrompt(false);
        setSwitchReason(undefined);
      }
      
      // Check if complete
      if (response.sedonaComplete) {
        setSedonaComplete(true);
        queryClient.invalidateQueries({ queryKey: ["/api/monuments"] });
        hapticSuccess();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#A855F7", "#EC4899", "#8B5CF6"],
        });
      }
    } catch (error) {
      toast({
        title: "發送失敗",
        description: "請稍後再試",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, sedonaStep, sendMessage, toast]);

  // Handle Sedona complete
  const handleSedonaComplete = useCallback(() => {
    setFlowStep("state-check");
    setSedonaMessages([]);
    setSedonaStep(1);
    setSedonaComplete(false);
    setShowModeSwitchPrompt(false);
    setSwitchReason(undefined);
    setPreviousFlow(null);
  }, []);

  // Handle back to previous flow
  const handleBackToPreviousFlow = useCallback(() => {
    if (previousFlow) {
      setFlowStep(previousFlow.step);
      if (previousFlow.monument) {
        setSelectedMonument(previousFlow.monument);
      }
      if (previousFlow.flowType) {
        setFlowType(previousFlow.flowType);
      }
      setShowModeSwitchPrompt(false);
      setSwitchReason(undefined);
    }
  }, [previousFlow]);

  // Handle switch from Sedona to Creation mode
  const handleSwitchToCreation = useCallback(() => {
    setFlowStep("monument-selection");
    setFlowType("task");
    setSedonaMessages([]);
    setSedonaStep(1);
    setSedonaComplete(false);
    setShowModeSwitchPrompt(false);
    setSwitchReason(undefined);
    
    // Create a new task session
    createSession.mutate({ flowType: "task" });
    
    toast({
      title: "能量轉換成功",
      description: "讓我們開始創造吧！",
    });
  }, [createSession, toast]);

  // Handle dismissing mode switch prompt to continue Sedona
  const handleDismissSwitch = useCallback(() => {
    setShowModeSwitchPrompt(false);
    setSwitchReason(undefined);
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tab: NavTab) => {
    setActiveTab(tab);
    if (tab === "home") {
      setFlowStep("state-check");
      setSelectedMonument(null);
      setMessages([]);
    }
  }, []);

  // Reset flow
  const handleBack = useCallback(() => {
    switch (flowStep) {
      case "monument-selection":
        setFlowStep("state-check");
        break;
      case "chat":
        setFlowStep("monument-selection");
        setMessages([]);
        break;
      case "tasks":
        setFlowStep("chat");
        break;
      case "sedona":
        setFlowStep("state-check");
        setSedonaMessages([]);
        setSedonaStep(1);
        setSedonaComplete(false);
        break;
    }
  }, [flowStep]);

  // Render based on active tab and flow step
  const renderContent = () => {
    if (activeTab === "monuments") {
      return (
        <MonumentVisualization
          progress={monumentProgress}
          onSelectMonument={(monument) => {
            setSelectedMonument(monument);
            setFlowStep("tasks");
            setActiveTab("home");
          }}
        />
      );
    }

    if (activeTab === "history") {
      const projects = loadProjects();
      return (
        <HistoryView
          projects={projects}
          onResumeProject={(project) => {
            // Restore project state
            setFlowStep(project.flowStep as FlowStep);
            setFlowType(project.flowType);
            setMessages(project.messages);
            setSedonaMessages(project.sedonaMessages);
            setSedonaStep(project.sedonaStep);
            setActiveProjectId(project.id);
            
            // Restore monument if exists
            if (project.monumentSlug) {
              const monument = MONUMENTS.find(m => m.slug === project.monumentSlug);
              if (monument) {
                setSelectedMonument(monument);
              }
            }
            
            setActiveTab("home");
            toast({
              title: "專案已恢復",
              description: `繼續「${project.title}」`,
            });
          }}
          onArchiveProject={(projectId) => {
            archiveProject(projectId);
            setProjectsRefresh(prev => prev + 1);
          }}
          onDeleteProject={(projectId) => {
            deleteProject(projectId);
            setProjectsRefresh(prev => prev + 1);
          }}
          onClearAll={() => {
            clearAllProjects();
            setProjectsRefresh(prev => prev + 1);
          }}
        />
      );
    }

    if (activeTab === "profile") {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4">
          <p className="text-muted-foreground">個人資料功能即將推出</p>
        </div>
      );
    }

    // Home tab - main flow
    switch (flowStep) {
      case "state-check":
        return <StateCheck onSelect={handleStateCheckSelect} />;
      
      case "monument-selection":
        return (
          <MonumentSelection
            onSelect={handleMonumentSelect}
            onBack={handleBack}
            monumentProgress={Object.fromEntries(
              monumentProgress.map((p) => [p.slug, p.totalXp])
            )}
          />
        );
      
      case "chat":
        if (!selectedMonument) return null;
        return (
          <ChatInterface
            monument={selectedMonument}
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onSelectOption={handleSelectOption}
            onBack={handleBack}
            onStuck={handleStuck}
          />
        );
      
      case "tasks":
        if (!selectedMonument) return null;
        return (
          <TaskList
            monument={selectedMonument}
            tasks={tasks.filter((t) => t.monumentId === selectedMonument.id)}
            onComplete={(taskId) => completeTask.mutate(taskId)}
            onBreakdown={(taskId) => breakdownTask.mutate(taskId)}
            onBack={handleBack}
          />
        );
      
      case "sedona":
        return (
          <SedonaRelease
            messages={sedonaMessages}
            isLoading={isLoading}
            currentStep={sedonaStep}
            isComplete={sedonaComplete}
            showModeSwitchPrompt={showModeSwitchPrompt}
            switchReason={switchReason}
            onSendMessage={handleSedonaMessage}
            onBack={handleBack}
            onComplete={handleSedonaComplete}
            onSwitchToCreation={handleSwitchToCreation}
            onDismissSwitch={handleDismissSwitch}
            onBackToPreviousFlow={handleBackToPreviousFlow}
            hasPreviousFlow={!!previousFlow}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <div className="flex-1">
        {renderContent()}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
