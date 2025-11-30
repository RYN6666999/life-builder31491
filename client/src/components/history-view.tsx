import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, MessageCircle, Heart, Play, Archive, MoreVertical } from "lucide-react";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import type { Project } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface HistoryViewProps {
  projects: Project[];
  onResumeProject: (project: Project) => void;
  onArchiveProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onClearAll: () => void;
}

export function HistoryView({ 
  projects, 
  onResumeProject, 
  onArchiveProject,
  onDeleteProject,
  onClearAll 
}: HistoryViewProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const activeProjects = projects.filter(p => p.status === "active");
  const archivedProjects = projects.filter(p => p.status === "archived");

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4 gap-4">
        <p className="text-muted-foreground text-center">
          暫時沒有專案
          <br />
          開始對話後會自動保存為專案
        </p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "chat":
        return <MessageCircle className="w-4 h-4 text-blue-400" />;
      case "sedona":
        return <Heart className="w-4 h-4 text-purple-400" />;
      default:
        return <MessageCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getMonumentColor = (slug?: string) => {
    const colors: Record<string, string> = {
      career: "border-l-blue-500",
      wealth: "border-l-amber-500",
      emotion: "border-l-purple-500",
      family: "border-l-pink-500",
      health: "border-l-emerald-500",
      experience: "border-l-orange-500",
    };
    return slug ? colors[slug] || "border-l-muted" : "border-l-muted";
  };

  const handleDelete = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProjectId(projectId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (selectedProjectId) {
      onDeleteProject(selectedProjectId);
      hapticMedium();
    }
    setShowDeleteConfirm(false);
    setSelectedProjectId(null);
  };

  const renderProjectCard = (project: Project) => (
    <Card
      key={project.id}
      className={cn(
        "p-4 border-l-4 hover-elevate cursor-pointer transition-all",
        getMonumentColor(project.monumentSlug),
        project.status === "archived" && "opacity-60"
      )}
      onClick={() => {
        hapticLight();
        onResumeProject(project);
      }}
      data-testid={`card-project-${project.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">{getIcon(project.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-sm truncate">{project.title}</h3>
            <div className="flex items-center gap-1">
              {project.status === "active" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    hapticLight();
                    onArchiveProject(project.id);
                  }}
                  data-testid={`button-archive-${project.id}`}
                >
                  <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => handleDelete(project.id, e)}
                data-testid={`button-delete-${project.id}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {project.lastMessagePreview}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(project.updatedAt, {
                locale: zhCN,
                addSuffix: true,
              })}
            </span>
            <span>•</span>
            <span>{project.messageCount} 條訊息</span>
            {project.topicKeywords.length > 0 && (
              <>
                <span>•</span>
                <span className="text-primary/70">
                  {project.topicKeywords.slice(0, 2).join("、")}
                </span>
              </>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            hapticSuccess();
            onResumeProject(project);
          }}
          data-testid={`button-resume-${project.id}`}
        >
          <Play className="w-4 h-4 text-primary" />
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold">我的專案</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            hapticLight();
            setShowClearAllConfirm(true);
          }}
          className="text-destructive hover:bg-destructive/10"
          data-testid="button-clear-all"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Active Projects */}
        {activeProjects.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              進行中 ({activeProjects.length})
            </h3>
            {activeProjects.map(renderProjectCard)}
          </div>
        )}

        {/* Archived Projects */}
        {archivedProjects.length > 0 && (
          <div className="space-y-3 mt-6">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              已歸檔 ({archivedProjects.length})
            </h3>
            {archivedProjects.map(renderProjectCard)}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除這個專案嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除後無法恢復，所有對話記錄都會永久消失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              確定刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={showClearAllConfirm} onOpenChange={setShowClearAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要清空所有專案嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              這將刪除所有對話記錄和專案資料，此操作無法撤銷。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onClearAll();
                hapticMedium();
                setShowClearAllConfirm(false);
              }} 
              className="bg-destructive text-destructive-foreground"
            >
              確定清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
