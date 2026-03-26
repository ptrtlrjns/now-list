const STATUS_CYCLE = ['pending', 'done', 'skipped', 'blocked'];
const STATUS_ICONS = {
  pending: '',
  done: '✓',
  skipped: '—',
  blocked: '!',
};

let currentFile = null;

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

    section.innerHTML = `
      <div class="group-header">
        <span class="group-name">${group.name}</span>
        <span class="group-progress">${doneCount}/${total}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${pct}%"></div>
      </div>
    `;

    const itemsDiv = document.createElement('div');
    group.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'todo-item';
      row.dataset.status = item.status;

      const btn = document.createElement('button');
      btn.className = 'status-icon';
      btn.dataset.status = item.status;
      btn.textContent = STATUS_ICONS[item.status];
      btn.addEventListener('click', () => cycleStatus(item.id, item.status));

      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = item.text;

      row.appendChild(btn);
      row.appendChild(text);
      itemsDiv.appendChild(row);
    });

    section.appendChild(itemsDiv);
    container.appendChild(section);
  });
}

// --- Status Toggle ---

async function cycleStatus(itemId, currentStatus) {
  const idx = STATUS_CYCLE.indexOf(currentStatus);
  const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];

  const updatedData = await window.api.updateItem(currentFile, itemId, nextStatus);
  renderTodo(updatedData);
  // Refresh sidebar to update progress counts
  loadFileList();
}

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
