const fs = require('fs');
const path = require('path');

function listFiles(dirPath) {
  const entries = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.json'));

  return entries
    .map(f => ({
      name: f,
      mtime: fs.statSync(path.join(dirPath, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .map(f => f.name);
}

function readTodoFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function updateItemStatus(filePath, itemId, newStatus) {
  const data = readTodoFile(filePath);

  let found = false;
  for (const group of data.groups) {
    for (const item of group.items) {
      if (item.id === itemId) {
        item.status = newStatus;
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    throw new Error(`Item ${itemId} not found`);
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

module.exports = { listFiles, readTodoFile, updateItemStatus };
