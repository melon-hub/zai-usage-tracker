# Z.AI Usage Monitoring API Documentation

> **Status**: ✅ Verified (2026-02-21)  
> **Base URL**: `https://api.z.ai`  
> **API Type**: Internal/Private (from zai-org/zai-coding-plugins)

## Authentication

All endpoints require Bearer token authentication via the `Authorization` header:

```http
Authorization: your-api-key-here
```

## Common Headers

```http
Authorization: {API_KEY}
Content-Type: application/json
Accept-Language: en-US,en
```

---

## 1. Model Usage Query

Query model call counts and token usage over a time range.

### Endpoint

```
GET /api/monitor/usage/model-usage
```

### Query Parameters

| Parameter   | Type   | Required | Format                | Description               |
| ----------- | ------ | -------- | --------------------- | ------------------------- |
| `startTime` | string | Yes      | `yyyy-MM-dd HH:mm:ss` | Start time of query range |
| `endTime`   | string | Yes      | `yyyy-MM-dd HH:mm:ss` | End time of query range   |

### Example Request

```http
GET /api/monitor/usage/model-usage?startTime=2026-02-20%2020%3A00%3A00&endTime=2026-02-21%2020%3A59%3A59
Authorization: your-api-key-here
Accept-Language: en-US,en
```

### Example Response

```json
{
  "code": 200,
  "msg": "Operation successful",
  "data": {
    "x_time": [
      "2026-02-20 20:00",
      "2026-02-20 21:00",
      "2026-02-20 22:00"
    ],
    "modelCallCount": [
      137,
      36,
      79
    ],
    "tokensUsage": [
      4689148,
      1343019,
      3506363
    ],
    "totalUsage": {
      "totalModelCallCount": 1227,
      "totalTokensUsage": 45867924
    }
  },
  "success": true
}
```

### Response Fields

| Field                                 | Type             | Description                            |
| ------------------------------------- | ---------------- | -------------------------------------- |
| `code`                                | number           | HTTP status code                       |
| `msg`                                 | string           | Response message                       |
| `success`                             | boolean          | Whether the request succeeded          |
| `data.x_time`                         | string[]         | Array of hourly timestamps             |
| `data.modelCallCount`                 | (number\|null)[] | Model calls per hour (null if no data) |
| `data.tokensUsage`                    | (number\|null)[] | Tokens used per hour (null if no data) |
| `data.totalUsage.totalModelCallCount` | number           | Total model calls in time range        |
| `data.totalUsage.totalTokensUsage`    | number           | Total tokens used in time range        |

---

## 2. Tool Usage Query

Query MCP tool usage (network search, web reader, zread) over a time range.

### Endpoint

```
GET /api/monitor/usage/tool-usage
```

### Query Parameters

| Parameter   | Type   | Required | Format                | Description               |
| ----------- | ------ | -------- | --------------------- | ------------------------- |
| `startTime` | string | Yes      | `yyyy-MM-dd HH:mm:ss` | Start time of query range |
| `endTime`   | string | Yes      | `yyyy-MM-dd HH:mm:ss` | End time of query range   |

### Example Request

```http
GET /api/monitor/usage/tool-usage?startTime=2026-02-20%2020%3A00%3A00&endTime=2026-02-21%2020%3A59%3A59
Authorization: your-api-key-here
Accept-Language: en-US,en
```

### Example Response

```json
{
  "code": 200,
  "msg": "Operation successful",
  "data": {
    "x_time": [
      "2026-02-20 20:00",
      "2026-02-20 21:00",
      "2026-02-20 22:00"
    ],
    "networkSearchCount": [null, null, null],
    "webReadMcpCount": [null, null, null],
    "zreadMcpCount": [null, null, null],
    "totalUsage": {
      "totalNetworkSearchCount": 0,
      "totalWebReadMcpCount": 0,
      "totalZreadMcpCount": 0,
      "totalSearchMcpCount": 0,
      "toolDetails": []
    }
  },
  "success": true
}
```

