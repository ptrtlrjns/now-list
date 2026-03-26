import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { listFiles, readTodoFile, updateItemStatus } from '../file-ops.js';

const TEST_DIR = path.join(import.meta.dirname, 'tmp-test-dir');
const FIXTURE_PATH = path.join(import.meta.dirname, 'fixtures', 'sample-todo.json');

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('listFiles', () => {
  it('returns only .json files sorted by mtime descending', () => {
    fs.writeFileSync(path.join(TEST_DIR, 'old.json'), '{}');
    const oldStat = Date.now() - 2000;
    fs.utimesSync(path.join(TEST_DIR, 'old.json'), oldStat / 1000, oldStat / 1000);

    fs.writeFileSync(path.join(TEST_DIR, 'new.json'), '{}');
    fs.writeFileSync(path.join(TEST_DIR, 'ignore.txt'), 'not json');

    const files = listFiles(TEST_DIR);
    expect(files).toEqual(['new.json', 'old.json']);
  });

  it('returns empty array for empty directory', () => {
    const files = listFiles(TEST_DIR);
    expect(files).toEqual([]);
  });
});

describe('readTodoFile', () => {
  it('reads and parses a JSON todo file', () => {
    const data = readTodoFile(FIXTURE_PATH);
    expect(data.title).toBe('Sample Todo List');
    expect(data.groups).toHaveLength(2);
    expect(data.groups[0].items[0].status).toBe('done');
  });
});

describe('updateItemStatus', () => {
  it('updates the status of an item by id and writes to disk', () => {
    const filePath = path.join(TEST_DIR, 'test.json');
    fs.copyFileSync(FIXTURE_PATH, filePath);

    updateItemStatus(filePath, 2, 'done');

    const updated = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const item = updated.groups[0].items.find(i => i.id === 2);
    expect(item.status).toBe('done');
  });

  it('does not modify other items', () => {
    const filePath = path.join(TEST_DIR, 'test.json');
    fs.copyFileSync(FIXTURE_PATH, filePath);

    updateItemStatus(filePath, 2, 'done');

    const updated = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const item1 = updated.groups[0].items.find(i => i.id === 1);
    expect(item1.status).toBe('done');
    const item3 = updated.groups[1].items.find(i => i.id === 3);
    expect(item3.status).toBe('pending');
  });

  it('throws if item id not found', () => {
    const filePath = path.join(TEST_DIR, 'test.json');
    fs.copyFileSync(FIXTURE_PATH, filePath);

    expect(() => updateItemStatus(filePath, 999, 'done')).toThrow('Item 999 not found');
  });
});
