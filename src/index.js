const HTML_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'permissions-policy': 'geolocation=(), camera=(), microphone=()',
  'content-security-policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; font-src 'self' https://static.itch.io; connect-src 'self'; " +
    "base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

const PAGES = {
  '/pivot': '/pivot.html',
  '/cross': '/cross.html',
  '/register': '/register.html',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (path === '/' && request.method !== 'POST') {
        return Response.redirect(url.origin + '/pivot', 302);
      }

      if (path === '/favicon.ico') {
        return Response.redirect(url.origin + '/favicon.svg', 308);
      }

      if (path === '/healthz') {
        return await health(env);
      }

      if (path === '/registerData') {
        if (request.method !== 'POST') return methodNotAllowed('POST');
        return await register(request, env);
      }

      if (path === '/getData') {
        if (request.method !== 'POST') return methodNotAllowed('POST');
        return await getData(request, env);
      }

      if (path === '/api/score' || path === '/submitScore') {
        if (request.method !== 'POST') return methodNotAllowed('POST');
        return await submitScore(request, env);
      }

      if (PAGES[path] && (request.method === 'GET' || request.method === 'HEAD')) {
        return await serveAsset(request, env, PAGES[path]);
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return json({ ok: false, error: 'Not found' }, 404);
      }

      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
      return await serveAsset(request, env, '/404.html', 404);
    } catch (error) {
      console.error(error);
      if (path.startsWith('/api/') || path === '/getData' || path === '/registerData') {
        return json({ ok: false, error: 'Internal server error' }, 500);
      }
      return new Response('Internal server error', {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
  },
};

async function serveAsset(request, env, assetPath, status) {
  const url = new URL(request.url);
  url.pathname = assetPath;
  url.search = '';
  const asset = await env.ASSETS.fetch(new Request(url.toString(), request));
  const headers = new Headers(asset.headers);
  Object.entries(HTML_HEADERS).forEach(([name, value]) => headers.set(name, value));
  headers.set('cache-control', 'no-cache');
  return new Response(asset.body, { status: status ?? asset.status, headers });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

function methodNotAllowed(allow) {
  return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
    status: 405,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      allow,
      'cache-control': 'no-store',
    },
  });
}

async function readBody(request) {
  const type = (request.headers.get('content-type') || '').toLowerCase();
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 16 * 1024) throw new HttpError(413, 'Request body is too large');

  if (type.includes('application/json')) {
    return await request.json();
  }
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const form = await request.formData();
    const data = {};
    for (const [key, value] of form) {
      if (typeof value === 'string') data[key] = value;
    }
    return data;
  }

  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function register(request, env) {
  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    return json({ ok: false, error: error.message }, error.status || 400);
  }

  const username = String(body.user ?? body.username ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '')
    .slice(0, 20);
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(body.pass ?? body.password ?? '');

  if (!username || !email || !password) {
    return json({ ok: false, error: 'All fields are required.' }, 400);
  }
  if (!/^[a-z0-9]{1,20}$/.test(username)) {
    return json({ ok: false, error: 'Username can only contain letters and numbers (max 20).' }, 400);
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'Enter a valid email address.' }, 400);
  }
  if (password.length < 8 || password.length > 128) {
    return json({ ok: false, error: 'Password must be between 8 and 128 characters.' }, 400);
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return json(
      { ok: false, error: 'Password must contain at least 1 uppercase, 1 lowercase and 1 number.' },
      400,
    );
  }
  const lower = password.toLowerCase();
  if (lower.includes('passw') || lower.includes('1234')) {
    return json({ ok: false, error: 'Password is too common.' }, 400);
  }

  // Kept identical to the original service so existing game logins keep working.
  const { hash, salt } = generateHash(password);

  try {
    await env.DB.prepare(
      'INSERT INTO Player (email, hash, salt, username) VALUES (?, ?, ?, ?)',
    )
      .bind(email, hash, salt, username)
      .run();
  } catch (error) {
    if (/unique constraint failed/i.test(error.message || '')) {
      return json({ ok: false, error: 'That email or username is already registered.' }, 409);
    }
    throw error;
  }

  return json({ ok: true });
}

async function getData(request, env) {
  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    return json({ ok: false, error: error.message }, error.status || 400);
  }

  const detail = Number(body.detail);
  if (detail === 0) return await pivot(env);
  if (detail === 1) return await stats(env);
  return json({ ok: false, error: 'Unknown detail value.' }, 400);
}

