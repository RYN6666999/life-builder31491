import { parseString } from "xml2js";
import { promisify } from "util";
import type { InsertHealthData } from "@shared/schema";

const parseXml = promisify(parseString);

interface AppleHealthRecord {
  $: {
    type: string;
    sourceName?: string;
    sourceVersion?: string;
    device?: string;
    unit?: string;
    creationDate?: string;
    startDate: string;
    endDate?: string;
    value?: string;
  };
}

interface AppleHealthExport {
  HealthData: {
    Record?: AppleHealthRecord[];
    Workout?: any[];
    ActivitySummary?: any[];
  };
}

const HEALTH_TYPE_MAP: Record<string, { type: string; unit: string }> = {
  "HKQuantityTypeIdentifierStepCount": { type: "steps", unit: "count" },
  "HKQuantityTypeIdentifierHeartRate": { type: "heart_rate", unit: "count/min" },
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN": { type: "heart_rate_variability", unit: "ms" },
  "HKQuantityTypeIdentifierRestingHeartRate": { type: "resting_heart_rate", unit: "count/min" },
  "HKCategoryTypeIdentifierSleepAnalysis": { type: "sleep", unit: "min" },
  "HKQuantityTypeIdentifierActiveEnergyBurned": { type: "active_energy", unit: "kcal" },
  "HKQuantityTypeIdentifierAppleExerciseTime": { type: "exercise_minutes", unit: "min" },
  "HKQuantityTypeIdentifierAppleStandTime": { type: "stand_hours", unit: "hr" },
  "HKQuantityTypeIdentifierDistanceWalkingRunning": { type: "walking_distance", unit: "km" },
  "HKQuantityTypeIdentifierFlightsClimbed": { type: "flights_climbed", unit: "count" },
  "HKCategoryTypeIdentifierMindfulSession": { type: "mindful_minutes", unit: "min" },
  "HKQuantityTypeIdentifierRespiratoryRate": { type: "respiratory_rate", unit: "count/min" },
  "HKQuantityTypeIdentifierOxygenSaturation": { type: "blood_oxygen", unit: "%" },
  "HKQuantityTypeIdentifierBodyTemperature": { type: "body_temperature", unit: "degC" },
};

export interface ParsedHealthData {
  records: Omit<InsertHealthData, "userId">[];
  summary: {
    totalRecords: number;
    dateRange: { start: Date; end: Date } | null;
    dataTypes: Record<string, number>;
  };
}

export async function parseAppleHealthXml(xmlContent: string): Promise<ParsedHealthData> {
  const result = await parseXml(xmlContent) as AppleHealthExport;
  
  const records: Omit<InsertHealthData, "userId">[] = [];
  const dataTypeCounts: Record<string, number> = {};
  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;

  if (result.HealthData?.Record) {
    for (const record of result.HealthData.Record) {
      const typeInfo = HEALTH_TYPE_MAP[record.$.type];
      
      if (!typeInfo) continue;

      const startDate = new Date(record.$.startDate);
      const endDate = record.$.endDate ? new Date(record.$.endDate) : undefined;
      
      if (!earliestDate || startDate < earliestDate) earliestDate = startDate;
      if (!latestDate || startDate > latestDate) latestDate = startDate;

      dataTypeCounts[typeInfo.type] = (dataTypeCounts[typeInfo.type] || 0) + 1;

      records.push({
        dataType: typeInfo.type as any,
        value: record.$.value || "1",
        unit: record.$.unit || typeInfo.unit,
        startDate,
        endDate,
        source: "apple_health",
        metadata: {
          device: record.$.device,
          sourceName: record.$.sourceName,
          sourceVersion: record.$.sourceVersion,
          creationDate: record.$.creationDate,
        },
      });
    }
  }

  return {
    records,
    summary: {
      totalRecords: records.length,
      dateRange: earliestDate && latestDate ? { start: earliestDate, end: latestDate } : null,
      dataTypes: dataTypeCounts,
    },
  };
}

