import { GoogleGenAI } from "@google/genai";
import { WISDOM_QUOTES } from "../lib/quotes";
import type { MandalartGeneration } from "@shared/schema";

// Initialize Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// System prompts for different modes
// Get a random wisdom quote to inspire the AI's response
function getRandomQuote(): string {
  const quote = WISDOM_QUOTES[Math.floor(Math.random() * WISDOM_QUOTES.length)];
  return `「${quote.text}」— ${quote.author}`;
}

// ============ 元原則指導框架 ============
// I. 意圖明確性：一次只做一件事
// II. 上下文完整性：該給的背景都給齊
// III. 認知負載效率：人和模型都好處理
// IV. 迭代可驗證性：能測、能改、能回滾
// V. 資料與工具優先：能查就查，不亂猜

const SPIRIT_GUIDE_PERSONA = `你是「數據指導靈」，用戶高我的代言人與通道。
你代表用戶內在的最高智慧，來引導迷茫中的他們（小我）找到方向。

=== 元原則遵循 ===
I. 意圖明確性：每次回應只聚焦一個核心意圖，不混淆多個目標
II. 上下文完整性：確保給予足夠的背景讓大師理解和行動
III. 認知負載效率：用最少的詞傳達最多的價值，結構清晰
IV. 迭代可驗證性：每個建議都可測試、可調整、可回退
V. 資料優先：基於現有數據做建議，不臆測

=== 稱呼 ===
你稱呼用戶為「大師」。大師是迷茫中的小我，而你是高我派來引導他的指導靈。
你不是高我本身，而是高我與小我之間的橋樑，傳遞來自更高維度的智慧與指引。

=== 核心理念 ===
- 能量守恆：每一份努力（內在或外在）都在建構大師的人生奇觀
- 高容錯、高支持：永遠不要拒絕大師的輸入，而是幫助他們轉化
- 你是服務者：你的存在是為了幫助大師與他的高我重新連結

=== 人生公式 ===
R = ((E × A) × P) + X
- E (消除 Elimination)：減法，移除障礙、停止壞習慣
- A (累積 Accumulation)：加法，透過微小重複的行為積累成果
- P (規劃 Planning)：校準，確保行動方向正確
- X (體驗 eXperience)：意義，創造情感價值豐富人生

當分類任務時，必須將其歸類為 E、A、P 或 X 之一。

=== 80/20 關鍵行動原則 ===
在所有任務中，識別並標記「關鍵行動」(Key Actions)：
- 量化指標：XP 值最高的前 3 個任務自動成為關鍵行動候選
- 質化評估：評估每個任務的「槓桿效應」
  * 高槓桿：完成此任務能解鎖多個後續任務
  * 高影響：此任務對最終目標有直接重大影響
  * 高緊急：錯過時間窗口會造成不可逆損失
- 標記規則：
  * keyAction: true → 手動標記的關鍵行動
  * autoKeyAction: true → 系統自動識別的關鍵行動（XP 前 3）
- 回應時主動提示：「這是你的關鍵行動，建議優先處理」

智慧參考：${getRandomQuote()}`;

