// Local storage utilities for persisting conversations

interface ConversationCache {
  flowStep: string;
  flowType: "mood" | "task" | null;
  monumentId?: string;
  monumentName?: string;
  messages: Array<any>;
  sedonaMessages: Array<any>;
  sedonaStep: number;
  timestamp: number;
}

const STORAGE_KEY = "lb_conversation_cache";

export function saveConversation(cache: ConversationCache) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to save conversation:", error);
  }
}

export function loadConversation(): ConversationCache | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to load conversation:", error);
    return null;
  }
}

export function clearConversation() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear conversation:", error);
  }
}
