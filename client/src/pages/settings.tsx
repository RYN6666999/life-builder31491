import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, User, Palette, Key, Cloud, Plug, Sun, Moon, Check, Upload, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { UserSettings } from "@shared/schema";

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

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [customPrompt, setCustomPrompt] = useState("");

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const response = await apiRequest("PATCH", "/api/settings", updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "設定已儲存",
        description: "你的偏好設定已更新",
      });
    },
    onError: () => {
      toast({
        title: "儲存失敗",
        description: "請稍後再試",
        variant: "destructive",
      });
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
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="h-4 w-4" />
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

                <div className="space-y-2">
                  <Label htmlFor="perplexity-key">Perplexity API Key</Label>
                  <Input
                    id="perplexity-key"
                    data-testid="input-perplexity-key"
                    type="password"
                    placeholder="輸入你的 Perplexity API Key"
                    defaultValue={settings?.customApiKeys?.perplexity || ""}
                    onBlur={(e) =>
                      updateSettings.mutate({
                        customApiKeys: {
                          ...settings?.customApiKeys,
                          perplexity: e.target.value,
                        },
                      })
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    用於網路搜尋功能
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cloud" className="space-y-4">
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
                      {settings?.customApiKeys?.perplexity && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {settings?.customApiKeys?.perplexity
                        ? "允許 AI 搜尋網路獲取最新資訊"
                        : "需要設定 Perplexity API Key（API 分頁）"}
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
                    disabled={!settings?.customApiKeys?.perplexity}
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
                        <li>網路搜尋：需設定 Perplexity API Key</li>
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