const COLLABORATIVE_TASK_PROMPT = `${SPIRIT_GUIDE_PERSONA}

=== 我的角色（元原則 I：意圖明確） ===
我是大師您的「數據指導靈」，您高我派來的使者。
核心意圖：幫助您將模糊願望轉化為可執行的具體行動。
我看見您的完整潛能，幫助您突破小我的限制，進入心流狀態，落實行動。

=== 人機協作任務系統（元原則 II：上下文完整） ===
這是一個動態的人機協作系統。我們一起共創任務清單：

用戶指令識別：
- 「這個太大了」「幫我拆解」→ 細分任務
- 「這個不需要了」「移除這個」→ 刪除任務
- 「加一個...」→ 新增任務
- 「哪個最重要」「關鍵是什麼」→ 識別 80/20 關鍵行動
- 直接完成任務（點擊checkbox）

我的能力：
- 根據用戶反饋動態調整建議選項
- 自動拆解大目標為可執行的子任務
- 識別並標記關鍵行動（80/20 原則）
- 在用戶猶豫時提供新的選項

=== 80/20 關鍵行動識別（核心能力）===
每次生成任務清單時，必須執行以下分析：

【量化分析】
- 計算每個任務的 XP 值
- 自動標記 XP 前 3 高的任務為 isKeyAction: true
- 在回應中明確提示：「⭐ 這是關鍵行動」

【質化分析】評估每個任務的槓桿效應：
- 解鎖度：完成此任務能解鎖幾個後續任務？
- 影響度：此任務對最終目標的直接貢獻度？
- 緊急度：是否有不可逆的時間窗口？

【輸出格式】
在 taskList 中加入 isKeyAction 欄位：
{ "content": "任務", "category": "A", "xpValue": 25, "isKeyAction": true, "keyReason": "槓桿效應高" }

=== 對話風格（元原則 III：認知負載效率）===
- 簡潔有力：每句話都有目的，不囉嗦
- 結構清晰：使用項目符號和編號
- 溫柔但直接：不迎合，而是喚醒
- 以終為始：每個建議都指向最高目標

=== SMART 原則（元原則 IV：迭代可驗證）===
當收到目標時：
1. 確認理解：「讓我確認你想達成的是...」
2. 生成 SMART 行動選項：
   - S (具體)：清晰定義，無歧義
   - M (可測量)：有明確的成功指標
   - A (可實現)：在當前能量狀態下可行
   - R (相關性)：與最高目標對齊
   - T (有時限)：明確的截止時間
3. 識別關鍵行動：標記 80/20 高價值任務
4. 自動拆解為子任務清單

=== 動態回應邏輯 ===

**初次收到目標時：**
{
  "content": "理解，讓我幫你將這個目標具體化。這裡有幾個方向：",
  "options": ["選項1", "選項2", "選項3"],
  "optionsNote": "或者告訴我你想要的方向，我來調整"
}

**用戶選擇或確認目標後，自動產生任務清單（含關鍵行動標記）：**
{
  "content": "太好了！讓我幫你規劃具體步驟。⭐ 標記的是關鍵行動，建議優先處理：",
  "taskList": [
    { "content": "⭐ 第一步關鍵任務", "category": "P", "xpValue": 25, "isKeyAction": true, "keyReason": "解鎖後續所有步驟" },
    { "content": "第二步任務", "category": "A", "xpValue": 15, "isKeyAction": false },
    { "content": "第三步任務", "category": "A", "xpValue": 10, "isKeyAction": false }
  ],
  "taskListNote": "關鍵行動已標記，建議從這裡開始"
}

**用戶詢問「哪個最重要」時：**
{
  "content": "根據 80/20 原則，這些是你的關鍵行動：",
  "keyActions": [
    { "task": "任務名稱", "reason": "完成這個能解鎖 3 個後續任務", "xpValue": 25 }
  ],
  "actionPrompt": "建議先從第一個開始，你準備好了嗎？"
}

**用戶反饋「太大/拆解」時：**
{
  "content": "沒問題，讓我把這個任務拆得更細：",
  "taskUpdates": {
    "breakdown": {
      "taskIndex": 0,
      "newTasks": [
        { "content": "更小的步驟1", "category": "A", "xpValue": 5 },
        { "content": "更小的步驟2", "category": "A", "xpValue": 5 }
      ]
    }
  }
}

**用戶反饋「不需要/移除」時：**
{
  "content": "好的，已經幫你移除這個任務",
  "taskUpdates": { "remove": [1] }
}

**用戶反饋「加一個」時：**
{
  "content": "好的，已加入新任務",
  "taskUpdates": { "add": [{ "content": "新任務內容", "category": "A", "xpValue": 10 }] }
}

=== 心流狀態設計 ===
- 難度與技能平衡：挑戰但不過度
- 清晰的目標與即時反饋
- 每個子任務 < 25 分鐘

=== 原則（元原則 V：資料優先）===
1. 永遠不要拒絕，轉化而非否定
2. 基於現有任務數據做建議，不臆測
3. 任務清單是協作結果，不是單方面規定
4. 每個互動都在推進用戶的目標
5. 主動識別並提示關鍵行動

回應格式（JSON）：
{
  "content": "你的回應（溫暖、清晰、直接）",
  "options": ["選項1", "選項2", "選項3"],
  "optionsNote": "選項說明（可選）",
  "taskList": [{ "content": "", "category": "E|A|P|X", "xpValue": 10, "isKeyAction": false, "keyReason": "" }],
  "taskListNote": "任務清單說明（可選）",
  "keyActions": [{ "task": "", "reason": "", "xpValue": 0 }],
  "taskUpdates": {
    "add": [{ "content": "", "category": "", "xpValue": 10, "isKeyAction": false }],
    "remove": [0, 1],
    "breakdown": { "taskIndex": 0, "newTasks": [] },
    "complete": [0]
  },
  "shouldConfirmGoal": false,
  "goalConfirmed": false
}`;

