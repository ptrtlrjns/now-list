const STATUS_CYCLE = ['pending', 'done', 'skipped', 'blocked'];
const STATUS_ICONS = {
  pending: '',
  done: '✓',
  skipped: '—',
  blocked: '!',
};

let currentFile = null;
let selectedItemId = null;
let currentData = null;
const collapsedGroups = new Set();

// --- Sidebar ---

async function loadFileList() {
  const files = await window.api.listFiles();
  renderFileList(files);
}

function renderFileList(files) {
  const list = document.getElementById('file-list');
  const emptyState = document.getElementById('empty-state');
  const todoContent = document.getElementById('todo-content');

  list.innerHTML = '';

  if (files.length === 0) {
    emptyState.style.display = 'flex';
    todoContent.style.display = 'none';
    return;
  }

  // Load metadata for each file to show title and progress
  files.forEach(async (filename) => {
    const data = await window.api.readFile(filename);
    const li = document.createElement('li');
    li.className = 'file-item' + (filename === currentFile ? ' active' : '');
    li.dataset.filename = filename;

    const totalItems = data.groups.reduce((sum, g) => sum + g.items.length, 0);
    const doneItems = data.groups.reduce(
      (sum, g) => sum + g.items.filter(i => i.status === 'done').length, 0
    );

    li.innerHTML = `
      <div class="file-item-title">${data.title}</div>
      <div class="file-item-progress">${doneItems}/${totalItems} done</div>
    `;

    li.addEventListener('click', () => selectFile(filename));
    list.appendChild(li);
  });

  // Auto-select first file if nothing selected
  if (!currentFile || !files.includes(currentFile)) {
    selectFile(files[0]);
  }
}

// --- Main Content ---

async function selectFile(filename) {
  currentFile = filename;

  // Update sidebar active state
  document.querySelectorAll('.file-item').forEach(el => {
    el.classList.toggle('active', el.dataset.filename === filename);
  });

  const data = await window.api.readFile(filename);
  renderTodo(data);
}

function renderTodo(data) {
  const emptyState = document.getElementById('empty-state');
  const todoContent = document.getElementById('todo-content');
  const title = document.getElementById('todo-title');
  const container = document.getElementById('groups-container');

  emptyState.style.display = 'none';
  todoContent.style.display = 'block';
  currentData = data;

  // Remove existing header if present
  const existingHeader = todoContent.querySelector('.todo-header');
  if (existingHeader) existingHeader.remove();

  // Create header with title and delete button
  const header = document.createElement('div');
  header.className = 'todo-header';

  const h1 = document.createElement('h1');
  h1.textContent = data.title;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = 'Delete List';
  deleteBtn.addEventListener('click', async () => {
    const files = await window.api.deleteFile(currentFile);
    currentFile = null;
    renderFileList(files);
  });

  header.appendChild(h1);
  header.appendChild(deleteBtn);
  todoContent.prepend(header);

  // Hide original title element
  title.style.display = 'none';
  container.innerHTML = '';

  data.groups.forEach((group, groupIndex) => {
    const section = document.createElement('div');
    section.className = 'group';

    const doneCount = group.items.filter(i => i.status === 'done').length;
    const total = group.items.length;
    const pct = total > 0 ? (doneCount / total) * 100 : 0;

    const groupKey = `${currentFile}:${groupIndex}`;
    const isCollapsed = collapsedGroups.has(groupKey);

    section.innerHTML = `
      <div class="group-header">
        <div class="group-header-left">
          <span class="collapse-toggle${isCollapsed ? ' collapsed' : ''}">${isCollapsed ? '▸' : '▾'}</span>
          <span class="group-name">${group.name}</span>
        </div>
        <span class="group-progress">${doneCount}/${total}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${pct}%"></div>
      </div>
    `;

    section.querySelector('.group-header').addEventListener('click', () => {
      if (collapsedGroups.has(groupKey)) {
        collapsedGroups.delete(groupKey);
      } else {
        collapsedGroups.add(groupKey);
      }
      window.api.readFile(currentFile).then(renderTodo);
    });

    const itemsDiv = document.createElement('div');
    itemsDiv.style.display = isCollapsed ? 'none' : 'block';
    group.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'todo-item';
      row.dataset.status = item.status;

      const btn = document.createElement('button');
      btn.className = 'status-icon';
      btn.dataset.status = item.status;
      btn.textContent = STATUS_ICONS[item.status];
      btn.addEventListener('click', () => toggleDone(item.id, item.status));

      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = item.text;

      // Selected state
      if (item.id === selectedItemId) {
        row.classList.add('selected');
      }

      // Click text to select item and open detail panel
      text.addEventListener('click', () => {
        selectedItemId = item.id === selectedItemId ? null : item.id;
        renderTodo(currentData);
        renderDetailPanel();
      });

      row.appendChild(btn);
      row.appendChild(text);
      itemsDiv.appendChild(row);
    });

    section.appendChild(itemsDiv);
    container.appendChild(section);
  });
}

