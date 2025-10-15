const outputEl = document.getElementById('output');
const tableBody = document.getElementById('log-rows');
const refreshButton = document.getElementById('refresh-logs');

function renderMessageRow(message, className = 'empty') {
  tableBody.innerHTML = '';
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 5;
  cell.className = className;
  cell.textContent = message;
  row.appendChild(cell);
  tableBody.appendChild(row);
}

async function runTask(type) {
  const promptLabel =
    type === 'optimize' ? 'Enter the project to optimize:' : 'Enter the topic:';
  const input = prompt(promptLabel);

  if (!input) {
    return;
  }

  const paramKey = type === 'optimize' ? 'project' : 'topic';
  const trimmed = input.trim();

  if (!trimmed) {
    return;
  }

  const query = new URLSearchParams({ [paramKey]: trimmed });
  const res = await fetch(`/${type}?${query.toString()}`);
  const text = await res.text();
  outputEl.textContent = text;
  await loadLogs();
}

function createCell(text) {
  const cell = document.createElement('td');
  cell.textContent = text;
  return cell;
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }

  return parsed.toLocaleString();
}

async function loadLogs() {
  renderMessageRow('Loading…');

  try {
    const res = await fetch('/logs');
    if (!res.ok) {
      throw new Error('Failed to load logs');
    }

    const logs = await res.json();

    if (!Array.isArray(logs) || logs.length === 0) {
      renderMessageRow('No logs yet.');
      return;
    }

    tableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    logs.forEach((log) => {
      const row = document.createElement('tr');
      row.appendChild(createCell(String(log.id ?? '—')));
      row.appendChild(createCell(log.type ?? '—'));
      row.appendChild(createCell(log.topic ?? '—'));
      row.appendChild(createCell(log.output ?? '—'));
      row.appendChild(createCell(formatDate(log.created_at)));
      fragment.appendChild(row);
    });

    tableBody.appendChild(fragment);
  } catch (error) {
    renderMessageRow(error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  refreshButton.addEventListener('click', () => loadLogs());
  loadLogs();
});
