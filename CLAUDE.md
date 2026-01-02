# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Z.ai GLM Usage Tracker - A VS Code/Cursor extension to monitor Z.ai API usage in the status bar.

**Publisher:** melon-hub

## Published Locations

| Platform | URL | Used By |
|----------|-----|---------|
| VS Code Marketplace | https://marketplace.visualstudio.com/items?itemName=melon-hub.zai-usage-tracker | VS Code |
| Open VSX | https://open-vsx.org/extension/melon-hub/zai-usage-tracker | Windsurf, VSCodium, other forks |
| GitHub | https://github.com/melon-hub/zai-usage-tracker | Source code |

**Note:** Cursor uses a curated marketplace - requires manual VSIX install.

## Publishing Updates

### Prerequisites
Tokens are stored securely in home directory:
- `~/.vsce-token` - VS Code Marketplace PAT
- `~/.ovsx-token` - Open VSX token

### SECURITY: Never grep or cat these token files directly!
Use command substitution: `$(cat ~/.vsce-token)`

### Publishing Workflow

1. **Update version** in `package.json`

2. **Update changelog.md** with changes

3. **Commit and push to GitHub:**
   ```bash
   git add -A && git commit -m "v1.x.x - description" && git push
   ```

4. **Publish to VS Code Marketplace:**
   ```bash
   export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 20
   npx vsce publish -p $(cat ~/.vsce-token)
   ```

5. **Publish to Open VSX:**
   ```bash
   npx ovsx publish -p $(cat ~/.ovsx-token)
   ```

### Quick one-liner (after nvm setup):
```bash
npx vsce publish -p $(cat ~/.vsce-token) && npx ovsx publish -p $(cat ~/.ovsx-token)
```

## Development Commands

```bash
# Setup Node 20 (required for vsce)
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 20

# Compile TypeScript
npm run compile

# Watch mode
npm run watch

# Package without publishing
npx vsce package

# Lint
npm run lint
```

## Project Structure

```
zai-usage-tracker/
├── src/
│   ├── extension.ts          # Entry point
│   ├── api/
│   │   └── zaiService.ts     # Z.ai API client
│   ├── config/
│   │   └── configuration.ts  # Settings management
│   └── statusBar/
│       └── usageIndicator.ts # Status bar UI
├── out/                       # Compiled JS (gitignored)
├── package.json               # Extension manifest
├── .vscodeignore             # Files excluded from VSIX
└── .gitignore                # Files excluded from git
```

## Token Management

### Creating new tokens:

**VS Code Marketplace:**
1. https://dev.azure.com → Profile → Personal access tokens
2. New Token → Scopes: Marketplace > Manage
3. Save: `echo "TOKEN" > ~/.vsce-token && chmod 600 ~/.vsce-token`

**Open VSX:**
1. https://open-vsx.org → Profile → Access Tokens
2. Create token
3. Save: `echo "TOKEN" > ~/.ovsx-token && chmod 600 ~/.ovsx-token`

### Verifying tokens (without exposing):
```bash
# Check file exists
[ -f ~/.vsce-token ] && echo "VSCE token: $(wc -c < ~/.vsce-token) bytes"
[ -f ~/.ovsx-token ] && echo "OVSX token: $(wc -c < ~/.ovsx-token) bytes"

# Verify VSCE token works
npx vsce verify-pat melon-hub -p $(cat ~/.vsce-token)
```

## Security Notes

- Never commit tokens to git
- Never grep/cat token files in shared sessions
- Token files should have 600 permissions
- Revoke and regenerate tokens if exposed
- All debug files are in .gitignore

## WSL Environment

- Running in WSL on Windows
- Requires Node 20+ for vsce (use nvm)
- Git config: user.name = "melon-hub", user.email = "melon-hub@users.noreply.github.com"
