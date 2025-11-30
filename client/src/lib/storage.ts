// Local storage utilities for persisting conversations and history

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

interface HistoryEntry {
  id: string;
  type: "chat" | "sedona" | "task_completed";
  monumentName?: string;
  monumentId?: string;
  title: string;
  preview: string;
  timestamp: number;
  messageCount?: number;
  xpGained?: number;
}

const CONVERSATION_KEY = "lb_conversation_cache";
const HISTORY_KEY = "lb_history";
const MAX_HISTORY_ENTRIES = 50;

export function saveConversation(cache: ConversationCache) {
  try {
    localStorage.setItem(CONVERSATION_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to save conversation:", error);
  }
}

export function loadConversation(): ConversationCache | null {
  try {
    const data = localStorage.getItem(CONVERSATION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to load conversation:", error);
    return null;
  }
}

export function clearConversation() {
  try {
    localStorage.removeItem(CONVERSATION_KEY);
  } catch (error) {
    console.error("Failed to clear conversation:", error);
  }
}

// History management
export function addHistoryEntry(entry: Omit<HistoryEntry, "id">) {
  try {
    const history = loadHistory();
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now().toString(),
    };
    
    history.unshift(newEntry);
    // Keep only latest 50 entries
    const trimmed = history.slice(0, MAX_HISTORY_ENTRIES);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Failed to add history entry:", error);
  }
}

export function loadHistory(): HistoryEntry[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load history:", error);
    return [];
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear history:", error);
  }
}

export type { HistoryEntry };

// Auto-save history from current conversation
export function captureCurrentState(
  flowStep: string,
  flowType: "mood" | "task" | null,
  messages: Array<any>,
  sedonaMessages: Array<any>,
  monumentName?: string,
  monumentId?: string
) {
  if (flowStep === "chat" && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    addHistoryEntry({
      type: "chat",
      monumentName,
      monumentId,
      title: `${monumentName}：目標對話`,
      preview: lastMessage.content.substring(0, 80),
      timestamp: Date.now(),
      messageCount: messages.length,
    });
  } else if (flowStep === "sedona" && sedonaMessages.length > 0) {
    const lastMessage = sedonaMessages[sedonaMessages.length - 1];
    addHistoryEntry({
      type: "sedona",
      title: "情緒調頻",
      preview: lastMessage.content.substring(0, 80),
      timestamp: Date.now(),
      messageCount: sedonaMessages.length,
    });
  }
}
