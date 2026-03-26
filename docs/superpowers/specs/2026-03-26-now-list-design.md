# Now List — Design Spec

## Overview

A lightweight Electron desktop app for tracking throwaway todo lists. An AI agent (Claude) writes JSON files to a known directory. The app watches that directory, displays the lists as interactive checklists, and writes status changes back to the same JSON files. When a list is done, the user deletes the file.

## Architecture

### Components

1. **Main process (Node.js)** — watches `~/.now-list/` for JSON files, handles file read/write via IPC
2. **Renderer (single HTML page)** — vanilla JS + CSS, no framework, no build step. Displays the UI.
3. **JSON files in `~/.now-list/`** — the data store. Each file is one todo list.

### Why vanilla JS (no React)

This is a status-toggling viewer, not a dynamic application. The entire UI is: list files, render checkboxes, toggle status. A framework adds build complexity with no benefit.

## JSON Format

```json
{
  "title": "Stripe Integration",
  "created": "2026-03-26",
  "groups": [
    {
      "name": "Before Testing",
      "items": [
        { "id": 1, "text": "Run npm run db:reset to apply the migration", "status": "pending" },
        { "id": 2, "text": "Create Stripe account", "status": "done" }
      ]
    }
  ]
}
```

### Statuses

| Status    | Meaning                        | Visual           |
|-----------|--------------------------------|-------------------|
| `pending` | Not started                    | Empty circle      |
| `done`    | Completed                      | Green checkmark   |
| `skipped` | Intentionally skipped          | Gray dash         |
| `blocked` | Can't proceed, waiting on something | Red/orange stop |

Click an item's status icon to cycle: pending -> done -> skipped -> blocked -> pending.

## UI Design

### Layout

- **Sidebar** (left): lists all JSON files found in `~/.now-list/`, sorted by modification date (newest first). Shows file title and item count/progress.
- **Main area** (right): displays the selected file's groups and items.

### Main Area

- File title at the top
- Each group rendered as a section with a header and progress bar (e.g., "3/5 done")
- Each item shows: status icon (clickable) + item text
- Items with status `done` get a subtle strikethrough
- Items with status `skipped` get dimmed text
- Items with status `blocked` get an orange/red accent

### Theme

- Dark theme only (dark background, light text, subtle borders)
- Monospace or system font

## File Watching

- Main process uses `fs.watch` on `~/.now-list/` to detect new/changed/removed files
- On change, main process reads the directory listing and notifies the renderer via IPC
- Renderer requests file contents via IPC when selecting a file
- On status toggle, renderer sends the update via IPC, main process writes the JSON file

### IPC Channels

| Channel             | Direction         | Payload                        |
|---------------------|-------------------|--------------------------------|
| `list-files`        | renderer -> main  | (none)                         |
| `files-changed`     | main -> renderer  | `string[]` (filenames)         |
| `read-file`         | renderer -> main  | `string` (filename)            |
| `file-contents`     | main -> renderer  | `object` (parsed JSON)         |
| `update-item`       | renderer -> main  | `{ filename, groupIndex, itemId, status }` |

## Directory

The watched directory is `~/.now-list/`. The app creates it on first launch if it doesn't exist.

This is also the directory Claude should write JSON files to. Claude can be instructed to write to `~/.now-list/<name>.json` when generating a todo list.

## Packaging

- Use `electron-builder` to produce a `.app` bundle for macOS
- App name: "Now List"
- Single-click launch from Finder or Dock

## Out of Scope

- Multi-user / sync
- Reordering items
- Creating or editing items in the app (Claude does that)
- Notes or comments on items
- Due dates, priorities, assignments
- Light theme
- Non-macOS builds (for now)
