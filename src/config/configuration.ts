import * as vscode from 'vscode';

export interface ZaiConfiguration {
  /** @deprecated API key is now stored in SecretStorage. This field is only for migration. */
  apiKey: string;
  planTier: 'lite' | 'pro' | 'max';
  refreshInterval: number;
}

export const PLAN_LIMITS: Record<string, number> = {
  lite: 120,
  pro: 600,
  max: 2400
};

export function getConfiguration(): ZaiConfiguration {
  const config = vscode.workspace.getConfiguration('zaiUsage');
  return {
    // Note: apiKey is deprecated - only read for migration from old versions
    // New keys are stored in VS Code SecretStorage
    apiKey: config.get<string>('apiKey', ''),
    planTier: config.get<'lite' | 'pro' | 'max'>('planTier', 'lite'),
    refreshInterval: config.get<number>('refreshInterval', 5)
  };
}

export function getPlanLimit(tier: 'lite' | 'pro' | 'max'): number {
  return PLAN_LIMITS[tier] || PLAN_LIMITS.lite;
}

export async function updateConfiguration(key: string, value: any): Promise<void> {
  const config = vscode.workspace.getConfiguration('zaiUsage');
  await config.update(key, value, vscode.ConfigurationTarget.Global);
}

