import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Send, Loader2, Heart, Sparkles } from "lucide-react";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export interface SedonaMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  step?: number; // 1: Identify, 2: Allow, 3: Release
  suggestModeSwitch?: boolean;
  switchReason?: string;
}

interface SedonaReleaseProps {
  messages: SedonaMessage[];
  isLoading: boolean;
  currentStep: number; // 1-3
  isComplete: boolean;
  showModeSwitchPrompt?: boolean;
  switchReason?: string;
  onSendMessage: (message: string) => void;
  onBack: () => void;
  onComplete: () => void;
  onSwitchToCreation?: () => void;
  onDismissSwitch?: () => void;
  onBackToPreviousFlow?: () => void;
  hasPreviousFlow?: boolean;
}

function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1 px-4 py-3">
      <div className="typing-dots flex space-x-1">
        <span className="w-2 h-2 bg-purple-400 rounded-full" />
        <span className="w-2 h-2 bg-purple-400 rounded-full" />
        <span className="w-2 h-2 bg-purple-400 rounded-full" />
      </div>
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: "識別" },
    { num: 2, label: "允許" },
    { num: 3, label: "釋放" },
  ];

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {steps.map((step, index) => (
        <div key={step.num} className="flex items-center">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
              currentStep >= step.num
                ? "bg-purple-500 text-white"
                : "bg-muted text-muted-foreground"
            )}
          >
            {step.num}
          </div>
          <span
            className={cn(
              "ml-2 text-sm",
              currentStep >= step.num ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "w-8 h-0.5 mx-3",
                currentStep > step.num ? "bg-purple-500" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: SedonaMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] px-4 py-3 rounded-2xl",
          isUser
            ? "bg-purple-600 text-white rounded-br-md"
            : "bg-card border border-purple-500/20 rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

export function SedonaRelease({
  messages,
  isLoading,
  currentStep,
  isComplete,
  showModeSwitchPrompt,
  switchReason,
  onSendMessage,
  onBack,
  onComplete,
  onSwitchToCreation,
  onDismissSwitch,
  onBackToPreviousFlow,
  hasPreviousFlow,
}: SedonaReleaseProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-purple-900/20 to-purple-800/10">
        <div className="flex items-center gap-3 mb-2">
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
            <Heart className="w-5 h-5 text-purple-400" />
            <span className="font-medium">情緒調頻</span>
          </div>
        </div>
        <StepIndicator currentStep={currentStep} />
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex items-start">
              <div className="bg-card border border-purple-500/20 rounded-2xl rounded-bl-md">
                <TypingIndicator />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Mode Switch Prompt or Previous Flow Button */}
      {showModeSwitchPrompt && !isComplete && (
        <div className="px-4 py-4 border-t border-blue-500/30 bg-gradient-to-r from-blue-900/20 to-blue-800/10">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-6 h-6 text-blue-400" />
            <p className="text-sm text-foreground">
              {switchReason || "感覺到你準備好開始創造了"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-muted-foreground/20"
              onClick={() => {
                hapticLight();
                onDismissSwitch?.();
              }}
              data-testid="button-stay-sedona"
            >
              繼續調頻
            </Button>
            {hasPreviousFlow ? (
              <Button
                variant="outline"
                className="flex-1 border-amber-500/30 text-amber-400"
                onClick={() => {
                  hapticLight();
                  onBackToPreviousFlow?.();
                }}
                data-testid="button-back-to-previous"
              >
                返回目標設定
              </Button>
            ) : (
              <Button
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700"
                onClick={() => {
                  hapticSuccess();
                  onSwitchToCreation?.();
                }}
                data-testid="button-switch-creation"
              >
                開始創造
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Completion State */}
      {isComplete ? (
        <div className="px-4 py-6 border-t border-border bg-gradient-to-r from-purple-900/20 to-purple-800/10">
          <div className="text-center mb-4">
            <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-3 float" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              釋放完成
            </h3>
            <p className="text-sm text-muted-foreground">
              清理容器也是建設。你已獲得情緒奇觀的經驗值！
            </p>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700"
            onClick={() => {
              hapticSuccess();
              onComplete();
            }}
            data-testid="button-complete"
          >
            繼續
          </Button>
        </div>
      ) : !showModeSwitchPrompt && (
        <form
          onSubmit={handleSubmit}
          className="px-4 py-3 border-t border-border bg-background safe-area-inset-bottom"
        >
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                currentStep === 1
                  ? "描述你現在的感受..."
                  : currentStep === 2
                  ? "回答：你能允許這個感受存在嗎？"
                  : "回答：你願意放下這個感受嗎？"
              }
              className="flex-1 bg-card border-purple-500/20 focus:border-purple-500"
              disabled={isLoading}
              data-testid="input-sedona"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-send-sedona"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
