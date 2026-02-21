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
    const connectionIcon = usage.connectionStatus === 'connected' ? '' : '$(warning)';

    // Find the quota with the longest time window to display in status bar
    // Only consider token quotas (TOKENS_LIMIT type), not tool limits (TIME_LIMIT)
    // Priority: Month (5) > Week (6) > Hour (3), then compare number
    const tokenQuotas = usage.tokenQuotas;
    let displayQuota = tokenQuotas.length > 0 ? tokenQuotas[0] : null;
    if (tokenQuotas.length > 1) {
      displayQuota = tokenQuotas.reduce((max, quota) => {
        const maxPriority = this.getTimeWindowPriority(max.unit, max.number);
        const quotaPriority = this.getTimeWindowPriority(quota.unit, quota.number);
        return quotaPriority > maxPriority ? quota : max;
      });
    }

    // Format the display text
    let text: string;
    if (displayQuota) {
      let usageInfo = '';
      if (displayQuota.actualTokens && displayQuota.percentage > 0) {
        const estimatedLimit = Math.round(displayQuota.actualTokens / (displayQuota.percentage / 100));
        usageInfo = ` · ${this.formatNumber(displayQuota.actualTokens)} / ${this.formatNumber(estimatedLimit)} Tokens`;
      }
      text = `$(zap) GLM: ${connectionIcon} ${displayQuota.percentage}%${usageInfo}`;
    } else {
      text = `$(zap) GLM: ${connectionIcon} No quota data`;
    }

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = this.getTooltip();

    // Set background color based on highest usage
    const maxPercentage = displayQuota?.percentage || 0;
    if (maxPercentage >= 80) {
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

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;  // Enable Codicon icons
    md.appendMarkdown('## $(error) Error Fetching Usage\n\n');
    md.appendMarkdown(`**Error**: \`${error}\`\n\n`);
    md.appendMarkdown('[$(refresh) Click to Refresh](command:zaiUsage.refresh)');

    this.statusBarItem.tooltip = md;
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
  private getSimpleTooltip(): vscode.MarkdownString | string {
    if (!this.currentUsage || this.currentUsage.tokenQuotas.length === 0) {
      return 'Click to view Z.ai usage details';
    }
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;
    md.supportThemeIcons = true;  // Enable Codicon icons

    const quotaSummary = this.currentUsage.tokenQuotas
      .map(q => `**${q.windowName}**: \`${q.percentage}%\``)
      .join(' • ');
    md.appendMarkdown(`$(zap) **Z.ai Usage**: ${quotaSummary}\n\n`);
    md.appendMarkdown('*Click to view details*');
    return md;
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
  private getTooltip(): vscode.MarkdownString | string {
    if (!this.currentUsage) {
      return 'Click for options';
    }

    const lastUpdated = this.formatDate(this.currentUsage.lastUpdated);
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;
    md.supportThemeIcons = true;  // Enable Codicon icons

    // Header
    md.appendMarkdown('#### $(zap) Z.AI GLM Coding Plan Usage\n');

    // Connection status
    let statusIcon = '';
    let statusText = '';
    if (this.currentUsage.connectionStatus === 'connected') {
      statusIcon = '$(check)';
      statusText = 'Connected';
    } else if (this.currentUsage.connectionStatus === 'disconnected') {
      statusIcon = '$(warning)';
      statusText = 'Offline';
    } else {
      statusIcon = '$(error)';
      statusText = 'Error';
    }

    // Build status line with plan level
    let statusLine = `${statusIcon} *${statusText}* &emsp; $(clock) Updated *${lastUpdated}*`;
    if (this.currentUsage.planLevel) {
      const planLevelDisplay = `GLM Coding Plan **${this.currentUsage.planLevel.charAt(0).toUpperCase() + this.currentUsage.planLevel.slice(1)}**`;
      statusLine += ` &emsp; $(star) *${planLevelDisplay}*`;
    }
    md.appendMarkdown(`${statusLine}\n\n`);

    md.appendMarkdown('---\n');
    md.appendMarkdown('$(graph) *Plan Quotas*\n\n');
    md.appendMarkdown('---\n');

    // Token Quota Windows (dynamic - display all from API)
    if (this.currentUsage.tokenQuotas.length > 0) {

      // Build compact Markdown table (4 columns, no header)
      md.appendMarkdown('|  |  |  |  |\n');
      md.appendMarkdown('|:--------|------:|:--------:|:----------|\n');

      for (const quota of this.currentUsage.tokenQuotas) {
        const resetInfo = quota.nextResetTime
          ? `Reset ${this.formatResetTime(quota.nextResetTime)}`
          : 'No reset time';
        const progressBar = this.getProgressBar(quota.percentage);
        const quotaLabel = `${quota.windowName}`;
        const percentageText = `<code>${quota.percentage}%</code>`;

        md.appendMarkdown(`| ${quotaLabel} | ${percentageText} | ${progressBar} | *${resetInfo}* |\n`);
      }

      // Show estimated token limits based on usage data
      const estimatedLimits = this.calculateEstimatedLimits();
      if (estimatedLimits) {
        md.appendMarkdown('\n');
        md.appendMarkdown(`$(info) *Estimated limits: ${estimatedLimits}*\n\n`);
        md.appendMarkdown('$(warning) *Note: Estimated based on usage % and used tokens, not official limits*\n\n');
      }
    } else {
      md.appendMarkdown('$(info) *No Quota Data Available*\n\n');
    }

    md.appendMarkdown('---\n\n');

    // Usage Stats Table
    md.appendMarkdown('$(graph) *Usage Statistics*\n\n');
    md.appendMarkdown('---\n');
    md.appendMarkdown('|  |  |  |  |  |\n');
    md.appendMarkdown('|:-------|--------:|:--------:|--------:|:--------:|\n');
    md.appendMarkdown(`| $(calendar) Today&emsp; | **${this.currentUsage.todayPrompts}**  | Prompts&emsp; | **${this.formatNumber(this.currentUsage.todayTokens)}** | Tokens |\n`);
    md.appendMarkdown(`| $(calendar) Weeks&emsp; | **${this.currentUsage.sevenDayPrompts}** | Prompts&emsp; | **${this.formatNumber(this.currentUsage.sevenDayTokens)}** | Tokens |\n`);
    md.appendMarkdown(`| $(calendar) Months&emsp; | **${this.currentUsage.thirtyDayPrompts}** | Prompts&emsp; | **${this.formatNumber(this.currentUsage.thirtyDayTokens)}** | Tokens |\n`);
    md.appendMarkdown('\n');
    md.appendMarkdown('$(info) *Prompts = Model invocations (each user prompt may trigger 10-20+ calls)*\n\n');

    // MCP Tool Limits
    if (this.currentUsage.timeLimits.length > 0) {
      md.appendMarkdown('---\n');
      md.appendMarkdown('$(tools) *MCP Tool Quotas*\n\n');
      md.appendMarkdown('---\n');
      md.appendMarkdown('|  |  |  |\n');
      md.appendMarkdown('|------:|:--------:|:----------:|\n');

      for (const timeLimit of this.currentUsage.timeLimits) {
        const resetInfo = timeLimit.nextResetTime
          ? `Reset ${this.formatResetTime(timeLimit.nextResetTime)}`
          : 'No reset time';
        const progressBar = this.getProgressBar(timeLimit.percentage);
        const usageText = `${timeLimit.currentValue}/${timeLimit.usage}`;

        md.appendMarkdown(`| <code>${usageText}</code> | ${progressBar} | *${resetInfo}* |\n`);
      }

    }

    md.appendMarkdown('---\n\n');

    // Action links
    md.appendMarkdown('[$(refresh) Refresh](command:zaiUsage.refresh "Fetch latest usage data") &emsp;');
    md.appendMarkdown('[$(gear) Settings](command:zaiUsage.configure "Configure API key and settings")');

    return md;
  }

  /**
   * Get priority for time window comparison
   * Higher priority = longer time period
   * @param unit 3=hour(s), 5=month(s), 6=week(s)
   * @param number Quantity of the time unit
   * @returns Priority value (higher = longer period)
   */
  private getTimeWindowPriority(unit: number, number: number): number {
    // Priority: Month > Week > Hour
    const unitPriorities: { [key: number]: number } = {
      5: 100000, // Month
      6: 10000,  // Week
      3: 1000    // Hour
    };
    return (unitPriorities[unit] || 0) + number;
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
   * Format date for display (for past times)
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
   * Format reset time for display (for future times)
   * Shows precise time with minutes for quota windows (e.g., 5-hour, 7-day limits)
   */
  private formatResetTime(timestamp: number): string {
    const resetDate = new Date(timestamp);
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();

    // Calculate time components
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Remaining minutes after removing full hours
    const remainingMins = diffMins % 60;
    // Remaining hours after removing full days
    const remainingHours = diffHours % 24;

    if (diffMins < 1) {
      return 'Soon';
    } else if (diffMins < 60) {
      // Less than 1 hour: show minutes only
      return `in ${diffMins}m`;
    } else if (diffHours < 24) {
      // Less than 1 day: show hours + minutes
      return `in ${diffHours}h ${remainingMins}m`;
    } else if (diffDays < 7) {
      // Less than 1 week: show days + hours + minutes
      return `in ${diffDays}d ${remainingHours}h ${remainingMins}m`;
    } else {
      // For longer periods, show the actual date and time in numeric format
      const year = resetDate.getFullYear();
      const month = String(resetDate.getMonth() + 1).padStart(2, '0');
      const day = String(resetDate.getDate()).padStart(2, '0');
      const hours = String(resetDate.getHours()).padStart(2, '0');
      const minutes = String(resetDate.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
  }

  /**
   * Get text progress bar
   */
  private getProgressBar(percentage: number): string {
    const totalBars = 20;
    const filledBars = Math.round((percentage / 100) * totalBars);
    return '<code>' + '█'.repeat(filledBars) + '░'.repeat(totalBars - filledBars) + '</code>';
  }

  /**
   * Calculate estimated token limits based on usage percentage and actual usage
   */
  private calculateEstimatedLimits(): string | null {
    if (!this.currentUsage || this.currentUsage.tokenQuotas.length === 0) {
      return null;
    }

    const estimates: string[] = [];

    for (const quota of this.currentUsage.tokenQuotas) {
      // Skip if percentage is 0 to avoid division by zero, or if we don't have actual tokens
      if (quota.percentage === 0 || !quota.actualTokens || quota.actualTokens === 0) {
        continue;
      }

      // Calculate estimated total limit: actual / (percentage / 100)
      const estimatedLimit = Math.round(quota.actualTokens / (quota.percentage / 100));
      estimates.push(`${quota.windowName}: ${this.formatNumber(quota.actualTokens)}/${this.formatNumber(estimatedLimit)}`);
    }

    return estimates.length > 0 ? estimates.join(' • ') : null;
  }

  /**
   * Show quick pick menu with stats and actions
   */
  async showQuickPick(): Promise<void> {
    const options: vscode.QuickPickItem[] = [];

    // Action items only - detailed stats are in the tooltip
    options.push({
      label: '$(refresh) Refresh Usage',
      description: 'Fetch latest usage data'
    });

    options.push({
      label: '$(settings-gear) Configure Settings',
      description: 'Update API key and refresh interval'
    });

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: 'Z.ai Usage Tracker - Select an action'
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