### Response Fields

| Field                                     | Type             | Description                   |
| ----------------------------------------- | ---------------- | ----------------------------- |
| `code`                                    | number           | HTTP status code              |
| `msg`                                     | string           | Response message              |
| `success`                                 | boolean          | Whether the request succeeded |
| `data.x_time`                             | string[]         | Array of hourly timestamps    |
| `data.networkSearchCount`                 | (number\|null)[] | Network search calls per hour |
| `data.webReadMcpCount`                    | (number\|null)[] | Web reader MCP calls per hour |
| `data.zreadMcpCount`                      | (number\|null)[] | Zread MCP calls per hour      |
| `data.totalUsage.totalNetworkSearchCount` | number           | Total network search calls    |
| `data.totalUsage.totalWebReadMcpCount`    | number           | Total web reader calls        |
| `data.totalUsage.totalZreadMcpCount`      | number           | Total zread calls             |
| `data.totalUsage.totalSearchMcpCount`     | number           | Total search MCP calls        |
| `data.totalUsage.toolDetails`             | array            | Detailed tool usage breakdown |

---

## 3. Quota Limit Query

Query account quota limits and current usage percentages. This endpoint does not require time parameters.

### Endpoint

```
GET /api/monitor/usage/quota/limit
```

### Query Parameters

None required.

### Example Request

```http
GET /api/monitor/usage/quota/limit
Authorization: your-api-key-here
Accept-Language: en-US,en
```

### Example Response

```json
{
  "code": 200,
  "msg": "Operation successful",
  "data": {
    "limits": [
      {
        "type": "TOKENS_LIMIT",
        "unit": 3,
        "number": 5,
        "percentage": 0
      },
      {
        "type": "TOKENS_LIMIT",
        "unit": 6,
        "number": 1,
        "percentage": 21,
        "nextResetTime": 1772192697998
      },
      {
        "type": "TIME_LIMIT",
        "unit": 5,
        "number": 1,
        "usage": 1000,
        "currentValue": 0,
        "remaining": 1000,
        "percentage": 0,
        "nextResetTime": 1774007097985,
        "usageDetails": [
          {
            "modelCode": "search-prime",
            "usage": 0
          },
          {
            "modelCode": "web-reader",
            "usage": 0
          },
          {
            "modelCode": "zread",
            "usage": 0
          }
        ]
      }
    ],
    "level": "pro"
  },
  "success": true
}
```

### Response Fields

| Field         | Type    | Description                   |
| ------------- | ------- | ----------------------------- |
| `code`        | number  | HTTP status code              |
| `msg`         | string  | Response message              |
| `success`     | boolean | Whether the request succeeded |
| `data.limits` | array   | Array of quota limit objects  |
| `data.level`  | string  | Account level (e.g., "pro")   |

### Limit Object Fields

| Field           | Type   | Description                                                            |
| --------------- | ------ | ---------------------------------------------------------------------- |
| `type`          | string | Limit type: `TOKENS_LIMIT` or `TIME_LIMIT`                             |
| `unit`          | number | Time unit code: `3` = hour(s), `5` = month(s), `6` = week(s)           |
| `number`        | number | Quantity of the time unit (e.g., unit=3, number=5 means 5-hour window) |
| `percentage`    | number | Usage percentage (0-100)                                               |
| `nextResetTime` | number | Unix timestamp (ms) when quota resets                                  |
| `usage`         | number | Total quota allowed (TIME_LIMIT only)                                  |
| `currentValue`  | number | Current usage count (TIME_LIMIT only)                                  |
| `remaining`     | number | Remaining quota (TIME_LIMIT only)                                      |
| `usageDetails`  | array  | Per-model usage breakdown (TIME_LIMIT only)                            |

### Unit Type Mapping

