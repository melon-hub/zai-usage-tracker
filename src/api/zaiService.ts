export interface UsageData {
  // 5-hour rolling window quota (token-based)
  current5HourTokens: number;   // Tokens used in 5-hour window
  limit5HourTokens: number;     // Token limit (e.g., 800M)
  percentage5Hour: number;      // Percentage used
  quotaResetTime?: Date;
  // 7-day stats
  sevenDayPrompts: number;
  sevenDayTokens: number;
  // 30-day stats (approximate "all time")
  thirtyDayPrompts: number;
  thirtyDayTokens: number;
  // Metadata
  lastUpdated: Date;
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

export interface FetchResult {
  success: boolean;
  data?: UsageData;
  error?: string;
}

interface QuotaLimitResponse {
  limits?: Array<{
    type: string;
    percentage: number;
    currentValue?: number;
    usage?: number;
    limit?: number;
    usageDetails?: any;
  }>;
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
  private planLimit: number;
  private baseUrl = 'https://api.z.ai';

  constructor(apiKey: string, planLimit: number) {
    this.apiKey = apiKey;
    this.planLimit = planLimit;
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

      const formatDateTime = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      // Time windows for different stats
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const start7d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      const start30d = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0, 0);

      const queryParams7d = `?startTime=${encodeURIComponent(formatDateTime(start7d))}&endTime=${encodeURIComponent(formatDateTime(end))}`;
      const queryParams30d = `?startTime=${encodeURIComponent(formatDateTime(start30d))}&endTime=${encodeURIComponent(formatDateTime(end))}`;

      // Fetch all endpoints in parallel
      const [quotaLimitResult, modelUsage7dResult, modelUsage30dResult] = await Promise.allSettled([
        this.fetchEndpoint(`${this.baseUrl}/api/monitor/usage/quota/limit`, 'Quota limit'),
        this.fetchEndpoint(`${this.baseUrl}/api/monitor/usage/model-usage${queryParams7d}`, '7-day usage'),
        this.fetchEndpoint(`${this.baseUrl}/api/monitor/usage/model-usage${queryParams30d}`, '30-day usage')
      ]);

      // Initialize values
      let current5HourTokens = 0;
      let limit5HourTokens = 800000000; // 800M default
      let percentage5Hour = 0;
      let sevenDayPrompts = 0;
      let sevenDayTokens = 0;
      let thirtyDayPrompts = 0;
      let thirtyDayTokens = 0;

      // Process quota limit response (5-hour token quota)
      if (quotaLimitResult.status === 'fulfilled' && quotaLimitResult.value) {
        const quotaData = quotaLimitResult.value as QuotaLimitResponse;
        if (quotaData.limits) {
          for (const limit of quotaData.limits) {
            if (limit.type === 'TOKENS_LIMIT') {
              percentage5Hour = limit.percentage || 0;
              if (limit.currentValue !== undefined) {
                current5HourTokens = limit.currentValue;
              }
              if (limit.usage !== undefined) {
                limit5HourTokens = limit.usage;
              }
            }
          }
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
          current5HourTokens,
          limit5HourTokens,
          percentage5Hour,
          sevenDayPrompts,
          sevenDayTokens,
          thirtyDayPrompts,
          thirtyDayTokens,
          lastUpdated: new Date(),
          connectionStatus: 'connected'
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
   * Update plan limit
   */
  updatePlanLimit(planLimit: number): void {
    this.planLimit = planLimit;
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

    const formatDateTime = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const queryParams24h = `?startTime=${encodeURIComponent(formatDateTime(start24h))}&endTime=${encodeURIComponent(formatDateTime(end24h))}`;
    const queryParams7d = `?startTime=${encodeURIComponent(formatDateTime(start7d))}&endTime=${encodeURIComponent(formatDateTime(end7d))}`;

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
