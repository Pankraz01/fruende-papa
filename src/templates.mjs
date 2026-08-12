// HTML-Templates. Bewusst nur Template-Literals statt einer Template-Engine –
// das Projekt soll ohne Framework auskommen und lesbar bleiben.

import { LINK_TYPES } from './icons.mjs';

export const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Zähl-Pixel für den eigenen Cloudflare-Worker.
 *
 *  Ein Bild und kein fetch(): kein CORS-Vorflug, und es zählt auch ohne
 *  JavaScript. Ohne counterUrl entfällt alles – lokales Testen verfälscht die
 *  Statistik also nicht.
 *
 *  Drei Herkünfte werden unterschieden:
 *   - `scan`   die aufgerufene URL trägt das Merkmal `?s`, das AUSSCHLIESSLICH
 *              in den gedruckten QR-Codes steckt (siehe build.mjs) – wer das
 *              in der Adresse hat, hat wirklich den Code gescannt.
 *   - `panel`  kein Merkmal, aber der Referrer ist unsere eigene Seite – ein
 *              Klick von der Übersicht oder einer anderen Karte aus.
 *   - `direct` weder noch: eingetippt, Lesezeichen, oder ein geteilter Link,
 *              dessen Referrer die App unterdrückt hat.
 *  Das Merkmal steht nicht in der für Menschen sichtbaren URL (Fusszeile,
 *  QR-Bogen-Text) – nur im tatsächlich codierten Ziel des QR-Bilds. Wer JS aus
 *  hat, wird über <noscript> weiterhin gezählt, dann als `direct`: ohne
 *  JavaScript lässt sich die Adresszeile nicht auslesen. */
function counterBeacon(config, person) {
  if (!config.counterUrl || !person) return '';

  const api = JSON.stringify(`${config.counterUrl}/px?p=${encodeURIComponent(person.slug)}`);
  const base = JSON.stringify(config.baseUrl);
  const fallbackPx = esc(`${config.counterUrl}/px?p=${encodeURIComponent(person.slug)}&from=direct`);

  return `
  <script>
    (function () {
      var base = ${base}, ref = document.referrer, from;
      if (/[?&]s(&|=|$)/.test(location.search)) from = 'scan';
      else if (ref === base + '/' || ref === base || ref.indexOf(base + '/') === 0) from = 'panel';
      else from = 'direct';
      new Image().src = ${api} + '&from=' + from;
    })();
  </script>
  <noscript><img class="px" src="${fallbackPx}" alt="" width="1" height="1" aria-hidden="true"></noscript>`;
}

/** Gemeinsamer <head>. `base` ist der relative Pfad zum Wurzelverzeichnis. */
function head({ title, description, base, config, person, ogImage, ogUrl, noindex }) {
  // Ohne description keine Beschreibungs-Tags – so landet auf der Startseite
  // nirgends ein Text, den eine Linkvorschau (WhatsApp & Co.) anzeigen könnte.
  const meta = [
    `<meta property="og:type" content="profile">`,
    `<meta property="og:title" content="${esc(title)}">`,
    description ? `<meta property="og:description" content="${esc(description)}">` : '',
    ogUrl ? `<meta property="og:url" content="${esc(ogUrl)}">` : '',
    ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : '',
    `<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">`,
  ]
    .filter(Boolean)
    .join('\n  ');

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)}</title>${
    description ? `\n  <meta name="description" content="${esc(description)}">` : ''
  }${noindex ? '\n  <meta name="robots" content="noindex, nofollow">' : ''}
  <meta name="theme-color" content="${esc(person?.accent || '#e8623d')}">
  ${meta}
  <link rel="stylesheet" href="${base}style.css">
  <link rel="icon" href="${base}img/favicon.svg" type="image/svg+xml">
</head>`;
}

const footer = (base, config) =>
  `<footer class="footer">
    <a href="${base}">${esc(config.siteTitle)}</a> · <a href="${base}datenschutz.html">Datenschutz</a>
  </footer>`;

/** Die Kontakt-Buttons einer Person. Unbekannte Typen werden übersprungen. */
function renderLinks(person, warn) {
  const items = (person.links || [])
    .map((link) => {
      const def = LINK_TYPES[link.type];
      if (!def) {
        warn?.(`${person.slug}: unbekannter Link-Typ "${link.type}" – wird ignoriert`);
        return '';
      }
      if (!link.value || !String(link.value).trim()) return '';
      return `      <a class="link" href="${esc(def.href(link.value))}" title="${esc(def.label)}" aria-label="${esc(def.label)}"${
        link.type === 'email' || link.type === 'telefon'
          ? ''
          : ' target="_blank" rel="noopener"'
      }>${def.icon}</a>`;
    })
    .filter(Boolean);

  if (!items.length) return { html: '', empty: true };
  return { html: `\n    <nav class="links">\n${items.join('\n')}\n    </nav>`, empty: false };
}

/* ---------------------------------------------------------------- Karte */

export function cardPage(person, { config, warn }) {
  const base = '../';
  const links = renderLinks(person, warn);
  const url = `${config.baseUrl}/${person.slug}/`;

  return `${head({
    title: `${person.name} · ${config.siteTitle}`,
    description: person.spruch,
    base,
    config,
    person,
    ogImage: `${config.baseUrl}/${person.image}`,
    ogUrl: url,
  })}
