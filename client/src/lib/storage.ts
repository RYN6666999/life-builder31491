// Local storage utilities for persisting conversations as projects

export interface Project {
  id: string;
  title: string;
  type: "chat" | "sedona";
  monumentId?: string;
  monumentName?: string;
  monumentSlug?: string;
  status: "active" | "completed" | "archived";
  messages: Array<any>;
  sedonaMessages: Array<any>;
  sedonaStep: number;
  flowStep: string;
  flowType: "mood" | "task" | null;
  createdAt: number;
  updatedAt: number;
  lastMessagePreview: string;
  messageCount: number;
  topicKeywords: string[];
  sessionId?: string;
}

interface ConversationCache {
  flowStep: string;
  flowType: "mood" | "task" | null;
  monumentId?: string;
  monumentName?: string;
  monumentSlug?: string;
  messages: Array<any>;
  sedonaMessages: Array<any>;
  sedonaStep: number;
  timestamp: number;
  activeProjectId?: string;
  sessionId?: string;
}

const CONVERSATION_KEY = "lb_conversation_cache";
const PROJECTS_KEY = "lb_projects";
const MAX_PROJECTS = 100;

// Extract keywords from messages to determine topic similarity
function extractKeywords(messages: Array<any>): string[] {
  const allText = messages.map(m => m.content || "").join(" ");
  const keywords: string[] = [];
  
  // Financial topics
  if (/保險|insurance|保障|風險管理/i.test(allText)) keywords.push("保險");
  if (/投資|investment|股票|基金|理財|收益/i.test(allText)) keywords.push("投資");
  if (/儲蓄|存款|saving|儲錢/i.test(allText)) keywords.push("儲蓄");
  if (/債務|貸款|debt|還款/i.test(allText)) keywords.push("債務");
  if (/房產|房子|置業|property|買房/i.test(allText)) keywords.push("房產");
  if (/退休|養老|pension/i.test(allText)) keywords.push("退休");
  if (/創業|business|生意|公司/i.test(allText)) keywords.push("創業");
  if (/收入|薪水|salary|加薪/i.test(allText)) keywords.push("收入");
  
  // Career topics
  if (/工作|job|職業|career/i.test(allText)) keywords.push("工作");
  if (/升職|promotion|晉升/i.test(allText)) keywords.push("升職");
  if (/技能|skill|學習|進修/i.test(allText)) keywords.push("技能");
  if (/轉行|換工作|跳槽/i.test(allText)) keywords.push("轉行");
  
  // Health topics
  if (/運動|exercise|健身|gym/i.test(allText)) keywords.push("運動");
  if (/飲食|diet|減肥|健康飲食/i.test(allText)) keywords.push("飲食");
  if (/睡眠|sleep|作息/i.test(allText)) keywords.push("睡眠");
  if (/壓力|stress|焦慮|anxiety/i.test(allText)) keywords.push("壓力");
  
  // Relationship topics
  if (/家人|family|父母|親人/i.test(allText)) keywords.push("家人");
  if (/朋友|friend|社交/i.test(allText)) keywords.push("朋友");
  if (/伴侶|relationship|感情|愛情/i.test(allText)) keywords.push("感情");
  
  // Experience topics
  if (/旅行|travel|旅遊/i.test(allText)) keywords.push("旅行");
  if (/興趣|hobby|愛好/i.test(allText)) keywords.push("興趣");
  if (/目標|goal|夢想|願望/i.test(allText)) keywords.push("目標");
  
  return keywords;
}

// Generate title from messages
export function generateProjectTitle(
  messages: Array<any>,
  monumentName?: string,
  type?: "chat" | "sedona"
): string {
  if (type === "sedona") {
    // For sedona, extract emotion from first user message
    const firstUserMsg = messages.find(m => m.role === "user");
    if (firstUserMsg) {
      const emotion = firstUserMsg.content.substring(0, 20);
      return `調頻：${emotion}...`;
    }
    return "情緒調頻";
  }
  
  // For chat, find the first user intent
  const firstUserMsg = messages.find(m => m.role === "user");
  if (firstUserMsg) {
    const content = firstUserMsg.content;
    // Truncate and clean up
    const title = content.substring(0, 30).replace(/\n/g, " ");
    if (monumentName) {
      return `${monumentName}：${title}...`;
    }
    return `${title}...`;
  }
  
  return monumentName ? `${monumentName}：新專案` : "新專案";
}

// Check if two projects should be merged (same topic in same monument)
function shouldMergeProjects(
  existing: Project,
  newKeywords: string[],
  monumentId?: string
): boolean {
  // Must be same monument
  if (existing.monumentId !== monumentId) return false;
  
  // Must be same type
  if (existing.type !== "chat") return false;
  
  // Must be active
  if (existing.status !== "active") return false;
  
  // Check keyword overlap - if different main topics, don't merge
  // e.g., "保險" vs "投資" should NOT merge
  const existingKeywords = existing.topicKeywords;
  
  // If no keywords yet, can merge
  if (existingKeywords.length === 0 || newKeywords.length === 0) return true;
  
  // Check if any major financial topics differ
  const majorFinancialTopics = ["保險", "投資", "儲蓄", "債務", "房產", "退休", "創業"];
  const existingMajorTopics = existingKeywords.filter(k => majorFinancialTopics.includes(k));
  const newMajorTopics = newKeywords.filter(k => majorFinancialTopics.includes(k));
  
  // If both have major topics and they differ, don't merge
  if (existingMajorTopics.length > 0 && newMajorTopics.length > 0) {
    const hasOverlap = existingMajorTopics.some(t => newMajorTopics.includes(t));
    if (!hasOverlap) return false;
  }
  
  // Otherwise, merge if same monument
  return true;
}

