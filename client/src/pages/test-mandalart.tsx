import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import type { MandalartGeneration } from "@shared/schema";

export default function TestMandalart() {
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState<MandalartGeneration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!goal.trim()) {
      setError("Please enter a goal");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/mandalart/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ goal: goal.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate Mandalart plan");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Mandalart Generation Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                data-testid="input-goal"
                placeholder="Enter your goal (e.g., Plan a trip to Tokyo)"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                disabled={isLoading}
              />
              <Button
                data-testid="button-generate"
                onClick={handleGenerate}
                disabled={isLoading || !goal.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </Button>
            </div>

            {error && (
              <div
                data-testid="text-error"
                className="rounded-md bg-destructive/10 p-3 text-destructive"
              >
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-center-title">
                Result: {result.centerTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Children count: {result.children.length}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.children.map((child, index) => (
                    <div
                      key={index}
                      data-testid={`card-child-${child.slot}`}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Slot {child.slot}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            child.priority === "Q1"
                              ? "bg-red-500/20 text-red-500"
                              : child.priority === "Q2"
                              ? "bg-amber-500/20 text-amber-500"
                              : child.priority === "Q3"
                              ? "bg-blue-500/20 text-blue-500"
                              : "bg-gray-500/20 text-gray-500"
                          }`}
                        >
                          {child.priority}
                        </span>
                      </div>
                      <div className="text-sm font-medium">{child.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Action: {child.actionStep}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{child.estimatedMinutes} min</span>
                        <span className="px-1.5 py-0.5 rounded bg-secondary">
                          {child.mcpIntent}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-2">Raw JSON Output:</h3>
                  <pre
                    data-testid="text-json-output"
                    className="rounded-lg bg-secondary p-4 overflow-auto text-xs max-h-96"
                  >
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
