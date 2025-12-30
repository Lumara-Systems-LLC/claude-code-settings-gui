# Screenshot Guide

Capture these screenshots for the README. Use a clean browser window at 1280x800.

## Required Screenshots

### 1. `dashboard.png`
- Navigate to `/` (home page)
- Show the full dashboard with stats cards, quick actions, and storage chart
- **Dark mode preferred** for visual appeal

### 2. `skills-editor.png`
- Navigate to `/skills`
- Click into a skill like `commit` or `debug`
- Show the split view with editor on left, preview on right

### 3. `settings-editor.png`
- Navigate to `/settings-json`
- Show the Permissions tab with some allow/deny patterns
- Make sure the tab bar is visible

### 4. `hook-metrics.png`
- Navigate to `/hooks`
- Show the metrics dashboard with charts
- Include the hook list with success/failure indicators

### 5. `storage.png`
- Navigate to `/storage`
- Show the pie chart and directory breakdown
- Include the cleanup panel

### 6. `git.png`
- Navigate to `/git`
- Have some modified files staged
- Show the commit form

### 7. `rules.png`
- Navigate to `/rules`
- Show the list with core rules and path-specific rules separated

### 8. `agents.png`
- Navigate to `/agents`
- Show the agent cards with model badges

## Tips

1. **Browser**: Use Chrome DevTools to set exact viewport (1280x800)
2. **Dark mode**: Toggle to dark mode for more striking screenshots
3. **Clean data**: Make sure there's real content to show (not empty states)
4. **Crop**: Remove browser chrome, just the app content
5. **Format**: PNG for crisp text, optimize with `pngquant` or similar

## Quick Capture Script

```bash
# On macOS, use screencapture
screencapture -R0,0,1280,800 dashboard.png

# On Linux, use gnome-screenshot or flameshot
flameshot gui
```

## After Capturing

1. Place all `.png` files in this directory
2. Verify README images render correctly
3. Consider creating a short GIF for the hero section
