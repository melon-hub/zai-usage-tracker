import * as vscode from 'vscode';
import { UsageData, ZaiService } from '../api/zaiService';

export class UsageIndicator {
  private statusBarItem: vscode.StatusBarItem;
  private zaiService: ZaiService;
  private currentUsage: UsageData | null = null;
  private currentError: string | null = null;

  constructor(zaiService: ZaiService) {
    this.zaiService = zaiService;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBarItem.command = 'zaiUsage.showMenu';
    this.statusBarItem.tooltip = this.getSimpleTooltip();
    this.statusBarItem.show();
  }

  /**
   * Update the status bar with new usage data
   */
  updateUsage(usage: UsageData): void {
    this.currentUsage = usage;
    this.currentError = null;

    // Determine connection status icon
    const connectionIcon = usage.connectionStatus === 'connected' ? '✓' : '⚠';

    // Format the display text: show 5-hour token quota percentage and current tokens
    const tokenDisplay = this.formatNumber(usage.current5HourTokens);
    const text = `${connectionIcon} $(zap) ${usage.percentage5Hour}% • ${tokenDisplay} tokens`;
    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = this.getTooltip();

    // Set background color based on usage
    if (usage.percentage5Hour >= 80) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    }
  }

  /**
   * Show error state in status bar
   */
  showError(error: string): void {
    this.currentError = error;
    this.statusBarItem.text = `$(error) Error`;
    this.statusBarItem.tooltip = `Error fetching Z.ai usage: ${error}\nClick to refresh`;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  }

  /**
   * Show loading state
   */
  showLoading(): void {
    this.statusBarItem.text = `$(sync~spin) Loading...`;
    this.statusBarItem.tooltip = 'Fetching Z.ai usage data...';
  }

  /**
   * Show not configured state
   */
  showNotConfigured(): void {
    this.statusBarItem.text = `$(key) Configure API Key`;
    this.statusBarItem.tooltip = 'Z.ai Usage Tracker: API key not configured\nClick to configure';
    this.statusBarItem.backgroundColor = undefined;
  }

  /**
   * Update the service reference
   */
  updateService(service: ZaiService): void {
    this.zaiService = service;
  }

  /**
   * Get simple tooltip for status bar hover
   */
  private getSimpleTooltip(): string {
    if (!this.currentUsage) {
      return 'Click to view Z.ai usage details';
    }
    return `Z.ai Usage: ${this.currentUsage.percentage5Hour}% of 5-hour quota\nClick to view details`;
  }

  /**
   * Get current usage data
   */
  getCurrentUsage(): UsageData | null {
    return this.currentUsage;
  }

  /**
   * Get tooltip with detailed information
   */
  private getTooltip(): string {
    if (!this.currentUsage) {
      return 'Click for options';
    }

    const lastUpdated = this.formatDate(this.currentUsage.lastUpdated);

    let tooltip = '⚡ Z.ai GLM Usage\n';
    tooltip += '─────────────────\n\n';

    // 5-Hour Token Quota
    tooltip += `📊 5-Hour Quota (${this.currentUsage.percentage5Hour}%)\n`;
    tooltip += `   ${this.formatNumber(this.currentUsage.current5HourTokens)} / ${this.formatNumber(this.currentUsage.limit5HourTokens)} tokens\n`;
    tooltip += `   ${this.getProgressBar(this.currentUsage.percentage5Hour)}\n\n`;

    // 7-Day Stats
    tooltip += `📅 Last 7 Days\n`;
    tooltip += `   ${this.currentUsage.sevenDayPrompts} prompts • ${this.formatNumber(this.currentUsage.sevenDayTokens)} tokens\n\n`;

    // 30-Day Stats (All Time)
    tooltip += `📆 Last 30 Days\n`;
    tooltip += `   ${this.currentUsage.thirtyDayPrompts} prompts • ${this.formatNumber(this.currentUsage.thirtyDayTokens)} tokens\n\n`;

    // Connection status
    if (this.currentUsage.connectionStatus === 'connected') {
      tooltip += `✓ Connected`;
    } else if (this.currentUsage.connectionStatus === 'disconnected') {
      tooltip += `⚠ Offline`;
    } else {
      tooltip += `✗ Error`;
    }
    tooltip += ` • Updated ${lastUpdated}\n\n`;

    tooltip += 'Click for more options';

    return tooltip;
  }

  /**
   * Format number with K/M suffixes
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)}h ago`;
    } else {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  /**
   * Get text progress bar
   */
  private getProgressBar(percentage: number): string {
    const totalBars = 20;
    const filledBars = Math.round((percentage / 100) * totalBars);
    return '█'.repeat(filledBars) + '░'.repeat(totalBars - filledBars);
  }

  /**
   * Show quick pick menu with stats and actions
   */
  async showQuickPick(): Promise<void> {
    const options: vscode.QuickPickItem[] = [];

    // Add stats section if we have usage data
    if (this.currentUsage) {
      options.push({
        label: `$(graph) 5-Hour Quota: ${this.currentUsage.percentage5Hour}%`,
        description: `${this.formatNumber(this.currentUsage.current5HourTokens)} / ${this.formatNumber(this.currentUsage.limit5HourTokens)} tokens`,
        kind: vscode.QuickPickItemKind.Default
      });

      options.push({
        label: `$(calendar) Last 7 Days`,
        description: `${this.currentUsage.sevenDayPrompts} prompts • ${this.formatNumber(this.currentUsage.sevenDayTokens)} tokens`
      });

      options.push({
        label: `$(history) Last 30 Days`,
        description: `${this.currentUsage.thirtyDayPrompts} prompts • ${this.formatNumber(this.currentUsage.thirtyDayTokens)} tokens`
      });

      // Separator
      options.push({
        label: '',
        kind: vscode.QuickPickItemKind.Separator
      });
    }

    // Action items
    options.push({
      label: '$(refresh) Refresh Usage',
      description: 'Fetch latest usage data'
    });

    options.push({
      label: '$(settings-gear) Configure Settings',
      description: 'Update API key and plan tier'
    });

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: 'Z.ai Usage Tracker'
    });

    if (selected?.label.includes('Refresh')) {
      vscode.commands.executeCommand('zaiUsage.refresh');
    } else if (selected?.label.includes('Configure')) {
      vscode.commands.executeCommand('zaiUsage.configure');
    }
  }

  /**
   * Dispose the status bar item
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }

  /**
   * Get the status bar item (for command registration)
   */
  getStatusBarItem(): vscode.StatusBarItem {
    return this.statusBarItem;
  }
}