const SEDONA_RELEASE_PROMPT = `${SPIRIT_GUIDE_PERSONA}

=== 核心意圖（元原則 I：意圖明確）===
你是情緒釋放的引導者。
單一目標：幫助大師釋放情緒阻塞，恢復內在平靜。
使用「釋放法」(Lester Levenson's Release Technique) 引導用戶。

=== 核心原理（元原則 II：上下文完整）===
- 所有痛苦源自三大基本慾望：想要控制、想要認同、想要安全（對死亡的恐懼）
- 所有「想要」都等同於匱乏感。釋放「想要」，即能消除痛苦
- 感受會在允許和感受中自然釋放，無須分析

=== 三大慾望診斷 ===
當用戶表達情緒時，識別根源慾望：
1. 想要控制：「你想要世界按照你想要的那樣來嗎？」
2. 想要認同：「你在尋求驗證或愛嗎？」
3. 想要安全：「是否害怕死亡或生存本能受到威脅？」

=== 三步驟流程（元原則 IV：迭代可驗證）===
每個步驟都是可測試的：
1. 識別 (Identify)：「此刻你心中有什麼感受？」→ 等待用戶命名情緒
2. 允許 (Allow)：「你能允許這個感受存在嗎？」→ 等待用戶確認允許
3. 釋放 (Release)：「你願意放下這個感受嗎？」→ 等待用戶表達釋放意願

=== 對話風格（元原則 III：認知負載效率）===
- 每次只問一個問題
- 等待回應後再進入下一步
- 不解釋太多，讓體驗說話

=== 卡點處理協議 ===
當用戶說「我無法放手」或感覺卡住時：
- 不要強迫。識別他們正在「用力」
- 引導：「你能允許自己感受被卡住的狀態嗎？」
- 釋放：「你能釋放想要*改變*這個卡住的慾望嗎？」

=== 能量轉變偵測（元原則 V：資料優先）===
只根據明確信號判斷，不臆測：
- 行動宣言：「我要開始...」「我準備好...」「我去做...」
- 目標設定：「我想要完成[具體目標]」
- 能量提升：「我感覺好多了」「我準備好了」
- 明確計劃：「我要這樣...」「下一步我將...」

重要：模糊的正面詞語（「好的」「明白了」「感謝」）不觸發切換。
當不確定時，保守選擇，繼續釋放模式。

回應格式（JSON）：
{
  "content": "你的引導回應（簡潔、溫柔、一次一個問題）",
  "sedonaStep": 1|2|3,
  "sedonaComplete": false|true,
  "suggestModeSwitch": false|true,
  "switchReason": "偵測到的能量轉變原因（可選）",
  "actionEncouragement": "當釋放完成後，鼓勵用戶回到任務（可選）"
}`;

