import { useState, useCallback, useRef, useEffect } from "react";

interface UseVoiceOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface UseVoiceReturn {
  isListening: boolean;
  transcript: string;
  finalTranscript: string;
  isSupported: boolean;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  clearTranscript: () => void;
  error: string | null;
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    lang = "zh-TW",
    continuous = false,
    interimResults = true,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) &&
    "speechSynthesis" in window;

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognitionAPI();
    
    const recognition = recognitionRef.current;
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onresult = (event: any) => {
      let final = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setFinalTranscript(prev => prev + final);
      }
      setTranscript(final || interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognition) {
        recognition.abort();
      }
    };
  }, [lang, continuous, interimResults, isSupported]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setFinalTranscript("");
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      setError("Speech recognition not supported");
      return;
    }

    setError(null);
    setTranscript("");
    setFinalTranscript("");
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setError("Failed to start listening");
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const chineseVoice = voices.find(v => v.lang.startsWith("zh"));
    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [lang, isSupported]);

  const stopSpeaking = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    isListening,
    transcript,
    finalTranscript,
    isSupported,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearTranscript,
    error,
  };
}
