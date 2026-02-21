import * as vscode from 'vscode';

export interface ZaiConfiguration {
  /** @deprecated API key is now stored in SecretStorage. This field is only for migration. */
  apiKey: string;
  refreshInterval: number;
}

export function getConfiguration(): ZaiConfiguration {
  const config = vscode.workspace.getConfiguration('zaiUsage');
  return {
    // Note: apiKey is deprecated - only read for migration from old versions
    // New keys are stored in VS Code SecretStorage
    apiKey: config.get<string>('apiKey', ''),
    refreshInterval: config.get<number>('refreshInterval', 5)
  };
}

export async function updateConfiguration(key: string, value: any): Promise<void> {
  const config = vscode.workspace.getConfiguration('zaiUsage');
  await config.update(key, value, vscode.ConfigurationTarget.Global);
}

