import * as vscode from 'vscode';
import { ZaiService, UsageData } from './api/zaiService';
import { UsageIndicator } from './statusBar/usageIndicator';
import { getConfiguration } from './config/configuration';

let zaiService: ZaiService | null = null;
let usageIndicator: UsageIndicator | null = null;
let refreshTimer: NodeJS.Timeout | null = null;
let apiKeyPromptShown: boolean = false;

export function activate(context: vscode.ExtensionContext) {
  console.log('Z.ai Usage Tracker extension is now active');

  // Create status bar indicator immediately (always visible)
  if (!usageIndicator) {
    zaiService = new ZaiService('');
    usageIndicator = new UsageIndicator(zaiService);
    usageIndicator.showNotConfigured();
  }

  // Check for API key in SecretStorage first, then settings
  checkApiKeyAndInitialize(context);

  // Register commands
  const refreshCommand = vscode.commands.registerCommand('zaiUsage.refresh', () => {
    refreshUsage();
  });

  const configureCommand = vscode.commands.registerCommand('zaiUsage.configure', async () => {
    await configureSettings(context);
  });

  const statusBarCommand = vscode.commands.registerCommand('zaiUsage.showMenu', async () => {
    if (usageIndicator) {
      await usageIndicator.showQuickPick();
    }
  });

  // Debug command to show raw API responses
  const debugCommand = vscode.commands.registerCommand('zaiUsage.debug', async () => {
    if (!zaiService) {
      vscode.window.showErrorMessage('Z.ai Usage: Service not initialized. Please configure API key first.');
      return;
    }

    const outputChannel = vscode.window.createOutputChannel('Z.ai API Debug');
    outputChannel.show();
    outputChannel.appendLine('='.repeat(60));
    outputChannel.appendLine('Z.ai API Debug - Raw Responses');
    outputChannel.appendLine('='.repeat(60));
    outputChannel.appendLine('');
    outputChannel.appendLine('Fetching data from API endpoints...');
    outputChannel.appendLine('');

    try {
      const rawData = await zaiService.debugFetchRaw();

      outputChannel.appendLine('-'.repeat(60));
      outputChannel.appendLine('1. QUOTA LIMIT (/api/monitor/usage/quota/limit)');
      outputChannel.appendLine('-'.repeat(60));
      outputChannel.appendLine(JSON.stringify(rawData.quotaLimit, null, 2));
      outputChannel.appendLine('');

      outputChannel.appendLine('-'.repeat(60));
      outputChannel.appendLine('2. MODEL USAGE - 24h (/api/monitor/usage/model-usage)');
      outputChannel.appendLine('-'.repeat(60));
      outputChannel.appendLine(JSON.stringify(rawData.modelUsage, null, 2));
      outputChannel.appendLine('');

      outputChannel.appendLine('-'.repeat(60));
      outputChannel.appendLine('3. TOOL USAGE - 24h (/api/monitor/usage/tool-usage)');
      outputChannel.appendLine('-'.repeat(60));
      outputChannel.appendLine(JSON.stringify(rawData.toolUsage, null, 2));
      outputChannel.appendLine('');

      outputChannel.appendLine('-'.repeat(60));
      outputChannel.appendLine('4. MODEL USAGE - 7 Day (/api/monitor/usage/model-usage)');
      outputChannel.appendLine('-'.repeat(60));
      outputChannel.appendLine(JSON.stringify(rawData.modelUsage7Day, null, 2));
      outputChannel.appendLine('');

      outputChannel.appendLine('='.repeat(60));
      outputChannel.appendLine('Debug complete. Review the data above to see what fields are available.');
      outputChannel.appendLine('='.repeat(60));
    } catch (error) {
      outputChannel.appendLine(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  context.subscriptions.push(refreshCommand, configureCommand, statusBarCommand, debugCommand);

  // Watch for configuration changes
  const configWatcher = vscode.workspace.onDidChangeConfiguration(async (e) => {
    if (e.affectsConfiguration('zaiUsage')) {
      console.log('Z.ai Usage configuration changed, reinitializing...');
      await initializeService(context);
    }
  });

  context.subscriptions.push(configWatcher);
}

/**
 * Check API key from SecretStorage and initialize
 */
async function checkApiKeyAndInitialize(context: vscode.ExtensionContext): Promise<void> {
  const secretStorage = context.secrets;

  // Try to get API key from SecretStorage first
  let apiKey = await secretStorage.get('zai.apiKey');

  // If not in SecretStorage, check settings for migration
  if (!apiKey) {
    const config = getConfiguration();
    if (config.apiKey) {
      // Migrate from settings to SecretStorage
      apiKey = config.apiKey;
      await secretStorage.store('zai.apiKey', apiKey);
      // Clear from settings
      await vscode.workspace.getConfiguration('zaiUsage').update('apiKey', undefined, vscode.ConfigurationTarget.Global);
    }
  }

  if (apiKey) {
    await initializeService(context, apiKey);
    refreshUsage();
  } else {
    // Show prompt for API key
    showApiKeyPrompt();
  }
}

/**
 * Initialize or reinitialize service and indicator
 */
async function initializeService(context: vscode.ExtensionContext, apiKey?: string): Promise<void> {
  const config = getConfiguration();

  // Use provided API key or get from SecretStorage
  let effectiveApiKey = apiKey;
  if (!effectiveApiKey) {
    effectiveApiKey = await context.secrets.get('zai.apiKey');
  }

  if (!effectiveApiKey) {
    console.log('Z.ai Usage: API key not configured');
    if (!apiKeyPromptShown) {
      showApiKeyPrompt();
    }
    return;
  }

  // Update existing service or create new one
  if (zaiService) {
    zaiService.updateApiKey(effectiveApiKey);
  } else {
    zaiService = new ZaiService(effectiveApiKey);
  }

  // Update indicator
  if (usageIndicator) {
    usageIndicator.updateService(zaiService);
  }

  // Setup periodic refresh
  setupRefreshTimer(config.refreshInterval);
}

/**
 * Setup periodic refresh timer
 */
function setupRefreshTimer(intervalMinutes: number): void {
  // Clear existing timer
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  // Set up new timer
  refreshTimer = setInterval(() => {
    refreshUsage();
  }, intervalMinutes * 60 * 1000);

  console.log(`Z.ai Usage: Refresh interval set to ${intervalMinutes} minutes`);
}

/**
 * Refresh usage data from API
 */
async function refreshUsage(): Promise<void> {
  if (!zaiService || !usageIndicator) {
    console.log('Z.ai Usage: Service or indicator not initialized');
    return;
  }

  console.log('Z.ai Usage: Refreshing...');

  // Show loading state
  usageIndicator.showLoading();

  try {
    const result = await zaiService.fetchUsage();

    if (result.success && result.data) {
      usageIndicator.updateUsage(result.data);
      console.log('Z.ai Usage: Updated successfully', result.data);

      // Show info message if using local tracking
      if (result.error) {
        vscode.window.showInformationMessage(
          `Z.ai Usage: Using local tracking (${result.error})`
        );
      }
    } else {
      usageIndicator.showError(result.error || 'Failed to fetch usage');
      console.log('Z.ai Usage: Fetch failed', result.error);

      // Show error notification
      vscode.window.showErrorMessage(
        `Failed to fetch Z.ai usage: ${result.error || 'Unknown error'}`,
        'Configure',
        'Retry'
      ).then(selection => {
        if (selection === 'Configure') {
          vscode.commands.executeCommand('zaiUsage.configure');
        } else if (selection === 'Retry') {
          refreshUsage();
        }
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    usageIndicator.showError(errorMessage);
    console.error('Z.ai Usage: Error refreshing', error);
  }
}

/**
 * Configure extension settings
 */
async function configureSettings(context: vscode.ExtensionContext): Promise<void> {
  const config = getConfiguration();
  const secretStorage = context.secrets;
  const currentApiKey = await secretStorage.get('zai.apiKey');

  // Mask API key for display
  const maskedApiKey = currentApiKey && currentApiKey.length > 8
    ? `${currentApiKey.substring(0, 4)}...${currentApiKey.substring(currentApiKey.length - 4)}`
    : currentApiKey || 'Not set';

  // Quick pick for configuration options
  const options: vscode.QuickPickItem[] = [
    {
      label: '$(key) Update API Key',
      description: 'Enter your Z.ai API key (stored securely)',
      detail: `Current: ${maskedApiKey}`
    },
    {
      label: '$(clock) Change Refresh Interval',
      description: 'Set how often to fetch usage data',
      detail: `Current: ${config.refreshInterval} minutes`
    }
  ];

  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: 'Configure Z.ai Usage Tracker'
  });

  if (!selected) {
    return;
  }

  if (selected.label.includes('API Key')) {
    // Show instructions first
    const instructions = await vscode.window.showInformationMessage(
      'Your API key will be stored securely using VS Code\'s encrypted storage.\n\n' +
      'Get your API key from: https://z.ai/manage-apikey/apikey-list',
      'Continue',
      'Cancel'
    );

    if (instructions !== 'Continue') {
      return;
    }

    const apiKey = await vscode.window.showInputBox({
      prompt: 'Enter your Z.ai API key',
      placeHolder: 'sk-... or paste your full API key',
      password: true,
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'API key cannot be empty';
        }
        if (value.trim().length < 10) {
          return 'API key seems too short. Please check and try again.';
        }
        // Basic validation - Z.ai keys typically start with certain patterns
        // But we'll be lenient to support different formats
        return null;
      }
    });

    if (apiKey && apiKey.trim()) {
      const trimmedKey = apiKey.trim();
      
      // Store in SecretStorage (secure)
      await secretStorage.store('zai.apiKey', trimmedKey);
      
      // Show masked preview
      const maskedKey = trimmedKey.length > 8 
        ? `${trimmedKey.substring(0, 4)}...${trimmedKey.substring(trimmedKey.length - 4)}`
        : '***';
      
      vscode.window.showWarningMessage(
        `✓ API key saved securely!\nKey: ${maskedKey}`,
        'Test Connection',
        'Done'
      ).then(async (selection) => {
        if (selection === 'Test Connection') {
          await initializeService(context);
          refreshUsage();
        }
      });
      
      await initializeService(context);
      refreshUsage();
    } else if (apiKey !== undefined) {
      // User cancelled or entered empty key
      vscode.window.showWarningMessage('API key not saved. Operation cancelled.');
    }
  } else if (selected.label.includes('Refresh Interval')) {
    const interval = await vscode.window.showInputBox({
      prompt: 'Enter refresh interval in minutes',
      placeHolder: '5',
      value: config.refreshInterval.toString(),
      validateInput: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) {
          return 'Please enter a valid number (minimum 1)';
        }
        return null;
      }
    });

    if (interval) {
      await vscode.workspace.getConfiguration('zaiUsage').update(
        'refreshInterval',
        parseInt(interval),
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage(`Refresh interval updated to ${interval} minutes.`);
      await initializeService(context);
    }
  }
}

/**
 * Show prompt to configure API key
 */
async function showApiKeyPrompt(): Promise<void> {
  if (apiKeyPromptShown) {
    return;
  }

  apiKeyPromptShown = true;
  const result = await vscode.window.showWarningMessage(
    '⚠️ Z.ai Usage Tracker requires an API key to function. Your API key will be stored securely.',
    'Configure Now',
    'Later'
  );

  if (result === 'Configure Now') {
    vscode.commands.executeCommand('zaiUsage.configure');
  }
}

export function deactivate() {
  console.log('Z.ai Usage Tracker extension is now deactivated');

  // Clear refresh timer
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  // Dispose indicator
  if (usageIndicator) {
    usageIndicator.dispose();
    usageIndicator = null;
  }

  // Clear service reference
  zaiService = null;
}
