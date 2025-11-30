import { useEffect, useState, useRef } from "react";
import { WISDOM_QUOTES } from "../../../lib/quotes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WisdomTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAutoPlay || WISDOM_QUOTES.length === 0) return;

    // Clear any existing timer
    if (timerRef.current) clearInterval(timerRef.current);

    // Set new timer
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % WISDOM_QUOTES.length;
        return next;
      });
    }, 5000); // Change quote every 5 seconds

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoPlay]);

  const currentQuote = WISDOM_QUOTES[currentIndex] || WISDOM_QUOTES[0];

  const handlePrevious = () => {
    setIsAutoPlay(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentIndex(
      (prev) => (prev - 1 + WISDOM_QUOTES.length) % WISDOM_QUOTES.length
    );
  };

  const handleNext = () => {
    setIsAutoPlay(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentIndex((prev) => (prev + 1) % WISDOM_QUOTES.length);
  };

  const handleResumeAutoPlay = () => {
    setIsAutoPlay(true);
  };

  return (
    <div className="border-t border-muted-foreground/10 bg-black/30 px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <Button
          size="icon"
          variant="ghost"
          onClick={handlePrevious}
          className="h-8 w-8 flex-shrink-0"
          data-testid="button-quote-previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div
          className="flex-1 min-h-16 flex flex-col justify-center text-center cursor-pointer transition-opacity hover:opacity-80"
          onClick={handleResumeAutoPlay}
          data-testid="text-quote"
        >
          <p className="text-xs text-muted-foreground mb-2">
            {currentIndex + 1} / {WISDOM_QUOTES.length}
          </p>
          <p className="text-sm italic text-foreground/80 leading-relaxed">
            "{currentQuote.text}"
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            — {currentQuote.author}
          </p>
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={handleNext}
          className="h-8 w-8 flex-shrink-0"
          data-testid="button-quote-next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress indicator */}
      <div className="mt-3 flex gap-1 justify-center flex-wrap">
        {WISDOM_QUOTES.slice(0, 8).map((_: unknown, idx: number) => (
          <div
            key={idx}
            className={`h-1 w-1 rounded-full transition-colors ${
              idx === currentIndex % 8
                ? "bg-blue-500"
                : "bg-muted-foreground/20"
            }`}
            data-testid={`indicator-quote-${idx}`}
          />
        ))}
      </div>
    </div>
  );
}