| Unit Code | Time Unit | Example                                    |
| --------- | --------- | ------------------------------------------ |
| `3`       | Hour(s)   | `unit=3, number=5` → 5-hour rolling window |
| `5`       | Month(s)  | `unit=5, number=1` → 1-month quota         |
| `6`       | Week(s)   | `unit=6, number=1` → 1-week quota          |

### Limit Type Explanation

- **TOKENS_LIMIT**: Token usage quota with rolling time windows. The `unit` field defines the time unit (hour/week/month), and `number` specifies the quantity (e.g., unit=3/number=5 means a 5-hour rolling window, unit=6/number=1 means a 1-week window).
- **TIME_LIMIT**: MCP tool usage quota with fixed reset periods (e.g., monthly limit with 1000 calls).

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "code": 400,
  "msg": "Error description",
  "success": false
}
```

### Common HTTP Status Codes

| Code | Description                      |
| ---- | -------------------------------- |
| 200  | Success                          |
| 400  | Bad Request (invalid parameters) |
| 401  | Unauthorized (invalid API key)   |
| 500  | Internal Server Error            |

---

## Usage Notes

### Time Range Recommendations

1. **Model Usage & Tool Usage**: 
   - Recommended range: 24-48 hours
   - Data is returned in hourly buckets
   - Future hours may return `null` values

2. **Quota Limit**:
   - No time parameters needed
   - Returns current quota status and reset times

### Rate Limiting

No official rate limits documented, but recommended approach:
- Cache quota limit data (updates infrequently)
- Poll model/tool usage every 5-30 minutes
- Avoid excessive queries (< 1 request/second)

### Date Formatting

Always use URL-encoded format for time parameters:
```
startTime=2026-02-20%2020%3A00%3A00
```

JavaScript example:
```javascript
const startTime = '2026-02-20 20:00:00';
const encoded = encodeURIComponent(startTime);
```

---

## Integration Example

### Node.js with HTTPS

```javascript
import https from 'https';

const API_KEY = 'your-api-key-here';
const BASE_URL = 'https://api.z.ai';

function queryQuotaLimit() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/api/monitor/usage/quota/limit`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': API_KEY,
        'Accept-Language': 'en-US,en',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}
```

### TypeScript Interfaces

```typescript
// Model Usage Response
interface ModelUsageResponse {
  code: number;
  msg: string;
  success: boolean;
  data: {
    x_time: string[];
    modelCallCount: (number | null)[];
    tokensUsage: (number | null)[];
    totalUsage: {
      totalModelCallCount: number;
      totalTokensUsage: number;
    };
  };
}

// Tool Usage Response
interface ToolUsageResponse {
  code: number;
  msg: string;
  success: boolean;
  data: {
    x_time: string[];
    networkSearchCount: (number | null)[];
    webReadMcpCount: (number | null)[];
    zreadMcpCount: (number | null)[];
    totalUsage: {
      totalNetworkSearchCount: number;
      totalWebReadMcpCount: number;
      totalZreadMcpCount: number;
      totalSearchMcpCount: number;
      toolDetails: any[];
    };
  };
}

// Quota Limit Response
interface QuotaLimitResponse {
  code: number;
  msg: string;
  success: boolean;
  data: {
    limits: Array<{
      type: 'TOKENS_LIMIT' | 'TIME_LIMIT';
      unit: number;
      number: number;
      percentage: number;
      nextResetTime?: number;
      usage?: number;
      currentValue?: number;
      remaining?: number;
      usageDetails?: Array<{
        modelCode: string;
        usage: number;
      }>;
    }>;
    level: string;
  };
}
```

---

## Version History

- **2026-02-21**: Initial documentation based on `zai-org/zai-coding-plugins` v1.x
- Verified with API Key: `62e19ef7...` (redacted)
- All 3 endpoints tested and confirmed working

---

## References

- Official Plugin: https://github.com/zai-org/zai-coding-plugins
- Plugin: `glm-plan-usage` (usage query functionality)
- Source: `plugins/glm-plan-usage/skills/usage-query-skill/scripts/query-usage.mjs`
