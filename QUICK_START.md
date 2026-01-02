# Quick Start Guide - Z.ai GLM Usage Tracker

## Installation

1. **Install the extension:**
   - Open VS Code/Cursor
   - Go to Extensions → Install from VSIX...
   - Select `zai-usage-tracker-0.0.1.vsix`

2. **Configure your API key:**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Configure Settings" and select "Z.ai Usage Tracker: Configure Settings"
   - Or manually edit settings:
     ```json
     {
       "zaiUsage.apiKey": "your-api-key-here"
     }
     ```

3. **Set your plan tier (optional):**
   - Default: Lite (~120 prompts/5h)
   - Change to "pro" (~600/5h) or "max" (~2400/5h) if needed:
     ```json
     {
       "zaiUsage.planTier": "pro"
     }
     ```

## Usage

Once configured, you'll see a status bar item at the bottom left:

```
$(zap) 45/120 (38%)
```

**Meaning:**
- `$(zap)`: Lightning bolt icon
- `45/120`: 45 prompts used out of 120 quota
- `(38%)`: Percentage of quota used

**Color coding:**
- 🟢 Green: < 50% quota used
- 🟡 Yellow: 50-80% quota used
- 🔴 Red: > 80% quota used

## Interacting

- **Hover** over the status bar to see detailed information
- **Click** the status bar to see quick actions:
  - Refresh Usage
  - Configure Settings
- Press `Ctrl+Shift+P` and search for "Z.ai Usage Tracker" commands

## Commands

- `Z.ai Usage Tracker: Refresh Usage` - Manually refresh usage data
- `Z.ai Usage Tracker: Configure Settings` - Open configuration menu

## Troubleshooting

### "API key not configured"
You need to set your Z.ai API key in settings:
```json
{
  "zaiUsage.apiKey": "your-api-key-here"
}
```

### "Failed to fetch usage"
- Check your internet connection
- Verify your API key is valid
- Try clicking "Retry" in the error message
- The extension will automatically fall back to local tracking

### "Using local tracking"
This is normal if Z.ai doesn't provide a public usage API. The extension will track usage locally within this VS Code instance.

## Testing API Endpoints

To test which Z.ai API endpoints work with your key:

```bash
node test-api.js YOUR_API_KEY
```

This will help identify if there's a working API endpoint for usage data.

## Support

For more information, see:
- [Full README](README.md)
- [Z.ai Documentation](https://docs.z.ai/devpack/overview)

