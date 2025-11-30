import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Send, Loader2, AlertTriangle, Check } from "lucide-react";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { MonumentConfig } from "@/lib/monuments";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  options?: string[];
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
}

interface ChatInterfaceProps {
  monument: MonumentConfig;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onSelectOption: (option: string) => void;
  onBack: () => void;
  onStuck: () => void;
}

function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1 px-4 py-3">
      <div className="typing-dots flex space-x-1">
        <span className="w-2 h-2 bg-muted-foreground rounded-full" />
        <span className="w-2 h-2 bg-muted-foreground rounded-full" />
        <span className="w-2 h-2 bg-muted-foreground rounded-full" />
      </div>
    </div>
  );
}

function MessageBubble({ message, onSelectOption }: { 
  message: Message; 
  onSelectOption?: (option: string) => void;
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
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
      
      {message.options && message.options.length > 0 && (
        <div className="mt-3 space-y-2 w-full max-w-[85%]">
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
                {tool.name === "create_smart_task" && "已創建任務"}
                {tool.name === "award_xp" && "已獲得經驗值"}
                {tool.name === "recursive_breakdown" && "已拆解任務"}
                {tool.name === "set_ui_mode" && "已切換模式"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatInterface({
  monument,
  messages,
  isLoading,
  onSendMessage,
  onSelectOption,
  onBack,
  onStuck,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Scroll to bottom on every message change
    if (scrollRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      hapticLight();
      onSendMessage(input.trim());
      setInput("");
    }
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

  const Icon = monument.icon;

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
            <Icon className={cn("w-5 h-5", getIconColor(monument.slug))} />
            <span className="font-medium">{monument.nameCn}</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            hapticMedium();
            onStuck();
          }}
          className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
          data-testid="button-stuck"
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          卡住了
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onSelectOption={onSelectOption}
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

      {/* Input */}
      <form 
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t border-border bg-background safe-area-inset-bottom"
      >
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="輸入你的目標或任務..."
            className="flex-1 bg-card border-border"
            disabled={isLoading}
            data-testid="input-message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
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
