// Knowledge Base: 170 High-Level Life Goals
// Used for RAG when user provides vague input

export interface Goal {
  id: string;
  category: string;
  subcategory: string;
  goals: string[];
}

export interface MonumentGoals {
  monumentSlug: string;
  monumentName: string;
  categories: Goal[];
}

export const MONUMENT_GOALS: MonumentGoals[] = [
  {
    monumentSlug: "career",
    monumentName: "事業與知識成就",
    categories: [
      {
        id: "professional",
        category: "專業精進",
        subcategory: "Achievement & Mastery",
        goals: [
          "掌握頂尖專業技能",
          "撰寫具權威性文獻",
          "跨領域整合創新",
          "成功傳授專業知識",
        ],
      },
      {
        id: "leadership",
        category: "領導與影響力",
        subcategory: "Leadership",
        goals: [
          "成功領導宏大目標",
          "建立高效協作系統",
          "成為社群公認領袖",
          "推動流程或政策變革",
        ],
      },
      {
        id: "innovation",
        category: "創造與創新",
        subcategory: "Innovation",
        goals: [
          "完成獨創性作品",
          "開發解決實際問題的工具",
          "獲得智慧財產權",
          "實現自動運行的價值創造系統",
        ],
      },
      {
        id: "learning",
        category: "人生學習",
        subcategory: "Lifelong Learning",
        goals: [
          "掌握一門流暢外語",
          "熟練掌握一種樂器",
          "系統性閱讀經典",
          "養成終生學習熱情",
        ],
      },
    ],
  },
  {
    monumentSlug: "wealth",
    monumentName: "財富與安全狀態",
    categories: [
      {
        id: "security",
        category: "財務安全",
        subcategory: "Financial Security",
        goals: [
          "建立緊急基金",
          "償清高利息債務",
          "達成穩健退休資產規模",
          "獲得全面保險保障",
          "擁有穩定居住空間",
        ],
      },
      {
        id: "freedom",
        category: "財務自由",
        subcategory: "Financial Freedom",
        goals: [
          "建立被動收入資產組合",
          "達成被動收入覆蓋所有開支",
          "擁有憑興趣選擇工作的經濟能力",
          "掌握理性投資決策能力",
        ],
      },
      {
        id: "spending",
        category: "消費與給予",
        subcategory: "Spending & Giving",
        goals: [
          "有能力負擔個人成長體驗",
          "定期支持慈善事業",
          "為親近的人提供物質支持",
          "掌握有意識的消費習慣",
        ],
      },
      {
        id: "legacy",
        category: "傳承規劃",
        subcategory: "Legacy Planning",
        goals: [
          "建立清晰遺產規劃",
          "為下一代提供教育/事業經濟基礎",
          "達成對金錢的心理平靜",
          "避免所有形式的經濟依賴",
        ],
      },
    ],
  },
  {
    monumentSlug: "emotion",
    monumentName: "情感與心靈福祉",
    categories: [
      {
        id: "peace",
        category: "內在平靜",
        subcategory: "Inner Peace",
        goals: [
          "養成靜心習慣",
          "具備快速平復負面情緒的能力",
          "消除慢性焦慮",
          "培養無論外部環境如何都能找到平靜的信念",
        ],
      },
      {
        id: "acceptance",
        category: "自我接納",
        subcategory: "Self-Acceptance",
        goals: [
          "達成對自我的無條件接納",
          "清晰自信地表達需求和界限",
          "擺脫對外部讚美的過度依賴",
          "成功治癒過去的心理創傷",
        ],
      },
      {
        id: "meaning",
        category: "意義與價值",
        subcategory: "Meaning & Purpose",
        goals: [
          "建立堅定的核心價值觀體系",
          "找到超越自我的貢獻使命",
          "獲得與宇宙連結的深刻體驗",
          "在每天的生活中找到感恩",
        ],
      },
      {
        id: "social",
        category: "社交能力",
        subcategory: "Social Skills",
        goals: [
          "掌握高效非暴力溝通技巧",
          "在任何社交場合自信表達",
          "成功斷開具毒性或耗能的關係",
          "與摯友建立支持網絡",
        ],
      },
    ],
  },
  {
    monumentSlug: "family",
    monumentName: "家庭與人際連結",
    categories: [
      {
        id: "intimate",
        category: "親密關係",
        subcategory: "Intimate Relationships",
        goals: [
          "建立基於尊重信任的長期關係",
          "掌握增進親密的衝突解決技巧",
          "每年創造難忘的共同體驗",
          "共同建立反映彼此價值觀的家庭系統",
        ],
      },
      {
        id: "family-relations",
        category: "家庭關係",
        subcategory: "Family Relations",
        goals: [
          "與原生家庭達成和解",
          "成為家庭中可靠的愛與支持支柱",
          "確保溝通管道永遠開放且安全",
          "營造充滿安全感、無懼表達的家庭環境",
        ],
      },
      {
        id: "parenting",
        category: "親子關係",
        subcategory: "Parenting",
        goals: [
          "成為給予無條件愛與正確引導的父母",
          "與下一代在成年後保持朋友般的深度關係",
          "培養下一代獨立思考能力",
          "避免複製童年的負面模式",
        ],
      },
      {
        id: "community",
        category: "社群連結",
        subcategory: "Community Connection",
        goals: [
          "成為社區或團體中積極有貢獻的一份子",
          "參與有意義的志願服務項目",
          "在重要時刻為親友提供實質或情感支持",
        ],
      },
    ],
  },
  {
    monumentSlug: "health",
    monumentName: "健康與活力狀態",
    categories: [
      {
        id: "vitality",
        category: "身體活力",
        subcategory: "Physical Vitality",
        goals: [
          "維持健康的 BMI",
          "達成能維持日常所需功能的體能水準",
          "實現每年無重大慢性疾病的健康狀態",
          "確保所有體檢指標在理想範圍內",
        ],
      },
      {
        id: "habits",
        category: "生活習慣",
        subcategory: "Healthy Habits",
        goals: [
          "養成規律高品質的睡眠習慣",
          "建立符合營養學原則的健康飲食模式",
          "成功戒斷對身體有顯著傷害的成癮",
          "養成每日身體活動習慣",
        ],
      },
      {
        id: "resilience",
        category: "心理韌性",
        subcategory: "Mental Resilience",
        goals: [
          "具備面對重大挫折時快速反彈的能力",
          "在壓力情境下保持專注理性決策",
          "消除因老化或死亡帶來的恐懼",
          "維持對未來積極樂觀期望的心態",
        ],
      },
      {
        id: "longevity",
        category: "長壽與自理",
        subcategory: "Longevity",
        goals: [
          "在晚年保持完全的自理能力",
          "擁有清晰的認知功能",
          "實現長壽且有品質的生命狀態",
          "保持身體的彈性和平衡感",
        ],
      },
    ],
  },
  {
    monumentSlug: "experience",
    monumentName: "體驗與貢獻",
    categories: [
      {
        id: "sensory",
        category: "感官探索",
        subcategory: "Sensory Exploration",
        goals: [
          "體驗世界所有主要的自然奇觀",
          "探索極限環境的感受",
          "品嘗世界上所有主要菜系的代表性美食",
          "觀賞人類文明中最偉大的藝術或建築",
        ],
      },
      {
        id: "challenge",
        category: "挑戰極限",
        subcategory: "Pushing Limits",
        goals: [
          "成功挑戰需要極度體能或耐力的目標",
          "體驗一次完全的文化沉浸",
          "成功經歷一次野外生存的考驗",
          "克服一項嚴重的個人恐懼症",
        ],
      },
      {
        id: "altruism",
        category: "利他與服務",
        subcategory: "Altruism & Service",
        goals: [
          "影響並幫助一個陌生人的生命軌跡",
          "參與一次人道主義救援行動",
          "建立一個能長期服務特定弱勢群體的系統",
          "成功為世界留下一個長期運作的正面遺產",
        ],
      },
      {
        id: "metacognition",
        category: "元認知與哲學",
        subcategory: "Metacognition",
        goals: [
          "建立記錄和反思自我成長的終生習慣",
          "能夠清晰地闡述自己對宇宙和生命的終極看法",
          "達成「知行合一」的狀態",
          "掌握在任何處境下保持客觀觀察的能力",
        ],
      },
    ],
  },
];

