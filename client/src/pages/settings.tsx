import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, User, Palette, Key, Cloud, Plug, Sun, Moon, Check, Upload, Download, AlertCircle, Activity, LogOut, FileUp, Heart, Footprints, Moon as MoonIcon, Flame, Loader2, LayoutGrid, List, Calendar, FolderTree, History } from "lucide-react";
import { SiGoogle, SiApple } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { UserSettings } from "@shared/schema";

interface HealthInsights {
  hasData: boolean;
  date?: string;
  summary?: {
    steps: number;
    avgHeartRate: number;
    sleepHours: number;
    activeEnergy: number;
    exerciseMinutes: number;
  };
  insights?: string;
  message?: string;
}

function HealthUpload() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: healthInsights, isLoading: loadingInsights } = useQuery<HealthInsights>({
    queryKey: ["/api/health/insights"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (xmlContent: string) => {
      const response = await apiRequest("POST", "/api/health/upload", { xmlContent });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/health/insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/health/summary"] });
      toast({
        title: "健康數據已匯入",
        description: `成功匯入 ${data.recordsImported} 筆記錄，建立 ${data.summariesCreated} 天的摘要`,
      });
      setIsUploading(false);
      setUploadProgress(0);
    },
    onError: () => {
      toast({
        title: "匯入失敗",
        description: "無法處理健康數據檔案，請確認格式正確",
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xml") && !file.name.endsWith(".zip")) {
      toast({
        title: "格式錯誤",
        description: "請選擇 Apple Health 匯出的 XML 檔案",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 50 + 10;
          setUploadProgress(Math.min(progress, 50));
        }
      };
      reader.onload = async (e) => {
        const xmlContent = e.target?.result as string;
        setUploadProgress(60);
        uploadMutation.mutate(xmlContent);
        setUploadProgress(80);
      };
      reader.readAsText(file);
    } catch (error) {
      toast({
        title: "讀取失敗",
        description: "無法讀取檔案",
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(0);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml"
        className="hidden"
        onChange={handleFileSelect}
        data-testid="input-health-file"
      />

      {!healthInsights?.hasData ? (
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-dashed border-muted-foreground/30 text-center">
            <SiApple className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              從 iPhone 的「健康」App 匯出資料後上傳
            </p>
            <Button
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-upload-health"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  處理中...
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4 mr-2" />
                  選擇健康數據檔案
                </>
              )}
            </Button>
          </div>
          {isUploading && (
            <Progress value={uploadProgress} className="h-2" />
          )}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>匯出步驟：</p>
            <ol className="list-decimal list-inside space-y-0.5 pl-2">
              <li>開啟 iPhone 的「健康」App</li>
              <li>點選右上角頭像</li>
              <li>滑到最下方，點選「匯出所有健康資料」</li>
              <li>解壓縮後上傳 export.xml 檔案</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-2 text-blue-500 mb-1">
                <Footprints className="h-4 w-4" />
                <span className="text-xs">步數</span>
              </div>
              <p className="text-lg font-semibold">
                {healthInsights.summary?.steps?.toLocaleString() || "---"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <Heart className="h-4 w-4" />
                <span className="text-xs">心率</span>
              </div>
              <p className="text-lg font-semibold">
                {healthInsights.summary?.avgHeartRate || "---"} <span className="text-xs font-normal">bpm</span>
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <div className="flex items-center gap-2 text-purple-500 mb-1">
                <MoonIcon className="h-4 w-4" />
                <span className="text-xs">睡眠</span>
              </div>
              <p className="text-lg font-semibold">
                {healthInsights.summary?.sleepHours || "---"} <span className="text-xs font-normal">小時</span>
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <div className="flex items-center gap-2 text-orange-500 mb-1">
                <Flame className="h-4 w-4" />
                <span className="text-xs">運動</span>
              </div>
              <p className="text-lg font-semibold">
                {healthInsights.summary?.exerciseMinutes || "---"} <span className="text-xs font-normal">分鐘</span>
              </p>
            </div>
          </div>

          {healthInsights.insights && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {healthInsights.insights}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>最後更新: {healthInsights.date ? new Date(healthInsights.date).toLocaleDateString("zh-TW") : "---"}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-update-health"
            >
              <Upload className="h-3 w-3 mr-1" />
              更新數據
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const AI_PERSONAS = [
  {
    id: "spiritual",
    name: "靈性導師",
    description: "數據指導靈 - 以靈性視角引導你探索內在，將情緒與行動視為可轉化的能量",
    icon: "✨",
  },
  {
    id: "coach",
    name: "人生教練",
    description: "專業教練 - 以目標導向的方式，幫助你制定計劃並保持動力",
    icon: "🎯",
  },
  {
    id: "pm",
    name: "專案經理",
    description: "項目管理專家 - 以結構化的方式拆解任務，追蹤進度並確保交付",
    icon: "📋",
  },
  {
    id: "custom",
    name: "自訂人設",
    description: "創建你自己的 AI 助手人設",
    icon: "🎭",
  },
];

interface ViewModeHistoryRecord {
  id: string;
  userId?: string;
  fromMode?: string;
  toMode: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

const VIEW_MODE_NAMES: Record<string, string> = {
  list: "清單",
  calendar: "行事曆",
  tree: "樹狀",
};

const VIEW_MODE_ICONS: Record<string, typeof List> = {
  list: List,
  calendar: Calendar,
  tree: FolderTree,
};

function ViewModeHistorySection() {
  const { data: history, isLoading } = useQuery<ViewModeHistoryRecord[]>({
    queryKey: ["/api/view-mode-history"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        還沒有切換記錄
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.slice(0, 5).map((record) => {
        const ToIcon = VIEW_MODE_ICONS[record.toMode] || List;
        const FromIcon = record.fromMode ? VIEW_MODE_ICONS[record.fromMode] || List : null;
        
        return (
          <div
            key={record.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
            data-testid={`history-record-${record.id}`}
          >
            <div className="flex items-center gap-2 flex-1">
              {FromIcon && (
                <>
                  <FromIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {VIEW_MODE_NAMES[record.fromMode!] || record.fromMode}
                  </span>
                  <span className="text-muted-foreground">→</span>
                </>
              )}
              <ToIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
                {VIEW_MODE_NAMES[record.toMode] || record.toMode}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(record.createdAt).toLocaleString("zh-TW", {
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

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [customPrompt, setCustomPrompt] = useState("");

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const recordViewModeHistory = useMutation({
    mutationFn: async (data: { fromMode?: string; toMode: string }) => {
      const response = await apiRequest("POST", "/api/view-mode-history", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/view-mode-history"] });
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const response = await apiRequest("PATCH", "/api/settings", updates);
      return response.json();
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["/api/settings"] });
      const previousSettings = queryClient.getQueryData<UserSettings>(["/api/settings"]);
      
      if (updates.viewMode && previousSettings?.viewMode !== updates.viewMode) {
        recordViewModeHistory.mutate({
          fromMode: previousSettings?.viewMode || "list",
          toMode: updates.viewMode,
        });
      }
      
      queryClient.setQueryData<UserSettings>(["/api/settings"], (old) => {
        if (!old) return old;
        return { ...old, ...updates };
      });
      return { previousSettings };
    },
    onError: (_err, _updates, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(["/api/settings"], context.previousSettings);
      }
      toast({
        title: "儲存失敗",
        description: "請稍後再試",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const exportData = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/settings/export", undefined);
      return response.json();
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifebuilder-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "資料已匯出",
        description: "備份檔案已下載",
      });
    },
  });

  const { data: cloudStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/cloud/status"],
  });

  const { data: cloudBackups } = useQuery<Array<{ id: string; name: string; createdTime: string }>>({
    queryKey: ["/api/cloud/backups"],
    enabled: cloudStatus?.connected === true,
  });

  const uploadToCloud = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cloud/backup", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cloud/backups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "備份成功",
        description: "資料已上傳到 Google Drive",
      });
    },
    onError: () => {
      toast({
        title: "備份失敗",
        description: "請確認 Google Drive 已連接",
        variant: "destructive",
      });
    },
  });

  const { data: calendarStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/calendar/status"],
  });

  // Auth status from Replit Auth
  interface AuthStatus {
    configured: boolean;
    authenticated: boolean;
    user: {
      id: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  }
  
  const { data: authStatus, refetch: refetchAuth } = useQuery<AuthStatus>({
    queryKey: ["/api/auth/status"],
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Handle auth success from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "success") {
      refetchAuth();
      toast({
        title: "登入成功",
        description: "歡迎回來！你的帳戶已連接。",
      });
      window.history.replaceState({}, "", "/settings");
    } else if (params.get("error")) {
      toast({
        title: "登入失敗",
        description: "無法登入，請稍後再試",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/settings");
    }
  }, [refetchAuth, toast]);

  // Apply theme on initial load
  useEffect(() => {
    if (settings?.theme) {
      if (settings.theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [settings?.theme]);

  const handleThemeChange = (theme: string) => {
    // Apply immediately for instant feedback
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Save to database
    updateSettings.mutate({ theme });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-pulse text-muted-foreground">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 p-4 max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">設定</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 pb-20">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="view" data-testid="tab-view">
              <LayoutGrid className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="theme" data-testid="tab-theme">
              <Palette className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="api" data-testid="tab-api">
              <Key className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="cloud" data-testid="tab-cloud">
              <Cloud className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="mcp" data-testid="tab-mcp">
              <Plug className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>個人資料</CardTitle>
                <CardDescription>設定你的暱稱和 AI 助手的人設</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nickname">暱稱</Label>
                  <Input
                    id="nickname"
                    data-testid="input-nickname"
                    defaultValue={settings?.nickname || "來地球玩的大師"}
                    onBlur={(e) => updateSettings.mutate({ nickname: e.target.value })}
                    placeholder="輸入你的暱稱"
                  />
                  <p className="text-sm text-muted-foreground">
                    AI 會用這個名字稱呼你
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>AI 人設</Label>
                  <RadioGroup
                    value={settings?.aiPersona || "spiritual"}
                    onValueChange={(value) => updateSettings.mutate({ aiPersona: value as any })}
                    className="space-y-3"
                  >
                    {AI_PERSONAS.map((persona) => (
                      <div
                        key={persona.id}
                        className="flex items-start space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer"
                        onClick={() => updateSettings.mutate({ aiPersona: persona.id as any })}
                        data-testid={`radio-persona-${persona.id}`}
                      >
                        <RadioGroupItem value={persona.id} id={persona.id} className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor={persona.id} className="flex items-center gap-2 cursor-pointer">
                            <span>{persona.icon}</span>
                            <span className="font-medium">{persona.name}</span>
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {persona.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {settings?.aiPersona === "custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="custom-prompt">自訂人設提示</Label>
                    <Textarea
                      id="custom-prompt"
                      data-testid="input-custom-prompt"
                      placeholder="描述你想要的 AI 助手人設..."
                      value={customPrompt || settings?.customPersonaPrompt || ""}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      onBlur={(e) => updateSettings.mutate({ customPersonaPrompt: e.target.value })}
                      className="min-h-[120px]"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="view" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>檢視模式</CardTitle>
                <CardDescription>選擇任務的顯示方式</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3">
                  <button
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                      settings?.viewMode === "list" || !settings?.viewMode
                        ? "border-primary bg-primary/10"
                        : "border-border hover-elevate"
                    }`}
                    onClick={() => updateSettings.mutate({ viewMode: "list" as any })}
                    data-testid="button-view-list"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <List className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">清單模式</div>
                      <div className="text-sm text-muted-foreground">傳統任務清單，簡潔直觀</div>
                    </div>
                    {(settings?.viewMode === "list" || !settings?.viewMode) && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </button>
                  
                  <button
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                      settings?.viewMode === "calendar"
                        ? "border-primary bg-primary/10"
                        : "border-border hover-elevate"
                    }`}
                    onClick={() => updateSettings.mutate({ viewMode: "calendar" as any })}
                    data-testid="button-view-calendar"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">行事曆模式</div>
                      <div className="text-sm text-muted-foreground">週視圖時間軸，直接排程任務</div>
                    </div>
                    {settings?.viewMode === "calendar" && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </button>
                  
                  <button
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                      settings?.viewMode === "tree"
                        ? "border-primary bg-primary/10"
                        : "border-border hover-elevate"
                    }`}
                    onClick={() => updateSettings.mutate({ viewMode: "tree" as any })}
                    data-testid="button-view-tree"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                      <FolderTree className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">樹狀模式</div>
                      <div className="text-sm text-muted-foreground">階層式結構，展現任務關係</div>
                    </div>
                    {settings?.viewMode === "tree" && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  切換歷史
                </CardTitle>
                <CardDescription>最近的檢視模式切換記錄</CardDescription>
              </CardHeader>
              <CardContent>
                <ViewModeHistorySection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="theme" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>外觀主題</CardTitle>
                <CardDescription>選擇你喜歡的介面風格</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    className={`p-4 rounded-lg border-2 transition-all ${
                      settings?.theme === "dark"
                        ? "border-primary bg-primary/10"
                        : "border-border hover-elevate"
                    }`}
                    onClick={() => handleThemeChange("dark")}
                    data-testid="button-theme-dark"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center">
                        <Moon className="h-6 w-6 text-slate-100" />
                      </div>
                      <span className="font-medium">深色模式</span>
                      {settings?.theme === "dark" && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </button>
                  <button
                    className={`p-4 rounded-lg border-2 transition-all ${
                      settings?.theme === "light"
                        ? "border-primary bg-primary/10"
                        : "border-border hover-elevate"
                    }`}
                    onClick={() => handleThemeChange("light")}
                    data-testid="button-theme-light"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <Sun className="h-6 w-6 text-amber-600" />
                      </div>
                      <span className="font-medium">淺色模式</span>
                      {settings?.theme === "light" && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API 金鑰</CardTitle>
                <CardDescription>設定你自己的 API 金鑰以使用進階功能</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="gemini-key">Gemini API Key</Label>
                  <Input
                    id="gemini-key"
                    data-testid="input-gemini-key"
                    type="password"
                    placeholder="輸入你的 Gemini API Key"
                    defaultValue={settings?.customApiKeys?.gemini || ""}
                    onBlur={(e) =>
                      updateSettings.mutate({
                        customApiKeys: {
                          ...settings?.customApiKeys,
                          gemini: e.target.value,
                        },
                      })
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    使用自己的金鑰可獲得更高的使用限制
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    網路搜尋功能已內建於 Gemini API（Google Search Grounding），無需額外設定 API Key。
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cloud" className="space-y-4">
            {/* Apple Health Data Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  健康數據
                </CardTitle>
                <CardDescription>
                  上傳 Apple Health 健康數據讓 AI 提供個人化建議
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <HealthUpload />
              </CardContent>
            </Card>

            {/* Account / Login */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  帳戶
                </CardTitle>
                <CardDescription>
                  登入以同步資料到雲端
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!authStatus?.configured ? (
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <p className="text-sm text-muted-foreground">
                      登入功能尚未設定
                    </p>
                  </div>
                ) : authStatus?.authenticated && authStatus.user ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-green-500/5 border-green-500/30">
                      <div className="flex items-center gap-3">
                        {authStatus.user.avatarUrl ? (
                          <img
                            src={authStatus.user.avatarUrl}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-green-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{authStatus.user.displayName || authStatus.user.email}</p>
                          <p className="text-sm text-muted-foreground">已登入</p>
                        </div>
                      </div>
                      <Check className="h-5 w-5 text-green-500" />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full flex items-center gap-2"
                      onClick={handleLogout}
                      data-testid="button-logout"
                    >
                      <LogOut className="h-4 w-4" />
                      登出
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full flex items-center gap-2"
                    onClick={() => window.location.href = "/api/login"}
                    data-testid="button-google-signin"
                  >
                    <SiGoogle className="h-4 w-4" />
                    登入帳戶
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Cloud Sync */}
            <Card>
              <CardHeader>
                <CardTitle>雲端同步</CardTitle>
                <CardDescription>將你的資料備份到雲端</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Cloud className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Google Drive</p>
                      <p className="text-sm text-muted-foreground">
                        {cloudStatus?.connected ? "已連接" : "尚未連接"}
                      </p>
                    </div>
                  </div>
                  {cloudStatus?.connected && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => exportData.mutate()}
                    disabled={exportData.isPending}
                    data-testid="button-export"
                  >
                    <Download className="h-4 w-4" />
                    本地匯出
                  </Button>
                  <Button
                    className="flex items-center gap-2"
                    onClick={() => uploadToCloud.mutate()}
                    disabled={uploadToCloud.isPending || !cloudStatus?.connected}
                    data-testid="button-cloud-backup"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadToCloud.isPending ? "上傳中..." : "雲端備份"}
                  </Button>
                </div>

                {cloudBackups && cloudBackups.length > 0 && (
                  <div className="space-y-2">
                    <Label>最近備份</Label>
                    <div className="space-y-2">
                      {cloudBackups.slice(0, 3).map((backup) => (
                        <div
                          key={backup.id}
                          className="flex items-center justify-between p-3 rounded-lg border text-sm"
                        >
                          <span className="text-muted-foreground">
                            {new Date(backup.createdTime).toLocaleDateString("zh-TW")}
                          </span>
                          <span className="truncate max-w-[150px]">{backup.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm text-muted-foreground text-center">
                  {cloudStatus?.connected
                    ? "定期備份可確保你的資料安全"
                    : "請先連接 Google Drive 以使用雲端備份功能"}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mcp" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>MCP 串連</CardTitle>
                <CardDescription>連接外部服務以擴展 AI 功能</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">雲端文件搜尋</p>
                      {cloudStatus?.connected && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {cloudStatus?.connected
                        ? "允許 AI 搜尋你的 Google Drive 文件"
                        : "需要連接 Google Drive（雲端分頁）"}
                    </p>
                  </div>
                  <Switch
                    checked={settings?.mcpSettings?.fileSearch || false}
                    onCheckedChange={(checked) =>
                      updateSettings.mutate({
                        mcpSettings: {
                          ...settings?.mcpSettings,
                          fileSearch: checked,
                        },
                      })
                    }
                    disabled={!cloudStatus?.connected}
                    data-testid="switch-file-search"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">網路搜尋</p>
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      透過 Gemini Google Search 搜尋最新資訊
                    </p>
                  </div>
                  <Switch
                    checked={settings?.mcpSettings?.webSearch || false}
                    onCheckedChange={(checked) =>
                      updateSettings.mutate({
                        mcpSettings: {
                          ...settings?.mcpSettings,
                          webSearch: checked,
                        },
                      })
                    }
                    data-testid="switch-web-search"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">行事曆整合</p>
                      {calendarStatus?.connected && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {calendarStatus?.connected
                        ? "允許 AI 將任務加入行事曆"
                        : "需要連接 Google Calendar"}
                    </p>
                  </div>
                  <Switch
                    checked={settings?.mcpSettings?.calendar || false}
                    onCheckedChange={(checked) =>
                      updateSettings.mutate({
                        mcpSettings: {
                          ...settings?.mcpSettings,
                          calendar: checked,
                        },
                      })
                    }
                    disabled={!calendarStatus?.connected}
                    data-testid="switch-calendar"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">任務提醒</p>
                      {calendarStatus?.connected && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {calendarStatus?.connected
                        ? "透過 Google Calendar 發送任務提醒"
                        : "需要連接 Google Calendar"}
                    </p>
                  </div>
                  <Switch
                    checked={settings?.mcpSettings?.alarms || false}
                    onCheckedChange={(checked) =>
                      updateSettings.mutate({
                        mcpSettings: {
                          ...settings?.mcpSettings,
                          alarms: checked,
                        },
                      })
                    }
                    disabled={!calendarStatus?.connected}
                    data-testid="switch-alarms"
                  />
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">功能需求說明：</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>雲端文件搜尋：需連接 Google Drive</li>
                        <li>網路搜尋：使用 Gemini Google Search（內建）</li>
                        <li>行事曆與提醒：需連接 Google Calendar</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
