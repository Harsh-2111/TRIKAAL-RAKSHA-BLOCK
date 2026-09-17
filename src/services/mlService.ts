import { supabase } from '../lib/supabase';

const getEnv = (key: string, fallback: string): string => {
  try {
    return ((import.meta as any).env && (import.meta as any).env[key]) || fallback;
  } catch {
    return fallback;
  }
};

const ML_API_URL = getEnv('VITE_API_BASE_URL', 'http://localhost:8001');

const NUMERIC_RISK_WEIGHTS = {
  severity: 12.0,
  days_overdue: 0.6,
  asset_age_years: 0.4,
  past_failure_count: 5.5,
  deferred_count: 7.5,
} as const;

export interface DefectPayload {
  defect_id: string;
  source_system: string;
  department: string;
  section: string;
  severity: number;
  days_overdue: number;
  asset_age_years: number;
  past_failure_count: number;
  deferred_count: number;
}

export interface SHAPExplanation {
  feature: string;
  contribution: number;
  direction: string;
}

export interface MLPredictionResult {
  defect_id: string;
  predicted_risk_score: number;
  risk_tier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  top_shap_drivers: SHAPExplanation[];
  model_version: string;
  fallback_used: boolean;
}

interface BatchPredictionResponse {
  defects: MLPredictionResult[];
}

function riskTier(score: number): MLPredictionResult['risk_tier'] {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

function clampRiskScore(score: number): number {
  return Math.min(100, Math.max(5, Number(score.toFixed(4))));
}

function localPrediction(defect: DefectPayload): MLPredictionResult {
  const contributions = Object.entries(NUMERIC_RISK_WEIGHTS).map(([feature, weight]) => ({
    feature,
    contribution: defect[feature as keyof typeof NUMERIC_RISK_WEIGHTS] as number * weight,
  }));
  const score = clampRiskScore(contributions.reduce((total, item) => total + item.contribution, 0));

  return {
    defect_id: defect.defect_id,
    predicted_risk_score: score,
    risk_tier: riskTier(score),
    top_shap_drivers: contributions
      .sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution))
      .slice(0, 3)
      .map((item) => ({
        feature: item.feature,
        contribution: Number(item.contribution.toFixed(4)),
        direction: item.contribution >= 0 ? 'increases risk' : 'decreases risk',
      })),
    model_version: 'fallback-ground-truth',
    fallback_used: true,
  };
}

function isPredictionResult(value: unknown): value is MLPredictionResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<MLPredictionResult>;
  return typeof result.defect_id === 'string' && typeof result.predicted_risk_score === 'number';
}

async function requestJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${ML_API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`ML service returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function predictRiskScore(defect: DefectPayload): Promise<MLPredictionResult> {
  try {
    const result = await requestJson<MLPredictionResult>('/predict/score', defect);
    if (!isPredictionResult(result)) throw new Error('Invalid ML score response');
    return result;
  } catch (error) {
    console.warn('ML risk scoring unavailable; using deterministic local fallback.', error);
    return localPrediction(defect);
  }
}

export async function fetchBatchPriorities(defects: DefectPayload[]): Promise<MLPredictionResult[]> {
  if (defects.length === 0) return [];

  try {
    const response = await requestJson<MLPredictionResult[] | BatchPredictionResponse>('/predict/batch', { defects });
    const results = Array.isArray(response) ? response : response.defects;
    if (!Array.isArray(results) || !results.every(isPredictionResult)) {
      throw new Error('Invalid ML batch response');
    }
    return results;
  } catch (error) {
    console.warn('ML batch scoring unavailable; using deterministic local fallback.', error);
    return defects.map(localPrediction).sort((left, right) => right.predicted_risk_score - left.predicted_risk_score);
  }
}

export async function syncDefectScoresToSupabase(defects: MLPredictionResult[]): Promise<boolean> {
  if (defects.length === 0) return true;

  const updates = await Promise.all(
    defects.map(async (defect) => {
      const { error } = await supabase
        .from('defects')
        .update({ calculated_risk_score: defect.predicted_risk_score })
        .eq('defect_id', defect.defect_id);
      return !error;
    })
  );

  return updates.every(Boolean);
}