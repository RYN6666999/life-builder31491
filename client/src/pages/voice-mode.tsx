import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Settings } from "lucide-react";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

type OrbState = "idle" | "listening" | "thinking" | "speaking";

interface VoiceModeSettings {
  continuousMode: boolean;
  language: string;
}

export default function VoiceMode() {
  const [, setLocation] = useLocation();
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<VoiceModeSettings>({
    continuousMode: false,
    language: "zh-TW",
  });

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  
  // Refs to avoid stale closures in speech recognition handlers
  const orbStateRef = useRef(orbState);
  const transcriptRef = useRef(transcript);
  const settingsRef = useRef(settings);
  const handleAutoSubmitRef = useRef<((text: string) => void) | null>(null);
  
  // Keep refs in sync with state
  useEffect(() => { orbStateRef.current = orbState; }, [orbState]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) &&
    "speechSynthesis" in window;

  // Fetch user settings for personalization
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
  });

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognitionAPI();
    
    const recognition = recognitionRef.current;
    recognition.lang = settings.language;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      lastSpeechTimeRef.current = Date.now();

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      setTranscript(finalText || interimText);
      
      // Reset silence timer when speech is detected
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      
      // Auto-submit after 1.5 seconds of silence
      silenceTimerRef.current = setTimeout(() => {
        const textToSend = finalText || interimText;
        if (textToSend.trim() && orbStateRef.current === "listening") {
          handleAutoSubmitRef.current?.(textToSend.trim());
        }
      }, 1500);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "no-speech") {
        setError(`語音識別錯誤: ${event.error}`);
      }
      setOrbState("idle");
    };

    recognition.onend = () => {
      if (orbStateRef.current === "listening") {
        // Check if we should auto-submit or restart listening
        const now = Date.now();
        const timeSinceLastSpeech = now - lastSpeechTimeRef.current;
        
        if (transcriptRef.current.trim() && timeSinceLastSpeech >= 1500) {
          handleAutoSubmitRef.current?.(transcriptRef.current.trim());
        } else if (settingsRef.current.continuousMode) {
          // Restart recognition in continuous mode if no transcript
          try {
            recognition.start();
          } catch (e) {
            // Already started or error, ignore
          }
        }
      }
    };

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {}
      }
    };
  }, [isSupported, settings.language]);

  // Handle auto-submit when silence is detected
  const handleAutoSubmit = useCallback(async (text: string) => {
    if (!text.trim()) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    try {
      recognitionRef.current?.stop();
    } catch (e) {}

    setOrbState("thinking");
    setTranscript("");
    hapticMedium();

    try {
      // Send to AI with voice mode context
      const response = await apiRequest("POST", "/api/voice-chat", {
        message: text,
        persona: (userSettings as any)?.aiPersona || "spiritual",
      });

      const result = await response.json();
      const aiResponse = result.response;
      setResponse(aiResponse);
      setOrbState("speaking");
      
      // Speak the response
      speakResponse(aiResponse);
    } catch (err) {
      console.error("Voice chat error:", err);
      setError("無法連接到靈導，請稍後再試");
      setOrbState("idle");
    }
  }, [userSettings]);

  // Keep handleAutoSubmitRef in sync
  useEffect(() => {
    handleAutoSubmitRef.current = handleAutoSubmit;
  }, [handleAutoSubmit]);

  // Text-to-Speech voices state
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load voices when available
  useEffect(() => {
    if (!window.speechSynthesis) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    // Load immediately if available
    loadVoices();

    // Also listen for voiceschanged event
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Text-to-Speech
  const speakResponse = useCallback((text: string) => {
    if (!window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = settings.language;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    // Try to find a calm voice
    const preferredVoice = voices.find(v => 
      v.lang.includes("zh") && (v.name.includes("female") || v.name.includes("Google"))
    ) || voices.find(v => v.lang.includes("zh")) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      hapticLight();
      if (settings.continuousMode) {
        // Auto-listen again after AI finishes speaking
        setTimeout(() => {
          startListening();
        }, 500);
      } else {
        setOrbState("idle");
      }
    };

    utterance.onerror = (e) => {
      console.error("TTS error:", e);
      setOrbState("idle");
    };

    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [settings.language, settings.continuousMode, voices]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;

    // Cancel any ongoing speech
    window.speechSynthesis?.cancel();

    setOrbState("listening");
    setTranscript("");
    setResponse("");
    setError(null);
    hapticMedium();

    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already started, restart
      recognitionRef.current.stop();
      setTimeout(() => {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.error("Failed to start recognition:", err);
        }
      }, 100);
    }
  }, []);

  // Stop everything
  const stopAll = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    try {
      recognitionRef.current?.stop();
    } catch (e) {}
    window.speechSynthesis?.cancel();
    setOrbState("idle");
    setTranscript("");
    hapticLight();
  }, []);

  // Handle orb tap
  const handleOrbTap = useCallback(() => {
    if (orbState === "idle") {
      startListening();
    } else {
      stopAll();
    }
  }, [orbState, startListening, stopAll]);

  // Get orb styles based on state
  const getOrbStyles = () => {
    const baseStyles = "relative w-48 h-48 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300";
    
    switch (orbState) {
      case "idle":
        return cn(baseStyles, "bg-gradient-to-br from-blue-500/30 to-amber-500/30 animate-pulse-slow");
      case "listening":
        return cn(baseStyles, "bg-gradient-to-br from-red-500/50 to-orange-500/50 animate-pulse");
      case "thinking":
        return cn(baseStyles, "bg-gradient-to-br from-purple-500/50 to-pink-500/50 animate-spin-slow");
      case "speaking":
        return cn(baseStyles, "bg-gradient-to-br from-green-500/40 to-teal-500/40 animate-pulse");
      default:
        return baseStyles;
    }
  };

  const getInnerOrbStyles = () => {
    const baseStyles = "absolute w-32 h-32 rounded-full";
    
    switch (orbState) {
      case "idle":
        return cn(baseStyles, "bg-gradient-to-br from-blue-400 to-amber-400 opacity-60");
      case "listening":
        return cn(baseStyles, "bg-gradient-to-br from-red-400 to-orange-400 opacity-80 animate-ping-slow");
      case "thinking":
        return cn(baseStyles, "bg-gradient-to-br from-purple-400 to-pink-400 opacity-70");
      case "speaking":
        return cn(baseStyles, "bg-gradient-to-br from-green-400 to-teal-400 opacity-70 animate-pulse");
      default:
        return baseStyles;
    }
  };

  const getStateText = () => {
    switch (orbState) {
      case "idle":
        return "輕觸開始對話";
      case "listening":
        return "正在聆聽...";
      case "thinking":
        return "靈導思考中...";
      case "speaking":
        return "靈導回應中...";
      default:
        return "";
    }
  };

  if (!isSupported) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <p className="text-muted-foreground mb-4">
          您的瀏覽器不支援語音功能。
          請使用 Chrome、Safari 或 Edge 瀏覽器。
        </p>
        <Button onClick={() => setLocation("/")} data-testid="button-back-home">
          返回首頁
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            stopAll();
            setLocation("/");
          }}
          data-testid="button-back"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-semibold">靈魂通話</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
          data-testid="button-settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-border bg-card/50 space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="continuous-mode" className="text-sm">
              連續對話模式
            </Label>
            <Switch
              id="continuous-mode"
              checked={settings.continuousMode}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, continuousMode: checked }))
              }
              data-testid="switch-continuous-mode"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            開啟後，靈導回應完畢會自動繼續聆聽您的話語
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-8">
        {/* Soul Orb */}
        <div 
          className={getOrbStyles()}
          onClick={handleOrbTap}
          data-testid="soul-orb"
        >
          {/* Ripple effects for listening state */}
          {orbState === "listening" && (
            <>
              <div className="absolute w-56 h-56 rounded-full border-2 border-red-400/30 animate-ping" />
              <div className="absolute w-64 h-64 rounded-full border border-orange-400/20 animate-ping" style={{ animationDelay: "0.5s" }} />
            </>
          )}
          
          {/* Inner orb */}
          <div className={getInnerOrbStyles()} />
          
          {/* Center icon/indicator */}
          <div className="relative z-10 text-white/90">
            {orbState === "idle" && (
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            )}
            {orbState === "listening" && (
              <div className="flex gap-1">
                <div className="w-2 h-8 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-8 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-8 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}
            {orbState === "thinking" && (
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {orbState === "speaking" && (
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            )}
          </div>
        </div>

        {/* State text */}
        <p className="text-lg text-muted-foreground" data-testid="text-state">
          {getStateText()}
        </p>

        {/* Transcript display */}
        {transcript && (
          <div className="max-w-sm text-center p-4 bg-card rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">您說：</p>
            <p className="text-foreground" data-testid="text-transcript">{transcript}</p>
          </div>
        )}

        {/* AI Response display (subtitle style) */}
        {response && orbState === "speaking" && (
          <div className="max-w-sm text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-primary/70 mb-1">靈導：</p>
            <p className="text-foreground" data-testid="text-response">{response}</p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="max-w-sm text-center p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="p-4 text-center text-xs text-muted-foreground">
        {orbState === "idle" ? (
          "輕觸靈魂球開始與數據指導靈對話"
        ) : orbState === "listening" ? (
          "說完後靜默 1.5 秒將自動傳送"
        ) : (
          "輕觸可隨時停止"
        )}
      </div>
    </div>
  );
}