<body style="--accent: ${esc(person.accent)}">
  <main class="card${links.empty ? ' card--nolinks' : ''}">
    <div class="card__band"></div>
    <img class="avatar" src="${base}${esc(person.image)}" width="108" height="108" alt="Profilbild von ${esc(person.name)}">
    <h1 class="name">${esc(person.name)}</h1>
    <p class="spruch">${esc(person.spruch)}</p>${links.html}
  </main>
  ${footer(base, config)}${counterBeacon(config, person)}
</body>
</html>
`;
}

/* ------------------------------------------------------------ Übersicht */

export function indexPage(people, { config }) {
  const tiles = people
    .map(
      (p) => `      <li><a class="tile" href="${esc(p.slug)}/" style="--tile-accent: ${esc(p.accent)}">
        <img src="${esc(p.image)}" width="72" height="72" alt="" loading="lazy">
        <span>${esc(p.name)}</span>
      </a></li>`
    )
    .join('\n');

  return `${head({
    title: config.siteTitle,
    base: './',
    config,
    ogUrl: `${config.baseUrl}/`,
  })}
<body class="page-wide">
  <main class="page page--home">
    <header class="home-header">
      <h1 class="brand">${esc(config.siteTitle)}</h1>
    </header>
    <ul class="grid">
${tiles}
    </ul>
  </main>
  ${footer('./', config)}
</body>
</html>
`;
}

/* ------------------------------------------------------ Scan-Statistik */

export function statsPage(people, { config }) {
  // Als JSON in die Seite eingebettet, damit die Statistik Namen und Bilder
  // kennt – der Worker liefert nur Slugs und Zahlen.
  const data = JSON.stringify(
    people.map((p) => ({ slug: p.slug, name: p.name, image: p.image, accent: p.accent }))
  ).replace(/</g, '\\u003c');

  const body = config.counterUrl
    ? `    <p class="stats-total" id="total"></p>
    <p class="stats-breakdown" id="breakdown"></p>
    <ul class="legend">
      <li><span class="legend-swatch legend-swatch--scan"></span>gescannt</li>
      <li><span class="legend-swatch legend-swatch--panel"></span>über diese Seite geklickt</li>
      <li><span class="legend-swatch legend-swatch--direct"></span>direkt aufgerufen</li>
    </ul>
    <ol class="rank" id="rank"></ol>
    <p class="stats-hint" id="hint">Zahlen werden geladen …</p>

  <script>
    var PEOPLE = ${data};
    var API = ${JSON.stringify(config.counterUrl).replace(/</g, '\\u003c')};

    fetch(API + '/stats')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) { render(data); })
      .catch(function () {
        document.getElementById('hint').textContent =
          'Die Zahlen sind gerade nicht erreichbar. Später nochmal probieren.';
      });

    function stueck(n, einheit) { return n + ' ' + einheit + (n === 1 ? '' : (einheit === 'Scan' ? 's' : '')); }

    function render(data) {
      var byPerson = {};
      (data.people || []).forEach(function (row) { byPerson[row.person] = row; });
      var zero = { scan: 0, panel: 0, direct: 0, total: 0 };

      var rows = PEOPLE.map(function (p) {
        return { p: p, r: byPerson[p.slug] || zero };
      }).sort(function (a, b) {
        return b.r.scan - a.r.scan || b.r.total - a.r.total || a.p.name.localeCompare(b.p.name);
      });

      var maxTotal = Math.max(1, rows.reduce(function (m, row) { return Math.max(m, row.r.total); }, 0));

      document.getElementById('total').textContent = stueck(data.scanTotal || 0, 'Scan') + ' insgesamt';

      document.getElementById('breakdown').textContent = (data.total || 0) + ' Aufrufe insgesamt – davon ' +
        (data.scanTotal || 0) + ' gescannt, ' + (data.panelTotal || 0) + ' über diese Seite, ' +
        (data.directTotal || 0) + ' direkt aufgerufen.';

      document.getElementById('rank').innerHTML = rows.map(function (row, i) {
        var r = row.r, p = row.p;
        var widthPct = Math.round((r.total / maxTotal) * 100);
        var detail = r.total + ' Aufrufe: ' + r.scan + ' gescannt, ' + r.panel + ' über die Seite, ' + r.direct + ' direkt';
        return '<li class="rank-row">' +
          '<span class="rank-pos">' + (i + 1) + '</span>' +
          '<img class="rank-img" src="../' + p.image + '" alt="" width="44" height="44" loading="lazy">' +
          '<span class="rank-body">' +
            '<span class="rank-name">' + p.name + '</span>' +
            '<span class="rank-bar" style="--w:' + widthPct + '%" title="' + detail + '">' +
              '<span class="rank-seg rank-seg--scan" style="flex-grow:' + r.scan + '; --accent:' + p.accent + '"></span>' +
              '<span class="rank-seg rank-seg--panel" style="flex-grow:' + r.panel + '"></span>' +
              '<span class="rank-seg rank-seg--direct" style="flex-grow:' + r.direct + '"></span>' +
            '</span>' +
          '</span>' +
          '<span class="rank-count">' + r.scan + '</span>' +
        '</li>';
      }).join('');

      document.getElementById('hint').textContent = data.total
        ? 'Die Rangliste sortiert nach echten Scans. Mehr dazu unter Datenschutz.'
        : 'Noch kein einziger Aufruf. Shirt anziehen und rausgehen.';
    }
  </script>`
    : `    <p>Der Zähler ist noch nicht eingerichtet – in <code>site.config.json</code>
    fehlt die <code>counterUrl</code>. Wie das geht, steht in der README.</p>`;

  // Nirgends verlinkt und nicht indexiert – wer die Statistik sehen will, muss
  // die Adresse kennen. Bewusst kein Eintrag in einer robots.txt: die wäre
  // öffentlich und würde den Pfad erst recht verraten.
  return `${head({
    title: `Scan-Statistik · ${config.siteTitle}`,
    description: 'Wer wurde am häufigsten gescannt?',
    base: '../',
    config,
    noindex: true,
  })}