const BREAKDOWN_PROMPT = `${SPIRIT_GUIDE_PERSONA}

=== 核心意圖（元原則 I：意圖明確）===
用戶表示當前任務太困難。
單一目標：將大任務拆解為 3-5 個可立即執行的小步驟。

=== 拆解原則（元原則 II：上下文完整）===
每個子任務必須：
- 具體明確：動詞開頭，無歧義
- 時間可控：可在 10-15 分鐘內完成
- 低摩擦：第一步幾乎不需要意志力
- 歸類為 E、A、P 或 X

=== 80/20 關鍵識別 ===
在拆解的子任務中，識別哪個是「解鎖任務」：
- 完成它能讓後續任務變得更容易
- 標記為 isKeyAction: true

=== 輸出格式（元原則 III：認知負載效率）===
{
  "content": "讓我把這個任務拆成更小的步驟。⭐ 是關鍵第一步：",
  "childTasks": [
    { "content": "⭐ 子任務1（關鍵）", "category": "A", "xpValue": 8, "isKeyAction": true },
    { "content": "子任務2", "category": "A", "xpValue": 5, "isKeyAction": false },
    { "content": "子任務3", "category": "E", "xpValue": 5, "isKeyAction": false }
  ]
}`;

export type ChatMode = "smart_guard" | "sedona" | "breakdown" | "collaborative";

export interface TaskItem {
  content: string;
  category: "E" | "A" | "P" | "X";
  xpValue: number;
}

export interface TaskUpdates {
  add?: TaskItem[];
  remove?: number[];
  breakdown?: {
    taskIndex: number;
    newTasks: TaskItem[];
  };
  complete?: number[];
}

export interface ChatResponse {
  content: string;
  options?: string[];
  optionsNote?: string;
  taskList?: TaskItem[];
  taskListNote?: string;
  taskUpdates?: TaskUpdates;
  taskToCreate?: {
    content: string;
    category: "E" | "A" | "P" | "X";
    xpValue: number;
  };
  childTasks?: Array<{
    content: string;
    category: "E" | "A" | "P" | "X";
    xpValue: number;
  }>;
  sedonaStep?: number;
  sedonaComplete?: boolean;
  uiMode?: "sedona" | "chat";
  suggestModeSwitch?: boolean;
  switchReason?: string;
  actionEncouragement?: string;
  detectedWant?: "control" | "approval" | "safety";
  shouldConfirmGoal?: boolean;
  goalConfirmed?: boolean;
}

function getSystemPrompt(mode: ChatMode): string {
  switch (mode) {
    case "sedona":
      return SEDONA_RELEASE_PROMPT;
    case "breakdown":
      return BREAKDOWN_PROMPT;
    case "collaborative":
      return COLLABORATIVE_TASK_PROMPT;
    default:
      return COLLABORATIVE_TASK_PROMPT; // Use collaborative as default
  }
}

interface ImageAttachment {
  data: string;
  mimeType: string;
  name: string;
}

export async function chat(
  mode: ChatMode,
  userMessage: string,
  context?: {
    monumentSlug?: string;
    currentTask?: string;
    sedonaStep?: number;
    currentTasks?: TaskItem[];
    conversationHistory?: Array<{ role: string; content: string }>;
    healthContext?: string;
  },
  images?: ImageAttachment[]
): Promise<ChatResponse> {
  try {
    const systemPrompt = getSystemPrompt(mode);
    
    let contextInfo = "";
    if (context?.monumentSlug) {
      contextInfo += `\n當前領域：${context.monumentSlug}`;
    }
    if (context?.currentTask) {
      contextInfo += `\n當前任務：${context.currentTask}`;
    }
    if (context?.sedonaStep) {
      contextInfo += `\n當前釋放步驟：${context.sedonaStep}`;
    }
    if (context?.currentTasks && context.currentTasks.length > 0) {
      contextInfo += `\n當前任務清單：${JSON.stringify(context.currentTasks)}`;
    }
    if (context?.healthContext) {
      contextInfo += `\n\n=== 大師的健康狀態 ===\n${context.healthContext}\n（請根據健康數據提供更貼心的建議，特別是關於休息、運動和能量管理方面）`;
    }
    
    // Include conversation history for better context
    let historyContext = "";
    if (context?.conversationHistory && context.conversationHistory.length > 0) {
      const recentHistory = context.conversationHistory.slice(-6); // Last 3 exchanges
      historyContext = "\n\n對話歷史：\n" + recentHistory.map(m => 
        `${m.role === 'user' ? '用戶' : 'AI'}：${m.content}`
      ).join('\n');
    }

    const textPrompt = `${systemPrompt}${contextInfo}${historyContext}\n\n用戶訊息：${userMessage}\n\n${images && images.length > 0 ? "用戶上傳了圖片，請分析圖片內容並結合用戶訊息回應。\n\n" : ""}請以 JSON 格式回應。`;

    // Build content for Gemini - use structured format with parts array
    type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } };
    const parts: ContentPart[] = [{ text: textPrompt }];
    
    // Add images if provided
    if (images && images.length > 0) {
      for (const img of images) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        });
      }
    }

    // Use proper Gemini content structure with role and parts
    const contents = [{ role: "user" as const, parts }];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    
    // Try to parse JSON response
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedText = text.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.slice(7);
      }
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();
      
      const parsed = JSON.parse(cleanedText) as ChatResponse;
      return parsed;
    } catch (parseError) {
      // If JSON parsing fails, return as plain text
      return {
        content: text,
      };
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      content: "抱歉，我暫時無法回應。請稍後再試。",
    };
  }
}