export function aggregateDailyHealth(records: Omit<InsertHealthData, "userId">[]): Map<string, {
  steps: number;
  avgHeartRate: number;
  heartRateCount: number;
  restingHeartRate: number;
  hrv: number;
  sleepMinutes: number;
  activeEnergy: number;
  exerciseMinutes: number;
  standHours: number;
  mindfulMinutes: number;
}> {
  const dailyData = new Map<string, {
    steps: number;
    avgHeartRate: number;
    heartRateCount: number;
    restingHeartRate: number;
    hrv: number;
    sleepMinutes: number;
    activeEnergy: number;
    exerciseMinutes: number;
    standHours: number;
    mindfulMinutes: number;
  }>();

  for (const record of records) {
    const dateKey = record.startDate.toISOString().split("T")[0];
    
    if (!dailyData.has(dateKey)) {
      dailyData.set(dateKey, {
        steps: 0,
        avgHeartRate: 0,
        heartRateCount: 0,
        restingHeartRate: 0,
        hrv: 0,
        sleepMinutes: 0,
        activeEnergy: 0,
        exerciseMinutes: 0,
        standHours: 0,
        mindfulMinutes: 0,
      });
    }

    const day = dailyData.get(dateKey)!;
    const value = parseFloat(record.value) || 0;

    switch (record.dataType) {
      case "steps":
        day.steps += value;
        break;
      case "heart_rate":
        day.avgHeartRate = (day.avgHeartRate * day.heartRateCount + value) / (day.heartRateCount + 1);
        day.heartRateCount++;
        break;
      case "resting_heart_rate":
        day.restingHeartRate = value;
        break;
      case "heart_rate_variability":
        day.hrv = value;
        break;
      case "sleep":
        day.sleepMinutes += value;
        break;
      case "active_energy":
        day.activeEnergy += value;
        break;
      case "exercise_minutes":
        day.exerciseMinutes += value;
        break;
      case "stand_hours":
        day.standHours += value;
        break;
      case "mindful_minutes":
        day.mindfulMinutes += value;
        break;
    }
  }

  return dailyData;
}

export function getSleepQuality(sleepHours: number): "poor" | "fair" | "good" | "excellent" {
  if (sleepHours < 5) return "poor";
  if (sleepHours < 6.5) return "fair";
  if (sleepHours < 8) return "good";
  return "excellent";
}

export function generateHealthInsights(summary: {
  steps?: number;
  avgHeartRate?: number;
  restingHeartRate?: number;
  hrv?: number;
  sleepHours?: number;
  exerciseMinutes?: number;
}): string[] {
  const insights: string[] = [];

  if (summary.steps !== undefined) {
    if (summary.steps >= 10000) {
      insights.push("👏 恭喜！今天達成一萬步目標，身體能量充沛");
    } else if (summary.steps >= 7000) {
      insights.push("🚶 活動量良好，持續保持");
    } else if (summary.steps < 5000) {
      insights.push("💡 今天活動量較少，建議散步或做些輕運動");
    }
  }

  if (summary.sleepHours !== undefined) {
    if (summary.sleepHours >= 7 && summary.sleepHours <= 9) {
      insights.push("😴 睡眠時長理想，身體修復良好");
    } else if (summary.sleepHours < 6) {
      insights.push("⚠️ 睡眠不足，可能影響專注力和情緒");
    } else if (summary.sleepHours > 9) {
      insights.push("💤 睡眠時間較長，注意是否有疲勞感");
    }
  }

  if (summary.restingHeartRate !== undefined) {
    if (summary.restingHeartRate < 60) {
      insights.push("💚 靜息心率優秀，心血管健康狀態良好");
    } else if (summary.restingHeartRate > 80) {
      insights.push("💓 靜息心率偏高，建議放鬆並監測壓力水平");
    }
  }

  if (summary.hrv !== undefined) {
    if (summary.hrv > 50) {
      insights.push("🧘 HRV 良好，身心適應力佳");
    } else if (summary.hrv < 30) {
      insights.push("🔄 HRV 偏低，身體可能需要更多恢復時間");
    }
  }

  if (summary.exerciseMinutes !== undefined) {
    if (summary.exerciseMinutes >= 30) {
      insights.push("🏃 運動時間達標，維持良好習慣");
    } else if (summary.exerciseMinutes < 15) {
      insights.push("🎯 今天運動時間較少，找時間動一動吧");
    }
  }

  return insights;
}