// --- Status Toggle ---

async function toggleDone(itemId, currentStatus) {
  const nextStatus = currentStatus === 'done' ? 'pending' : 'done';
  const updatedData = await window.api.updateItem(currentFile, itemId, nextStatus);
  renderTodo(updatedData);
  renderDetailPanel();
  loadFileList();
}

async function setStatus(itemId, newStatus) {
  const updatedData = await window.api.updateItem(currentFile, itemId, newStatus);
  renderTodo(updatedData);
  renderDetailPanel();
  loadFileList();
}

// --- Detail Panel ---

function findItemById(data, id) {
  for (const group of data.groups) {
    for (const item of group.items) {
      if (item.id === id) return item;
    }
  }
  return null;
}

function renderDetailPanel() {
  const panel = document.getElementById('detail-panel');
  const body = document.getElementById('detail-body');

  if (!selectedItemId || !currentData) {
    panel.classList.remove('open');
    return;
  }

  const item = findItemById(currentData, selectedItemId);
  if (!item) {
    panel.classList.remove('open');
    return;
  }

  panel.classList.add('open');
  body.innerHTML = '';

  // Status selector
  const statusRow = document.createElement('div');
  statusRow.className = 'detail-status-row';

  STATUS_CYCLE.forEach(status => {
    const btn = document.createElement('button');
    btn.className = `detail-status-btn status-${status}${item.status === status ? ' active' : ''}`;
    btn.textContent = status;
    btn.addEventListener('click', () => setStatus(item.id, status));
    statusRow.appendChild(btn);
  });

  body.appendChild(statusRow);

  // Item text
  const title = document.createElement('h2');
  title.className = 'detail-item-title';
  title.textContent = item.text;
  body.appendChild(title);

  // Notes
  const notesLabel = document.createElement('label');
  notesLabel.className = 'detail-label';
  notesLabel.textContent = 'Notes';
  body.appendChild(notesLabel);

  if (item.notes) {
    const notesText = document.createElement('p');
    notesText.className = 'detail-notes';
    notesText.textContent = item.notes;
    body.appendChild(notesText);
  } else {
    const noNotes = document.createElement('p');
    noNotes.className = 'detail-empty';
    noNotes.textContent = 'No notes';
    body.appendChild(noNotes);
  }

  // Snippets (copyable items)
  if (item.snippets && item.snippets.length > 0) {
    const snippetsLabel = document.createElement('label');
    snippetsLabel.className = 'detail-label';
    snippetsLabel.textContent = 'Copy to Clipboard';
    body.appendChild(snippetsLabel);

    item.snippets.forEach(snippet => {
      const row = document.createElement('div');
      row.className = 'snippet-row';

      const code = document.createElement('code');
      code.className = 'snippet-text';
      code.textContent = snippet;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'snippet-copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(snippet);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      });

      row.appendChild(code);
      row.appendChild(copyBtn);
      body.appendChild(row);
    });
  }
}

document.getElementById('detail-close').addEventListener('click', () => {
  selectedItemId = null;
  document.getElementById('detail-panel').classList.remove('open');
  renderTodo(currentData);
});

// --- File Watching ---

window.api.onFilesChanged((files) => {
  renderFileList(files);
  // If the currently viewed file changed, re-render it
  if (currentFile && files.includes(currentFile)) {
    window.api.readFile(currentFile).then(renderTodo);
  }
});

// --- Init ---
loadFileList();
