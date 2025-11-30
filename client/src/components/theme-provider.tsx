import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UserSettings } from "@shared/schema";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    const theme = settings?.theme || "dark";
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings?.theme]);

  return <>{children}</>;
}
