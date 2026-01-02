# Changelog

## [1.0.2] - 2026-01-03

### Added
- **Marketplace badges**: Added VS Code Marketplace and Open VSX badges to readme
- **CLAUDE.md**: Added development and publishing workflow documentation
- **Installation docs**: Updated readme with instructions for VS Code, Windsurf, Cursor

### Changed
- **Support section**: Added GitHub issues link for bug reports

## [1.0.1] - 2026-01-02

### Security
- **Removed debug files from package**: Debug output files no longer bundled in .vsix
- **Removed deprecated apiKey config**: API key setting removed from package.json (uses SecretStorage only)
- **Redacted API key in debug output**: Debug script no longer writes partial API key to file

## [1.0.0] - 2026-01-02

### 🎉 First Stable Release

- **Status Bar**: Shows 5-hour token quota percentage and current tokens used
- **Tooltip**: Hover for quick stats (quota, 7-day, 30-day usage)
- **Quick Pick Menu**: Click for detailed stats and actions
- **Secure Storage**: API key stored in VS Code's encrypted SecretStorage
- **Auto Refresh**: Configurable refresh interval (default 5 minutes)

### Fixed (from 0.0.8)
- **API Response Parsing**: Fixed nested `totalUsage` object access for model-usage endpoint
  - 7-day and 30-day stats now correctly display prompts and tokens

## [0.0.7] - 2026-01-02

### Changed
- **Corrected Data Model**: Updated to match actual Z.ai API structure
  - 5-hour quota is **token-based** (800M limit), not prompt-based
  - `current5HourTokens` / `limit5HourTokens` / `percentage5Hour` for quota
  - `sevenDayPrompts` / `sevenDayTokens` for 7-day stats
  - `thirtyDayPrompts` / `thirtyDayTokens` for 30-day stats
- **Status Bar**: Now shows `✓ ⚡ 1% • 14.6K tokens` format
- **Tooltip**: Shows token quota with progress bar, plus 7-day and 30-day stats

## [0.0.6] - 2026-01-02

### Removed
- **Webview Panel**: Removed in favor of simpler UX
  - Users found the panel "annoying in the client"

### Changed
- **New UX Design**: Status bar + Tooltip + Quick Pick menu
  - Hover for quick stats tooltip
  - Click for detailed Quick Pick menu with stats and actions
- **Cleaner Interface**:
  - Tooltip shows 5-hour quota, 7-day stats, 30-day stats
  - Quick Pick shows same data in menu format with Refresh/Configure actions

### Added
- **Debug Command**: `zaiUsage.debug` to view raw API responses in output panel
- **Debug Script**: `debug-api.mjs` for command-line API testing

## [0.0.5] - 2025-12-31

### Added
- **Beautiful Webview Panel**: Replaced tooltip with a modern, interactive webview panel
  - Click status bar to open detailed usage overlay
  - Modern card-based design with progress bars
  - Color-coded progress indicators (green/yellow/red)
  - Responsive layout with grid statistics
- **Refresh Button in Panel**: Interactive refresh button with loading spinner
  - Click refresh button in panel to update data
  - Shows "Refreshing..." state with spinner animation
  - No more "Click to refresh" text - replaced with button
- **Improved Visual Design**:
  - Clean, modern card-based layout
  - Better spacing and typography
  - Status badges with icons
  - Gradient progress bars
  - Professional color scheme matching VS Code theme

### Changed
- Status bar now opens webview panel instead of showing tooltip
- Tooltip simplified to quick preview
- Panel automatically updates when data refreshes
- Better visual hierarchy and information organization

### Fixed
- Panel stays in sync with status bar updates
- Refresh state properly managed in panel

## [0.0.4] - 2025-12-31

### Added
- **Token Usage Display**: Now shows token usage alongside prompt usage
  - 5-hour token quota with percentage
  - Total tokens used
  - 7-day token usage
  - Displayed in tooltip with progress bars
- **Improved API Key Input**:
  - Better validation (checks for empty/short keys)
  - Instructions with link to get API key
  - Masked preview after saving (shows first 4 and last 4 characters)
  - "Test Connection" option after saving
  - Better error messages and user feedback
  - Masked display in configuration menu

### Changed
- Tooltip now shows both prompts and tokens separately
- API key display shows masked version (e.g., `sk-1...xyz9`)
- Enhanced user experience for API key configuration

## [0.0.3] - 2025-12-31

### Fixed
- **REAL API ENDPOINTS**: Now uses official Z.ai monitor API endpoints discovered from glm-plan-usage plugin
  - `/api/monitor/usage/model-usage` - Model usage statistics
  - `/api/monitor/usage/tool-usage` - Tool usage statistics  
  - `/api/monitor/usage/quota/limit` - Quota limits and current usage
- **Authentication**: Supports both direct token and Bearer token formats
- **Real Usage Data**: Now fetches actual usage from Z.ai API, not just local tracking
- **5-Hour Quota**: Correctly calculates from quota limit percentage

### Changed
- Completely rewrote API service to use official endpoints
- Removed old endpoint guessing logic
- Improved error handling for authentication failures

## [0.0.2] - 2025-12-31

### Added
- **7-Day Usage Tracking**: Shows usage over the last 7 days (when available from API)
- **Connection Status Indicator**: ✓ Connected, ⚠ Offline, or ✗ Error status in tooltip
- **Plan Tier Prompt**: Automatically prompts for plan tier after API key is configured
- **Visible Prompts**: Changed to Warning messages for better visibility (⚠️)
- **Quick Configuration**: "Configure Plan Tier" button shown after saving API key

### Fixed
- **Status bar visibility**: Extension now always shows in status bar, even when not configured
- **API key security**: Now uses VS Code SecretStorage for secure API key storage instead of plain settings
- **Configuration prompt**: Added proper prompt when API key is missing, with clear messaging about secure storage
- **Migration**: Automatically migrates API key from settings to SecretStorage on update

### Changed
- Status bar shows connection status icon (✓/⚠/✗) along with usage
- Status bar shows "Configure API Key" when not configured
- Status bar command updated to show quick pick menu on click
- Enhanced error handling and user feedback
- Tooltip now includes 7-day usage and connection status

## [0.0.1] - 2025-12-31

### Added
- Initial release
- Status bar usage indicator
- 5-hour quota tracking
- Total usage tracking
- Color-coded usage levels (green/yellow/red)
- Configurable refresh interval
- Multiple plan tier support (lite/pro/max)
- API endpoint discovery
- Local tracking fallback
- Quick actions menu
- Configuration wizard