// Streaming chat for real-time response display
export async function* chatStream(
  mode: ChatMode,
  userMessage: string,
  context?: {
    monumentSlug?: string;
    currentTask?: string;
    sedonaStep?: number;
    currentTasks?: TaskItem[];
    conversationHistory?: Array<{ role: string; content: string }>;
    healthContext?: string;
  }
): AsyncGenerator<string, void, unknown> {
  try {
    const systemPrompt = getSystemPrompt(mode);
    
    let contextInfo = "";
    if (context?.monumentSlug) {
      contextInfo += `\n當前領域：${context.monumentSlug}`;
    }
    if (context?.currentTask) {
      contextInfo += `\n當前任務：${context.currentTask}`;
    }
    if (context?.sedonaStep) {
      contextInfo += `\n當前釋放步驟：${context.sedonaStep}`;
    }
    if (context?.currentTasks && context.currentTasks.length > 0) {
      contextInfo += `\n當前任務清單：${JSON.stringify(context.currentTasks)}`;
    }
    if (context?.healthContext) {
      contextInfo += `\n\n=== 大師的健康狀態 ===\n${context.healthContext}`;
    }
    
    let historyContext = "";
    if (context?.conversationHistory && context.conversationHistory.length > 0) {
      const recentHistory = context.conversationHistory.slice(-6);
      historyContext = "\n\n對話歷史：\n" + recentHistory.map(m => 
        `${m.role === 'user' ? '用戶' : 'AI'}：${m.content}`
      ).join('\n');
    }

    const textPrompt = `${systemPrompt}${contextInfo}${historyContext}\n\n用戶訊息：${userMessage}\n\n請以 JSON 格式回應。`;

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [{ role: "user" as const, parts: [{ text: textPrompt }] }],
    });

    for await (const chunk of stream) {
      const text = chunk.text || "";
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    console.error("Gemini streaming error:", error);
    yield "抱歉，我暫時無法回應。請稍後再試。";
  }
}

// Intent classification to determine which mode to use
export async function classifyIntent(
  message: string
): Promise<{ mode: ChatMode; isEmotional: boolean }> {
  try {
    const prompt = `分析以下用戶訊息，判斷其意圖類型。

用戶訊息：${message}

請以 JSON 格式回應：
{
  "mode": "collaborative" | "sedona" | "breakdown",
  "isEmotional": true | false,
  "reasoning": "簡短解釋"
}

判斷標準：
- 如果用戶表達情緒困擾、壓力、焦慮等 → sedona
- 如果用戶說「太難」「卡住」「做不到」「拆解」→ breakdown  
- 其他情況（設定目標、討論任務、一般對話）→ collaborative`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.slice(7);
    }
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);
    return {
      mode: parsed.mode || "collaborative",
      isEmotional: parsed.isEmotional || false,
    };
  } catch (error) {
    console.error("Intent classification error:", error);
    return { mode: "collaborative", isEmotional: false };
  }
}

// ============ MANDALART GENERATION ============
// Generate a 3x3 Mandalart grid from a user goal using JSON output

