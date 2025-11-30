import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, MessageCircle, Heart } from "lucide-react";
import { hapticLight } from "@/lib/haptics";
import type { HistoryEntry } from "@/lib/storage";

interface HistoryViewProps {
  entries: HistoryEntry[];
  onClear: () => void;
}

export function HistoryView({ entries, onClear }: HistoryViewProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4 gap-4">
        <p className="text-muted-foreground text-center">
          暫時沒有歷史記錄
          <br />
          開始對話後會自動每10秒保存一次
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
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] pb-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold">對話歷史</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            hapticLight();
            onClear();
          }}
          className="text-destructive hover:bg-destructive/10"
          data-testid="button-clear-history"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {entries.map((entry) => (
          <Card
            key={entry.id}
            className="p-4 border border-border/50 hover-elevate cursor-pointer"
            data-testid={`card-history-${entry.id}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">{getIcon(entry.type)}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm">{entry.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {entry.preview}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>
                    {formatDistanceToNow(entry.timestamp, {
                      locale: zhCN,
                      addSuffix: true,
                    })}
                  </span>
                  {entry.messageCount && (
                    <>
                      <span>•</span>
                      <span>{entry.messageCount} 條訊息</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
