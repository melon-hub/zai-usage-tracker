/**
 * Represents a single token quota window from TOKENS_LIMIT
 */
export interface TokenQuota {
  windowName: string;      // e.g., "5-Hour", "1-Week", "1-Month"
  unit: number;            // 3=hour(s), 5=month(s), 6=week(s)
  number: number;          // Quantity of the time unit
  percentage: number;      // Usage percentage (0-100)
  nextResetTime?: number;  // Unix timestamp (ms) when quota resets
  actualTokens?: number;   // Actual tokens used in this window period
}

/**
 * Represents MCP tool usage limits from TIME_LIMIT
 */
export interface TimeLimit {
  windowName: string;      // e.g., "1-Month MCP Tools"
  unit: number;            // 5=month(s)
  number: number;          // Quantity of the time unit
  percentage: number;      // Usage percentage (0-100)
  usage: number;           // Total quota allowed
  currentValue: number;    // Current usage count
  remaining: number;       // Remaining quota
  nextResetTime?: number;  // Unix timestamp (ms) when quota resets
  usageDetails?: Array<{   // Per-tool usage breakdown
    modelCode: string;
    usage: number;
  }>;
}

export interface UsageData {
  // Dynamic token quota windows from API
  tokenQuotas: TokenQuota[];  // All TOKENS_LIMIT items returned by API
  // MCP tool limits from API
  timeLimits: TimeLimit[];    // All TIME_LIMIT items returned by API
  // Today stats
  todayPrompts: number;
  todayTokens: number;
  // 7-day stats
  sevenDayPrompts: number;
  sevenDayTokens: number;
  // 30-day stats (approximate "all time")
  thirtyDayPrompts: number;
  thirtyDayTokens: number;
  // Metadata
  lastUpdated: Date;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  // Plan level from quota limit API
  planLevel?: string;        // e.g., "free", "pro", "enterprise"
}

export interface FetchResult {
  success: boolean;
  data?: UsageData;
  error?: string;
}

interface QuotaLimitResponse {
  limits?: Array<{
    type: 'TOKENS_LIMIT' | 'TIME_LIMIT';
    unit: number;            // 3=hour(s), 5=month(s), 6=week(s)
    number: number;          // Quantity of the time unit
    percentage: number;
    nextResetTime?: number;
    // TIME_LIMIT specific fields
    usage?: number;
    currentValue?: number;
    remaining?: number;
    usageDetails?: any[];
  }>;
  level?: string;
}

interface ModelUsageResponse {
  totalUsage?: {
    totalModelCallCount?: number;
    totalTokensUsage?: number;
  };
  [key: string]: any;
}