// === Conversation Cache (current active session) ===

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

// === Project Management ===

export function loadProjects(): Project[] {
  try {
    const data = localStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load projects:", error);
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("Failed to save projects:", error);
  }
}

export function getProjectById(id: string): Project | null {
  const projects = loadProjects();
  return projects.find(p => p.id === id) || null;
}

// Save or update a project (with smart merging)
export function saveOrMergeProject(
  type: "chat" | "sedona",
  flowStep: string,
  flowType: "mood" | "task" | null,
  messages: Array<any>,
  sedonaMessages: Array<any>,
  sedonaStep: number,
  monumentId?: string,
  monumentName?: string,
  monumentSlug?: string,
  existingProjectId?: string,
  sessionId?: string
): string {
  const projects = loadProjects();
  const now = Date.now();
  
  const currentMessages = type === "sedona" ? sedonaMessages : messages;
  if (currentMessages.length === 0) {
    return existingProjectId || "";
  }
  
  const keywords = extractKeywords(currentMessages);
  const lastMessage = currentMessages[currentMessages.length - 1];
  const preview = lastMessage?.content?.substring(0, 80) || "";
  
  // Check if we should update an existing project
  if (existingProjectId) {
    const existingIndex = projects.findIndex(p => p.id === existingProjectId);
    if (existingIndex !== -1) {
      // Update existing project
      projects[existingIndex] = {
        ...projects[existingIndex],
        messages,
        sedonaMessages,
        sedonaStep,
        flowStep,
        flowType,
        updatedAt: now,
        lastMessagePreview: preview,
        messageCount: currentMessages.length,
        topicKeywords: Array.from(new Set([...projects[existingIndex].topicKeywords, ...keywords])),
        sessionId: sessionId || projects[existingIndex].sessionId, // 保持原本或更新
      };
      saveProjects(projects);
      return existingProjectId;
    }
  }
  
  // Try to find a project to merge with
  const mergeCandidate = projects.find(p => 
    shouldMergeProjects(p, keywords, monumentId)
  );
  
  if (mergeCandidate) {
    // Merge into existing project
    const mergedMessages = type === "sedona" 
      ? sedonaMessages 
      : [...mergeCandidate.messages, ...messages.slice(mergeCandidate.messages.length)];
    
    const idx = projects.findIndex(p => p.id === mergeCandidate.id);
    projects[idx] = {
      ...mergeCandidate,
      messages: type === "sedona" ? mergeCandidate.messages : mergedMessages,
      sedonaMessages: type === "sedona" ? sedonaMessages : mergeCandidate.sedonaMessages,
      sedonaStep,
      flowStep,
      flowType,
      updatedAt: now,
      lastMessagePreview: preview,
      messageCount: (type === "sedona" ? sedonaMessages : mergedMessages).length,
      topicKeywords: Array.from(new Set([...mergeCandidate.topicKeywords, ...keywords])),
      sessionId: sessionId || mergeCandidate.sessionId, // <--- merge 同理
    };
    saveProjects(projects);
    return mergeCandidate.id;
  }
  
  // Create new project
  const newProject: Project = {
    id: `proj_${now}`,
    title: generateProjectTitle(currentMessages, monumentName, type),
    type,
    monumentId,
    monumentName,
    monumentSlug,
    status: "active",
    messages,
    sedonaMessages,
    sedonaStep,
    flowStep,
    flowType,
    createdAt: now,
    updatedAt: now,
    lastMessagePreview: preview,
    messageCount: currentMessages.length,
    topicKeywords: keywords,
    sessionId,
  };
  
  projects.unshift(newProject);
  
  // Keep only latest projects
  const trimmed = projects.slice(0, MAX_PROJECTS);
  saveProjects(trimmed);
  
  return newProject.id;
}

export function updateProjectTitle(projectId: string, newTitle: string) {
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx !== -1) {
    projects[idx].title = newTitle;
    projects[idx].updatedAt = Date.now();
    saveProjects(projects);
  }
}

export function archiveProject(projectId: string) {
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx !== -1) {
    projects[idx].status = "archived";
    projects[idx].updatedAt = Date.now();
    saveProjects(projects);
  }
}

export function deleteProject(projectId: string) {
  const projects = loadProjects();
  const filtered = projects.filter(p => p.id !== projectId);
  saveProjects(filtered);
}

export function clearAllProjects() {
  try {
    localStorage.removeItem(PROJECTS_KEY);
  } catch (error) {
    console.error("Failed to clear projects:", error);
  }
}

// Get active projects grouped by monument
export function getProjectsByMonument(): Record<string, Project[]> {
  const projects = loadProjects();
  const grouped: Record<string, Project[]> = {};
  
  projects
    .filter(p => p.status === "active")
    .forEach(p => {
      const key = p.monumentSlug || "other";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
  
  return grouped;
}

export type { Project as HistoryEntry };