// Task Category Definitions (E/A/P/X)
export interface TaskCategory {
  code: "E" | "A" | "P" | "X";
  name: string;
  nameCn: string;
  essence: string;
  driver: string;
  icon: string;
}

export const TASK_CATEGORIES: TaskCategory[] = [
  {
    code: "E",
    name: "Elimination",
    nameCn: "消除性任務",
    essence: "減法。移除障礙、停止壞習慣、解決歷史遺留問題",
    driver: "逃離痛苦、降低摩擦力",
    icon: "⚡️",
  },
  {
    code: "A",
    name: "Accumulation",
    nameCn: "累積性任務",
    essence: "加法。透過微小、重複的行為來積累成果",
    driver: "追求成長、利用複利效應",
    icon: "🌱",
  },
  {
    code: "P",
    name: "Planning",
    nameCn: "規劃性任務",
    essence: "校準。透過思考、評估、追蹤數據來確保行動的方向正確",
    driver: "確保準確性、避免浪費精力",
    icon: "🧭",
  },
  {
    code: "X",
    name: "eXperience",
    nameCn: "體驗性任務",
    essence: "意義。透過獲得新的經歷或創造情感價值來豐富人生",
    driver: "最大化幸福感、追求人生意義",
    icon: "🎉",
  },
];

// The Life Formula
export const LIFE_FORMULA = {
  formula: "R = ((E × A) × P) + X",
  description: "迭代目標循環 (Iterative Goal Cycle)",
  components: {
    R: { name: "Result", nameCn: "結果", meaning: "最終實現的人生目標" },
    E: { name: "Elimination", nameCn: "消除", meaning: "處理障礙和內耗" },
    A: { name: "Accumulation", nameCn: "累積", meaning: "持續的正面投入" },
    P: { name: "Planning", nameCn: "規劃與校準", meaning: "確保 E 和 A 的執行效率和正確性" },
    X: { name: "eXperience", nameCn: "體驗", meaning: "獨立的、創造意義的活動" },
  },
  operators: {
    multiply: "E, A, P 之間相互強化，缺一不可（低效的 E 或 P 會使整個積累效率趨近於零）",
    add: "X 是一種獨立的價值，用以維持動力和內在幸福感",
  },
};

// Helper function to get goals for a specific monument
export function getGoalsForMonument(monumentSlug: string): Goal[] {
  const monument = MONUMENT_GOALS.find((m) => m.monumentSlug === monumentSlug);
  return monument?.categories || [];
}

// Helper function to get random suggestions for a monument
export function getRandomSuggestions(monumentSlug: string, count: number = 3): string[] {
  const goals = getGoalsForMonument(monumentSlug);
  const allGoals = goals.flatMap((g) => g.goals);
  const shuffled = allGoals.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