export class ZaiService {
  private apiKey: string;
  private baseUrl = 'https://api.z.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch usage data from Z.ai API using the official monitor endpoints
   */
  async fetchUsage(): Promise<FetchResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'API key not configured'
      };
    }

    try {
      const now = new Date();

      // Time windows for different stats
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const start7d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      const start30d = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0, 0);

      const queryParamsToday = `?startTime=${encodeURIComponent(this.formatDateTime(startToday))}&endTime=${encodeURIComponent(this.formatDateTime(end))}`;
      const queryParams7d = `?startTime=${encodeURIComponent(this.formatDateTime(start7d))}&endTime=${encodeURIComponent(this.formatDateTime(end))}`;
      const queryParams30d = `?startTime=${encodeURIComponent(this.formatDateTime(start30d))}&endTime=${encodeURIComponent(this.formatDateTime(end))}`;

      // Fetch all endpoints in parallel
      const [quotaLimitResult, modelUsageTodayResult, modelUsage7dResult, modelUsage30dResult] = await Promise.allSettled([
        this.fetchEndpoint(`${this.baseUrl}/api/monitor/usage/quota/limit`, 'Quota limit'),
        this.fetchEndpoint(`${this.baseUrl}/api/monitor/usage/model-usage${queryParamsToday}`, 'Today usage'),
        this.fetchEndpoint(`${this.baseUrl}/api/monitor/usage/model-usage${queryParams7d}`, '7-day usage'),
        this.fetchEndpoint(`${this.baseUrl}/api/monitor/usage/model-usage${queryParams30d}`, '30-day usage')
      ]);

      // Initialize values
      const tokenQuotas: TokenQuota[] = [];
      const timeLimits: TimeLimit[] = [];
      let todayPrompts = 0;
      let todayTokens = 0;
      let sevenDayPrompts = 0;
      let sevenDayTokens = 0;
      let thirtyDayPrompts = 0;
      let thirtyDayTokens = 0;

      // Process quota limit response - collect all TOKENS_LIMIT and TIME_LIMIT windows dynamically
      const quotaLimitResponse = quotaLimitResult.status === 'fulfilled' ? quotaLimitResult.value as QuotaLimitResponse : null;
      let planLevel: string | undefined;
      
      if (quotaLimitResponse) {
        planLevel = quotaLimitResponse.level;
        if (quotaLimitResponse.limits) {
          for (const limit of quotaLimitResponse.limits) {
            if (limit.type === 'TOKENS_LIMIT') {
              tokenQuotas.push({
                windowName: this.formatWindowName(limit.unit, limit.number),
                unit: limit.unit,
                number: limit.number,
                percentage: limit.percentage || 0,
                nextResetTime: limit.nextResetTime,
                actualTokens: undefined // Will be filled below
              });
            } else if (limit.type === 'TIME_LIMIT') {
              timeLimits.push({
                windowName: this.formatWindowName(limit.unit, limit.number) + ' MCP Tools',
                unit: limit.unit,
                number: limit.number,
                percentage: limit.percentage || 0,
                usage: limit.usage || 0,
                currentValue: limit.currentValue || 0,
                remaining: limit.remaining || 0,
                nextResetTime: limit.nextResetTime,
                usageDetails: limit.usageDetails
              });
            }
          }
        }
      }

      // Fetch actual usage for each token quota window based on its reset time
      const quotaUsageRequests = tokenQuotas.map(async (quota) => {
        if (!quota.nextResetTime || quota.percentage === 0) {
          return null;
        }

        try {
          // Calculate the start time of this quota window
          const resetDate = new Date(quota.nextResetTime);
          let startDate: Date;

          // Calculate window start based on unit and number
          if (quota.unit === 3) {
            // Hours
            startDate = new Date(resetDate.getTime() - quota.number * 3600000);
          } else if (quota.unit === 6) {
            // Weeks
            startDate = new Date(resetDate.getTime() - quota.number * 7 * 86400000);
          } else if (quota.unit === 5) {
            // Months (approximate as 30 days)
            startDate = new Date(resetDate.getTime() - quota.number * 30 * 86400000);
          } else {
            return null;
          }

          const queryParams = `?startTime=${encodeURIComponent(this.formatDateTime(startDate))}&endTime=${encodeURIComponent(this.formatDateTime(now))}`;
          const result = await this.fetchEndpoint(
            `${this.baseUrl}/api/monitor/usage/model-usage${queryParams}`,
            `${quota.windowName} usage`
          );

          if (result && (result as ModelUsageResponse).totalUsage) {
            const modelData = result as ModelUsageResponse;
            quota.actualTokens = modelData.totalUsage?.totalTokensUsage || 0;
          }
        } catch (error) {
          console.error(`Failed to fetch usage for ${quota.windowName}:`, error);
        }

        return null;
      });

      // Wait for all quota usage requests to complete
      await Promise.allSettled(quotaUsageRequests);

      // Process today model usage
      if (modelUsageTodayResult.status === 'fulfilled' && modelUsageTodayResult.value) {
        const modelData = modelUsageTodayResult.value as ModelUsageResponse;
        if (modelData.totalUsage) {
          todayPrompts = modelData.totalUsage.totalModelCallCount || 0;
          todayTokens = modelData.totalUsage.totalTokensUsage || 0;
        }
      }

      // Process 7-day model usage
      if (modelUsage7dResult.status === 'fulfilled' && modelUsage7dResult.value) {
        const modelData = modelUsage7dResult.value as ModelUsageResponse;
        if (modelData.totalUsage) {
          sevenDayPrompts = modelData.totalUsage.totalModelCallCount || 0;
          sevenDayTokens = modelData.totalUsage.totalTokensUsage || 0;
        }
      }

      // Process 30-day model usage (approximate "all time")
      if (modelUsage30dResult.status === 'fulfilled' && modelUsage30dResult.value) {
        const modelData = modelUsage30dResult.value as ModelUsageResponse;
        if (modelData.totalUsage) {
          thirtyDayPrompts = modelData.totalUsage.totalModelCallCount || 0;
          thirtyDayTokens = modelData.totalUsage.totalTokensUsage || 0;
        }
      }

      return {
        success: true,
        data: {
          tokenQuotas,
          timeLimits,
          todayPrompts,
          todayTokens,
          sevenDayPrompts,
          sevenDayTokens,
          thirtyDayPrompts,
          thirtyDayTokens,
          lastUpdated: new Date(),
          connectionStatus: 'connected',
          planLevel
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Z.ai usage fetch error:', errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Format date to API datetime string format
   * @param date Date to format
   * @returns Formatted string like "2024-02-21 14:30:45"
   */
  private formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Format a human-readable window name from unit and number
   * @param unit 3=hour(s), 5=month(s), 6=week(s)
   * @param number Quantity of the time unit
   * @returns Formatted string like "5-Hour", "1-Week", "1-Month"
   */
  private formatWindowName(unit: number, number: number): string {
    const unitNames: { [key: number]: string } = {
      3: 'Hour',
      5: 'Month',
      6: 'Week'
    };
    const unitName = unitNames[unit] || 'Unknown';
    const plural = number > 1 ? 's' : '';
    return `${number}-${unitName}${plural}`;
  }

  /**
   * Fetch data from a specific endpoint
   * Tries both Bearer and direct token formats
   */
  private async fetchEndpoint(url: string, label: string, appendQueryParams: boolean = true): Promise<any> {
    // Try direct token first (as per plugin code), then Bearer format
    const authHeaders = [
      this.apiKey, // Direct token (as used in plugin)
      `Bearer ${this.apiKey}` // Standard Bearer format
    ];

    for (const authHeader of authHeaders) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept-Language': 'en-US,en',
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200) {
          const data: any = await response.json();
          return data.data || data;
        } else if (response.status === 401) {
          // Try next auth format
          continue;
        } else {
          const errorText = await response.text();
          throw new Error(`[${label}] HTTP ${response.status}: ${errorText}`);
        }
      } catch (error) {
        // If it's not a 401, rethrow
        if (error instanceof Error && !error.message.includes('401')) {
          throw error;
        }
        // Otherwise try next auth format
        continue;
      }
    }

    throw new Error(`[${label}] Authentication failed with both token formats`);
  }

  /**
   * Update API key
   */
  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Debug: Fetch and return raw API responses to see what data is available
   */
  async debugFetchRaw(): Promise<{ quotaLimit: any; modelUsage: any; toolUsage: any; modelUsage7Day: any }> {
    const now = new Date();

    // 24-hour window (same as official plugin)
    const start24h = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, now.getHours(), 0, 0, 0);
    const end24h = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 59, 59, 999);

    // 7-day window
    const start7d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
    const end7d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const queryParams24h = `?startTime=${encodeURIComponent(this.formatDateTime(start24h))}&endTime=${encodeURIComponent(this.formatDateTime(end24h))}`;
    const queryParams7d = `?startTime=${encodeURIComponent(this.formatDateTime(start7d))}&endTime=${encodeURIComponent(this.formatDateTime(end7d))}`;

    const results = {
      quotaLimit: null as any,
      modelUsage: null as any,
      toolUsage: null as any,
      modelUsage7Day: null as any
    };

    try {
      results.quotaLimit = await this.fetchEndpointRaw(`${this.baseUrl}/api/monitor/usage/quota/limit`);
    } catch (e) {
      results.quotaLimit = { error: e instanceof Error ? e.message : 'Unknown error' };
    }

    try {
      results.modelUsage = await this.fetchEndpointRaw(`${this.baseUrl}/api/monitor/usage/model-usage${queryParams24h}`);
    } catch (e) {
      results.modelUsage = { error: e instanceof Error ? e.message : 'Unknown error' };
    }

    try {
      results.toolUsage = await this.fetchEndpointRaw(`${this.baseUrl}/api/monitor/usage/tool-usage${queryParams24h}`);
    } catch (e) {
      results.toolUsage = { error: e instanceof Error ? e.message : 'Unknown error' };
    }

    try {
      results.modelUsage7Day = await this.fetchEndpointRaw(`${this.baseUrl}/api/monitor/usage/model-usage${queryParams7d}`);
    } catch (e) {
      results.modelUsage7Day = { error: e instanceof Error ? e.message : 'Unknown error' };
    }

    return results;
  }

  /**
   * Fetch raw response from endpoint (for debugging)
   */
  private async fetchEndpointRaw(url: string): Promise<any> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': this.apiKey,
        'Accept-Language': 'en-US,en',
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      return await response.json();
    } else {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  }
}