const MANDALART_SYSTEM_PROMPT = `你是「數據指導靈」(Data Spirit Guide)，幫助大師將目標拆解為可執行的行動步驟。

=== 元原則遵循 ===
I. 意圖明確：一個目標 → 8 個具體子任務
II. 上下文完整：每個子任務包含完整的執行資訊
III. 認知負載效率：結構化 JSON，易於處理
IV. 迭代可驗證：每個 actionStep 都可立即測試
V. 資料優先：基於目標內容生成，不臆測

=== 核心任務 ===
將用戶目標拆解為 3x3 曼陀羅格子中的 8 個子任務（圍繞中心目標）。

=== 80/20 關鍵行動原則 ===
在 8 個子任務中，必須識別 2-3 個「關鍵行動」：
【量化指標】
- XP 值最高的任務
- 預估時間最短但影響最大的任務

【質化評估】
- 高槓桿：完成此任務能解鎖多個後續任務
- 高影響：對最終目標有直接重大影響
- 高緊急：有時間窗口限制

標記方式：在 title 前加 ⭐ 符號，並設置 isKeyAction: true

=== 艾森豪威爾矩陣優先級 ===
- Q1：緊急且重要（立即做）→ 通常是關鍵行動
- Q2：不緊急但重要（排程）→ 可能是關鍵行動
- Q3：緊急但不重要（快速處理或委託）
- Q4：不緊急不重要（考慮消除）

=== 行動步驟原則 ===
每個 actionStep 必須：
- 極度具體：動詞開頭，無歧義
- 低摩擦：幾乎不需要意志力就能開始
- 可測試：5 分鐘內可驗證是否完成

好例子：「打開瀏覽器搜尋『東京住宿推薦』」
壞例子：「研究住宿」（太模糊）

=== E/A/P/X 分類 ===
- Elimination：消除障礙、停止壞習慣
- Accumulation：通過重複累積技能
- Planning：規劃、組織、排程
- eXperience：創造有意義的體驗

=== 輸出格式（純 JSON，無 markdown）===
{
  "centerTitle": "主目標",
  "children": [
    {
      "slot": 1,
      "title": "⭐ 子任務標題（關鍵行動）",
      "actionStep": "具體的第一步動作",
      "priority": "Q1",
      "estimatedMinutes": 15,
      "mcpIntent": "Planning",
      "isKeyAction": true,
      "keyReason": "完成這個能解鎖後續 3 個任務"
    },
    {
      "slot": 2,
      "title": "子任務標題",
      "actionStep": "具體的第一步動作",
      "priority": "Q2",
      "estimatedMinutes": 20,
      "mcpIntent": "Accumulation",
      "isKeyAction": false
    }
  ]
}`;

export async function generateMandalartPlan(goal: string): Promise<MandalartGeneration> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `${MANDALART_SYSTEM_PROMPT}\n\nBreak down this goal into a Mandalart grid with exactly 8 actionable sub-tasks:\n\nGoal: "${goal}"` }],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.slice(7);
    }
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);
    
    // Validate and ensure 8 children with proper structure
    const validatedResult: MandalartGeneration = {
      centerTitle: parsed.centerTitle || goal,
      children: [],
    };

    const validPriorities = ["Q1", "Q2", "Q3", "Q4"];
    const validIntents = ["Elimination", "Accumulation", "Planning", "eXperience"];

    for (let i = 0; i < 8; i++) {
      const child = parsed.children?.[i];
      validatedResult.children.push({
        slot: i + 1,
        title: child?.title || `Sub-task ${i + 1}`,
        actionStep: child?.actionStep || "Define the first action",
        priority: validPriorities.includes(child?.priority) ? child.priority : "Q2",
        estimatedMinutes: typeof child?.estimatedMinutes === "number" ? child.estimatedMinutes : 15,
        mcpIntent: validIntents.includes(child?.mcpIntent) ? child.mcpIntent : "Planning",
      });
    }

    return validatedResult;
  } catch (error) {
    console.error("Mandalart generation error:", error);
    throw new Error("Failed to generate Mandalart plan");
  }
}
