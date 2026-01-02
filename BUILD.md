# Build Instructions

## Quick Build

Open PowerShell in this directory and run:

```powershell
npm run compile
vsce package
```

This will create `zai-usage-tracker-0.0.5.vsix` in the current directory.

## If Compilation Fails

1. Check for TypeScript errors:
   ```powershell
   npx tsc --noEmit
   ```

2. Clean and rebuild:
   ```powershell
   Remove-Item -Recurse -Force out
   npm run compile
   ```

3. Package:
   ```powershell
   vsce package --allow-missing-repository
   ```

## Installation

After building, install the `.vsix` file in Cursor:
1. Open Cursor
2. Extensions → Install from VSIX...
3. Select `zai-usage-tracker-0.0.5.vsix`

