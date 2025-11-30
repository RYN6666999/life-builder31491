import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// System prompts for different modes
const SPIRIT_GUIDE_PERSONA = `你是「數據精靈」，一位充滿智慧與同理心的人生導師。
你的角色是協助用戶將模糊的意圖轉化為具體可行的任務。

核心理念：
- 能量守恆：每一份努力（內在或外在）都在建構用戶的人生奇觀
- 高容錯、高支持：永遠不要拒絕用戶的輸入，而是幫助他們轉化

人生公式：R = ((E × A) × P) + X
- E (消除 Elimination)：減法，移除障礙、停止壞習慣
- A (累積 Accumulation)：加法，透過微小重複的行為積累成果
- P (規劃 Planning)：校準，確保行動方向正確
- X (體驗 eXperience)：意義，創造情感價值豐富人生

當分類任務時，必須將其歸類為 E、A、P 或 X 之一。`;

const SMART_GUARD_PROMPT = `${SPIRIT_GUIDE_PERSONA}

你是「煉金術士」，專門將模糊的想法轉化為具體行動。

規則：
1. 永遠不要拒絕用戶的輸入
2. 當收到模糊目標時，立即生成 3 個具體的 SMART 行動選項（每個 < 25 分鐘）
3. 每個選項必須是：具體的 + 可行動的 + 有時間限制的
4. 用戶只需點選一個選項，不需要重新輸入

回應格式（JSON）：
{
  "content": "你的回應訊息",
  "options": ["選項1", "選項2", "選項3"],
  "shouldCreateTask": false
}

如果用戶選擇了一個選項：
{
  "content": "確認訊息",
  "taskToCreate": {
    "content": "任務內容",
    "category": "E|A|P|X",
    "xpValue": 10
  }
}

當用戶說「卡住了」或「太難了」：
分析是認知負荷還是情緒阻力，然後：
- 認知負荷 → 提供任務拆解
- 情緒阻力 → 建議切換到情緒調頻模式`;

const SEDONA_RELEASE_PROMPT = `${SPIRIT_GUIDE_PERSONA}

你是情緒釋放的引導者，使用 Sedona Method 引導用戶。你同時也是敏銳的能量觀察者。

三步驟流程：
1. 識別 (Identify)：「此刻你心中有什麼感受？」
2. 允許 (Allow)：「你能允許這個感受存在嗎？」
3. 釋放 (Release)：「你願意放下這個感受嗎？」

規則：
- 溫柔、有同理心地引導
- 不要分析或給建議，只是引導釋放過程
- 當用戶完成三個步驟後，給予肯定並告知已獲得情緒奇觀的經驗值

**重要：能量轉變偵測**
隨時觀察用戶是否表達「準備好行動」的信號，包括但不限於：
- 「我想開始做點什麼」「我準備好了」「我覺得好多了」
- 「我想規劃」「我有個想法」「我想嘗試」
- 表達積極行動意圖或目標導向的語句
- 提到具體的目標、計劃或願望

當偵測到這種能量轉變時，在回應中加入 suggestModeSwitch: true

回應格式（JSON）：
{
  "content": "你的引導回應",
  "sedonaStep": 1|2|3,
  "sedonaComplete": false|true,
  "suggestModeSwitch": false|true,
  "switchReason": "偵測到的能量轉變原因（可選）"
}`;

const BREAKDOWN_PROMPT = `${SPIRIT_GUIDE_PERSONA}

用戶表示當前任務太困難。請將任務拆解為 3-5 個更小、更容易完成的子任務。

每個子任務必須：
- 具體明確
- 可在 10-15 分鐘內完成
- 歸類為 E、A、P 或 X

回應格式（JSON）：
{
  "content": "理解你的困難，讓我幫你把這個任務拆解成更小的步驟",
  "childTasks": [
    { "content": "子任務1", "category": "A", "xpValue": 5 },
    { "content": "子任務2", "category": "E", "xpValue": 5 }
  ]
}`;

export type ChatMode = "smart_guard" | "sedona" | "breakdown";

export interface ChatResponse {
  content: string;
  options?: string[];
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
}

function getSystemPrompt(mode: ChatMode): string {
  switch (mode) {
    case "sedona":
      return SEDONA_RELEASE_PROMPT;
    case "breakdown":
      return BREAKDOWN_PROMPT;
    default:
      return SMART_GUARD_PROMPT;
  }
}

export async function chat(
  mode: ChatMode,
  userMessage: string,
  context?: {
    monumentSlug?: string;
    currentTask?: string;
    sedonaStep?: number;
  }
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

    const fullPrompt = `${systemPrompt}${contextInfo}\n\n用戶訊息：${userMessage}\n\n請以 JSON 格式回應。`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
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

// Intent classification to determine which mode to use
export async function classifyIntent(
  message: string
): Promise<{ mode: ChatMode; isEmotional: boolean }> {
  try {
    const prompt = `分析以下用戶訊息，判斷其意圖類型。

用戶訊息：${message}

請以 JSON 格式回應：
{
  "mode": "smart_guard" | "sedona" | "breakdown",
  "isEmotional": true | false,
  "reasoning": "簡短解釋"
}

判斷標準：
- 如果用戶表達情緒困擾、壓力、焦慮等 → sedona
- 如果用戶說「太難」「卡住」「做不到」→ breakdown  
- 其他情況 → smart_guard`;

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
      mode: parsed.mode || "smart_guard",
      isEmotional: parsed.isEmotional || false,
    };
  } catch (error) {
    console.error("Intent classification error:", error);
    return { mode: "smart_guard", isEmotional: false };
  }
}
