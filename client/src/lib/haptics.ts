// Haptic feedback utilities using Web Vibration API

export type HapticPattern = "light" | "medium" | "heavy" | "success" | "error" | "selection";

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 20, 100, 30],
  error: [100, 50, 100],
  selection: 15,
};

export function triggerHaptic(pattern: HapticPattern = "light"): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(HAPTIC_PATTERNS[pattern]);
    } catch (e) {
      // Silently fail if vibration not supported
      console.debug("Haptic feedback not available:", e);
    }
  }
}

// Convenience functions
export const hapticLight = () => triggerHaptic("light");
export const hapticMedium = () => triggerHaptic("medium");
export const hapticHeavy = () => triggerHaptic("heavy");
export const hapticSuccess = () => triggerHaptic("success");
export const hapticError = () => triggerHaptic("error");
export const hapticSelection = () => triggerHaptic("selection");
