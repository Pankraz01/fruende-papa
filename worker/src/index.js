// Scan-Zähler für die Visitenkarten.
//
// Läuft als Cloudflare Worker, die Seite selbst bleibt auf GitHub Pages.
// Zwei Endpunkte:
//
//   GET /px?p=8    zählt einen Scan und liefert ein 1x1-Pixel zurück
//   GET /stats     liefert die Auswertung als JSON
//
// Gezählt wird über ein Bild statt über fetch(). Das hat zwei Vorteile: es
// braucht kein JavaScript auf der Karte, und es gibt keine CORS-Vorabanfrage.

const SLUGS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);

// Vorschau-Bots von WhatsApp, Telegram & Co. laden die Seite mit, sobald jemand
// einen Link teilt. Ohne diesen Filter zählt jeder geteilte Link als Scan.
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|skype|slack|discord|twitter|linkedinbot|embedly|pinterest|curl|wget|python-requests|okhttp|headless|lighthouse|pagespeed|uptime|monitor/i;

// 1x1 transparentes GIF.
const PIXEL = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(env) });
    }

    if (url.pathname === '/px') return countScan(request, env, url);
    if (url.pathname === '/stats') return readStats(request, env);

    return json({ error: 'Unbekannter Endpunkt' }, 404, env);
  },
};

/* ------------------------------------------------------------------ Zählen */

async function countScan(request, env, url) {
  const person = url.searchParams.get('p');
  const agent = request.headers.get('user-agent') || '';

  // Ein unbekannter Slug oder ein Bot wird still ignoriert – das Pixel kommt
  // trotzdem zurück, damit auf der Karte kein kaputtes Bild erscheint.
  if (SLUGS.has(person) && !BOT.test(agent)) {
    try {
      await env.DB.prepare('INSERT INTO scans (person, ts) VALUES (?, ?)')
        .bind(person, Date.now())
        .run();
    } catch (err) {
      // Ein fehlgeschlagener Zähler darf die Visitenkarte nie stören.
      console.error('Zählen fehlgeschlagen:', err);
    }
  }

  return new Response(PIXEL, {
    headers: {
      'content-type': 'image/gif',
      // Ohne das zählt der Browser beim zweiten Aufruf aus dem Cache nicht mit.
      'cache-control': 'no-store, no-cache, must-revalidate',
      ...cors(env),
    },
  });
}

/* ---------------------------------------------------------------- Auswerten */

async function readStats(request, env) {
  try {
    const proPerson = await env.DB.prepare(
      `SELECT person, COUNT(*) AS count, MAX(ts) AS last
         FROM scans
        GROUP BY person
        ORDER BY count DESC`
    ).all();

    // Verlauf der letzten 30 Tage.
    const seit = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const proTag = await env.DB.prepare(
      `SELECT date(ts / 1000, 'unixepoch') AS tag, COUNT(*) AS count
         FROM scans
        WHERE ts >= ?
        GROUP BY tag
        ORDER BY tag`
    )
      .bind(seit)
      .all();

    const people = proPerson.results ?? [];

    return json(
      {
        total: people.reduce((sum, r) => sum + r.count, 0),
        people,
        perDay: proTag.results ?? [],
      },
      200,
      env
    );
  } catch (err) {
    console.error('Auswertung fehlgeschlagen:', err);
    return json({ error: 'Auswertung fehlgeschlagen' }, 500, env);
  }
}

/* ------------------------------------------------------------------ Helfer */

const cors = (env) => ({
  'access-control-allow-origin': env.ALLOWED_ORIGIN || '*',
  'access-control-allow-methods': 'GET, OPTIONS',
});

const json = (body, status, env) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...cors(env),
    },
  });
