# Z.ai GLM Usage Tracker

A VS Code / Cursor extension that tracks your Z.ai GLM Coding Plan usage and displays it in the status bar.

## Features

- **Real-time Usage Display**: See your 5-hour token quota directly in the status bar
  - Shows percentage used and current tokens
  - Example: `✓ ⚡ 1% • 14.6K tokens
    
- **Detailed Tooltip**: Hover to see comprehensive usage stats:
  - 5-hour token quota with progress bar
  - 7-day usage (prompts + tokens)
  - 30-day usage (prompts + tokens)
  - Connection status and last update time
    
- **Quick Pick Menu**: Click status bar for detailed stats and actions
  - View all usage metrics
  - Refresh usage data
  - Configure settings
    
- **Automatic Refresh**: Configurable refresh interval (default: 5 minutes)
  
- **Secure API Key Storage**: Uses VS Code's encrypted SecretStorage

## Installation

1. Download the latest `.vsix` file from releases
2. In VS Code/Cursor, go to Extensions → `...` menu → Install from VSIX
3. Select the downloaded `zai-usage-tracker-x.x.x.vsix` file
4. Reload VS Code when prompted

### Building from Source

```bash
npm install
npm run compile
npx @vscode/vsce package
```

## Configuration

### API Key

You need a Z.ai API key to use this extension:

1. Go to [Z.ai API Key Management](https://z.ai/manage-apikey/apikey-list)
2. Create or copy your API key
3. Click the status bar item or run command `Z.ai Usage Tracker: Configure Settings`
4. Select "Update API Key" and paste your key
5. Your key is stored securely in VS Code's encrypted storage

### Plan Tier

Set your GLM Coding Plan tier:

```json
{
  "zaiUsage.planTier": "lite"  // Options: "lite", "pro", "max"
}
```

- **Lite**: ~120 prompts every 5 hours
- **Pro**: ~600 prompts every 5 hours
- **Max**: ~2400 prompts every 5 hours

### Refresh Interval

Set how often to fetch usage data (in minutes):

```json
{
  "zaiUsage.refreshInterval": 5
}
```

Minimum: 1 minute, Default: 5 minutes

## Usage

Once configured, the extension will:

1. Automatically activate when VS Code/Cursor starts
2. Display usage in the status bar: `$(zap) 45/120 (38%)`
3. Update periodically based on your refresh interval
4. Show detailed tooltip on hover
5. Provide quick actions on click:
   - Refresh Usage
   - Configure Settings

## Commands

- `zaiUsage.refresh`: Manually refresh usage data
- `zaiUsage.configure`: Open configuration menu
- `zaiUsage.showMenu`: Show quick actions menu

## Status Bar Display

The status bar shows:
- **Connection Status**: ✓ (connected) or ⚠ (offline/error)
- **Icon**: Lightning bolt ⚡
- **Percentage**: 5-hour token quota percentage (e.g., 1%)
- **Tokens**: Current tokens used (e.g., 14.6K tokens)

Example: `✓ ⚡ 1% • 14.6K tokens`

Background color indicates usage level:
- Normal background: < 80% quota used
- Warning background: ≥ 80% quota used

## Development

### Compile

```bash
npm run compile
```

### Watch mode

```bash
npm run watch
```

### Package

```bash
npm install -g vsce
vsce package
```

### Test API Endpoints

The extension tries multiple Z.ai API endpoints to fetch usage data. To test endpoints manually:

```bash
node test-api.js YOUR_API_KEY
```

## How It Works

1. **API Service**: Attempts to fetch usage data from Z.ai's API endpoints
2. **Fallback**: If no API endpoint is available, uses local tracking
3. **Configuration**: Stores API key and settings in VS Code configuration
4. **Display**: Updates status bar with current usage and progress
5. **Refresh**: Periodically fetches updated data (configurable interval)

## API Endpoints

The extension uses the official Z.ai monitor API endpoints:

- `https://api.z.ai/api/monitor/usage/quota/limit` - 5-hour token quota
- `https://api.z.ai/api/monitor/usage/model-usage` - Model usage stats (with time range)

### Debugging

Run the debug command to see raw API responses:
- Command: `Z.ai Usage Tracker: Debug: Show Raw API Responses`
- Or run from terminal: `node debug-api.mjs YOUR_API_KEY`

## Privacy

- Your API key is stored securely in VS Code's encrypted SecretStorage
- Usage data is only fetched from Z.ai's official API
- No personal data or code is sent to external services
- All data processing happens locally

## Troubleshooting

### "API key not configured"

- Click the status bar item and select "Update API Key"
- Or use `Ctrl+Shift+P` → "Z.ai Usage Tracker: Configure Settings"

### "Failed to fetch usage"

- Check your internet connection
- Verify your API key is valid at [z.ai/manage-apikey](https://z.ai/manage-apikey/apikey-list)
- Try clicking "Retry" in the error message
- Run the debug command to see raw API responses

## License

MIT

## Support

For issues or questions:
- Check the [Z.ai Documentation](https://docs.z.ai/devpack/overview)
- Review this extension's source code
- Contact Z.ai support for API-related questions