<body class="page-wide">
  <main class="page">
    <h1>Scan-Statistik</h1>
    <p class="lead">Wer wurde am häufigsten vom Shirt gescannt?</p>
${body}
  </main>
  ${footer('../', config)}
</body>
</html>
`;
}

/* ----------------------------------------------------------- Datenschutz */

export function privacyPage({ config }) {
  const gaBlock = config.counterUrl
    ? `<h2>Was gemessen wird</h2>
    <p>Wir zählen, wie oft welches Shirt gescannt wurde – mehr nicht. Beim Aufruf
    einer Visitenkarte wird genau dreierlei gespeichert: <strong>welche Karte</strong>
    aufgerufen wurde, <strong>wann</strong>, und <strong>woher</strong> der Aufruf
    kam – vom gedruckten QR-Code, durch Herumklicken auf dieser Seite, oder
    weder noch. Damit können wir „wie oft wurde diese Karte wirklich vom Shirt
    gescannt“ von „wie oft haben wir selbst draufgeklickt“ unterscheiden, statt
    uns die eigene Statistik kaputtzuklicken. Das war's.</p>

    <p>Nicht gespeichert werden: deine IP-Adresse, dein Gerät, dein Browser, dein
    Standort, ein Verweis auf die Seite, von der du kamst, oder irgendeine Kennung,
    mit der du wiedererkannt werden könntest. Zwei Scans lassen sich nicht
    einander zuordnen – auch nicht deine eigenen.</p>

    <h2>Cookies</h2>
    <p>Keine. Diese Seite setzt keinerlei Cookies und legt nichts in deinem
    Browser ab.</p>

    <h2>Wer die Daten bekommt</h2>
    <p>Niemand ausserhalb dieses Projekts. Der Zähler läuft auf einem eigenen
    Dienst bei <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener">Cloudflare</a>,
    die Daten liegen in unserer eigenen Datenbank dort. Es gibt keine Werbenetzwerke,
    keine Analyse-Anbieter und keine Weitergabe.</p>

    <p>Technisch unvermeidbar: wie bei jedem Aufruf einer Webseite sieht der Server
    im Moment der Verbindung deine IP-Adresse. Sie wird von uns nicht gespeichert
    und nicht ausgewertet.</p>

    <h2>Wie du das abstellst</h2>
    <p>Der Zähler ist ein unsichtbares 1×1-Pixel-Bild. Wer es blockiert – etwa mit
    einem Inhaltsblocker – wird nicht gezählt. Die Visitenkarte funktioniert dann
    ganz normal weiter.</p>

    <p>Woher der Aufruf kam, wird so bestimmt: die gedruckten QR-Codes enthalten
    ein kleines, unsichtbares Kennzeichen in der codierten Adresse (ein
    „<code>?s</code>“ am Ende) – nur so erkennt die Karte einen echten Scan
    sicher. Steht das nicht in der Adresse, prüfen wir stattdessen, von welcher
    Seite aus verlinkt wurde: das schickt dein Browser bei jedem Klick ohnehin
    automatisch mit. Gespeichert wird von beidem nichts Genaueres – nur die
    Einordnung „gescannt“, „über diese Seite“ oder „direkt“.</p>

    <h2>Was dabei herauskommt</h2>
    <p>Am Ende steht eine schlichte Rangliste: wie oft welche Karte aufgerufen
    wurde. Über einzelne Besucherinnen und Besucher steht dort nichts – es gibt
    schlicht nichts, was sich einer Person zuordnen liesse.</p>`
    : `<h2>Was gemessen wird</h2>
    <p>Aktuell ist keine Messung aktiv. Diese Seite ist rein statisch, setzt keine
    Cookies und sendet keine Daten an Dritte.</p>`;

  return `${head({
    title: `Datenschutz · ${config.siteTitle}`,
    description: 'Kurzer Hinweis, was auf dieser Seite gemessen wird.',
    base: './',
    config,
  })}