async function pivot(env) {
  const [levelResult, scoreResult] = await env.DB.batch([
    env.DB.prepare(
      `SELECT DISTINCT l.levelID, l.levelName
       FROM Level l
       JOIN Progress p ON p.levelID = l.levelID
       ORDER BY l.levelID`,
    ),
    env.DB.prepare(
      `SELECT pl.username, p.levelID, MAX(p.score) AS score
       FROM Progress p
       JOIN Player pl ON pl.playerID = p.playerID
       GROUP BY pl.username, p.levelID
       ORDER BY pl.username`,
    ),
  ]);

  const levels = levelResult.results || [];
  const players = [];
  const byName = new Map();

  for (const row of scoreResult.results || []) {
    let player = byName.get(row.username);
    if (!player) {
      player = { username: row.username, scores: {} };
      byName.set(row.username, player);
      players.push(player);
    }
    player.scores[row.levelID] = row.score;
  }

  return json({ ok: true, levels, players });
}

async function stats(env) {
  const { results } = await env.DB.prepare(
    `SELECT
       l.levelID,
       l.levelName,
       COUNT(p.progressID) AS no_player,
       MAX(p.score) AS Best_Score,
       (SELECT pl.username
          FROM Progress p2 JOIN Player pl ON p2.playerID = pl.playerID
         WHERE p2.levelID = l.levelID
         ORDER BY p2.score DESC, p2.time ASC
         LIMIT 1) AS Best_score,
       MIN(p.time) AS Best_Time,
       (SELECT pl.username
          FROM Progress p3 JOIN Player pl ON p3.playerID = pl.playerID
         WHERE p3.levelID = l.levelID
         ORDER BY p3.time ASC, p3.score DESC
         LIMIT 1) AS Best_time,
       AVG(p.score) AS AVG_Score,
       AVG(p.time) AS AVG_Time
     FROM Level l
     JOIN Progress p ON p.levelID = l.levelID
     GROUP BY l.levelID, l.levelName
     ORDER BY l.levelID`,
  ).all();

  return json({ ok: true, stats: results || [] });
}

async function health(env) {
  const [players, progress] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS count FROM Player'),
    env.DB.prepare('SELECT COUNT(*) AS count FROM Progress'),
  ]);
  return json({
    ok: true,
    players: players.results?.[0]?.count ?? 0,
    scores: progress.results?.[0]?.count ?? 0,
  });
}

async function submitScore(request, env) {
  if (!env.SCORE_API_KEY) {
    return json({ ok: false, error: 'Score submission is not configured.' }, 503);
  }

  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    return json({ ok: false, error: error.message }, error.status || 400);
  }

  const supplied = request.headers.get('x-api-key') || body.key || '';
  if (!safeEqual(String(supplied), env.SCORE_API_KEY)) {
    return json({ ok: false, error: 'Unauthorized.' }, 401);
  }

  const playerID = Number(body.playerID);
  const levelID = Number(body.levelID);
  const score = Number(body.score);
  const time = Number(body.time);

  if (!Number.isInteger(playerID) || playerID < 1) {
    return json({ ok: false, error: 'playerID must be a positive integer.' }, 400);
  }
  if (!Number.isInteger(levelID) || levelID < 1 || levelID > 9999) {
    return json({ ok: false, error: 'levelID must be a positive integer.' }, 400);
  }
  if (!Number.isFinite(score) || score < 0 || score > 1e9) {
    return json({ ok: false, error: 'score is invalid.' }, 400);
  }
  if (!Number.isFinite(time) || time < 0 || time > 1e9) {
    return json({ ok: false, error: 'time is invalid.' }, 400);
  }

  const player = await env.DB.prepare('SELECT playerID FROM Player WHERE playerID = ?')
    .bind(playerID)
    .first();
  if (!player) {
    return json({ ok: false, error: 'Player not found.' }, 404);
  }

  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO Level (levelID, levelName) VALUES (?, ?)').bind(
      levelID,
      `Level ${levelID}`,
    ),
    env.DB.prepare(
      'INSERT INTO Progress (playerID, levelID, score, time) VALUES (?, ?, ?, ?)',
    ).bind(playerID, levelID, score, time),
  ]);

  return json({ ok: true });
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}

// Legacy hash retained for compatibility with the shipped Unity client.
function generateHash(password) {
  let hash = 0;
  const count = 10;
  const salt = Math.floor(Math.random() * 1000000);
  for (let index = 0; index < password.length; index += 1) {
    hash += password.charCodeAt(index) * Math.pow(10, count - index) + salt;
  }
  return { hash: hash.toString(16), salt };
}
