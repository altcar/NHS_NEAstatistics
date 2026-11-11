const formatNumber = (value, digits = 0) => {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return number.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
};

const formatTime = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `${formatNumber(number, 2)}s`;
};

async function post(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

function emptyRow(tbody, columns, message) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = columns;
  cell.className = 'empty';
  cell.innerHTML = `<strong>No scores yet</strong>${message}`;
  row.append(cell);
  tbody.replaceChildren(row);
}

function messageRow(tbody, columns, message) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = columns;
  cell.className = 'empty';
  cell.textContent = message;
  row.append(cell);
  tbody.replaceChildren(row);
}

async function loadPivot() {
  const table = document.getElementById('leaderboard');
  const head = table.tHead;
  const body = table.tBodies[0];
  messageRow(body, 2, 'Loading leaderboard…');

  try {
    const data = await post('/getData', { detail: 0 });
    head.replaceChildren();

    const headRow = document.createElement('tr');
    const playerHead = document.createElement('th');
    playerHead.scope = 'col';
    playerHead.textContent = 'Player';
    headRow.append(playerHead);

    data.levels.forEach((level) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = level.levelName;
      headRow.append(th);
    });
    head.append(headRow);

    if (!data.players.length) {
      emptyRow(
        body,
        data.levels.length + 1,
        'Scores appear here after players finish a level. <a href="/register">Create an account</a> to join the board.',
      );
      return;
    }

    const rows = data.players.map((player) => {
      const row = document.createElement('tr');
      const name = document.createElement('td');
      name.className = 'player';
      name.textContent = player.username;
      row.append(name);

      data.levels.forEach((level) => {
        const cell = document.createElement('td');
        cell.className = 'num';
        cell.textContent = formatNumber(player.scores[level.levelID]);
        row.append(cell);
      });
      return row;
    });
    body.replaceChildren(...rows);
  } catch (error) {
    head.replaceChildren();
    messageRow(body, 2, `Could not load the leaderboard: ${error.message}`);
  }
}

async function loadStats() {
  const table = document.getElementById('stats');
  const body = table.tBodies[0];
  messageRow(body, 8, 'Loading statistics…');

  try {
    const data = await post('/getData', { detail: 1 });
    if (!data.stats.length) {
      emptyRow(
        body,
        8,
        'Statistics appear here once scores have been submitted. <a href="/register">Create an account</a> to play.',
      );
      return;
    }

    const rows = data.stats.map((level) => {
      const row = document.createElement('tr');
      const cells = [
        [`${level.levelName} (${level.levelID})`, 'player'],
        [formatNumber(level.Best_Score), 'num'],
        [level.Best_score || '—', ''],
        [formatTime(level.Best_Time), 'num'],
        [level.Best_time || '—', ''],
        [formatNumber(level.no_player), 'num'],
        [formatNumber(level.AVG_Score, 2), 'num'],
        [formatTime(level.AVG_Time), 'num'],
      ];

      cells.forEach(([text, className]) => {
        const cell = document.createElement('td');
        if (className) cell.className = className;
        cell.textContent = text;
        row.append(cell);
      });
      return row;
    });
    body.replaceChildren(...rows);
  } catch (error) {
    messageRow(body, 8, `Could not load statistics: ${error.message}`);
  }
}

const page = document.body.dataset.page;
if (page === 'pivot') loadPivot();
if (page === 'stats') loadStats();