<body class="page-wide">
  <main class="page">
    <h1>Datenschutz</h1>
    <p class="lead">Kurz und ehrlich: das hier ist ein privates Spassprojekt.</p>
    ${gaBlock}

    <h2>Kontakt</h2>
    <p>Bei Fragen melde dich einfach bei der Person, deren Shirt du gescannt hast.</p>
  </main>
  ${footer('./', config)}
</body>
</html>
`;
}

/* ------------------------------------------------------------------ 404 */

export function notFoundPage({ config }) {
  // 404.html kann unter beliebig tiefen Pfaden ausgeliefert werden, relative
  // Pfade funktionieren hier also nicht – wir brauchen den absoluten Pfad,
  // unter dem die Seite liegt (bei Project Pages z. B. "/fruende/").
  const base = config.rootPath;

  return `${head({
    title: `Karte nicht gefunden · ${config.siteTitle}`,
    description: 'Diese Visitenkarte gibt es nicht.',
    base,
    config,
  })}
<body class="page-wide">
  <main class="page">
    <h1>Diese Karte gibt es nicht</h1>
    <p class="lead">Vielleicht hat der Scan danebengegriffen – oder das Shirt ist älter als die Seite.</p>
    <p><a href="${base}">Zur Übersicht aller Karten</a></p>
  </main>
</body>
</html>
`;
}

/* ------------------------------------------------- QR-Bogen zum Drucken */

export function qrSheet(people, { config }) {
  const items = people
    .map(
      (p) => `      <li class="qr-item">
        <img src="${esc(p.slug)}.svg" alt="QR-Code für ${esc(p.name)}">
        <strong>${esc(p.name)}</strong>
        <code>${esc(config.baseUrl)}/${esc(p.slug)}/</code>
        <p class="noprint">
          <a href="${esc(p.slug)}.svg" download>SVG</a> ·
          <a href="${esc(p.slug)}-invert.svg" download>SVG hell</a> ·
          <a href="${esc(p.slug)}.eps" download>EPS</a> ·
          <a href="${esc(p.slug)}-invert.eps" download>EPS hell</a>
        </p>
      </li>`
    )
    .join('\n');

  return `${head({
    title: `QR-Codes · ${config.siteTitle}`,
    description: 'Druckbogen mit allen QR-Codes.',
    base: '../',
    config,
  })}
<body class="page-wide">
  <main class="page">
    <h1 class="noprint">QR-Codes</h1>
    <p class="lead noprint">Vor dem Druck bitte jeden Code einmal mit dem Handy vom
    Bildschirm scannen und prüfen, ob er auf der richtigen Karte landet.
    <strong>SVG</strong> ist schwarz auf weiss (helle Shirts),
    <strong>SVG hell</strong> ist weiss auf transparent (dunkle Shirts).
    <strong>EPS</strong> ist dasselbe als PostScript-Vektordatei, falls die
    Druckerei kein SVG einliest.</p>
    <p class="qr-zip noprint">
      <a class="qr-zip__button" href="alle-qr-codes.zip" download>Alle 40 Dateien als ZIP herunterladen</a>
    </p>
    <ul class="qr-grid">
${items}
    </ul>
  </main>
</body>
</html>
`;
}
