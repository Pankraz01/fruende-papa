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

/** GA4-Snippet – wird komplett weggelassen, wenn keine Mess-ID gesetzt ist,
 *  damit lokales Testen die Statistik nicht verschmutzt. */
function analytics(config, person) {
  if (!config.ga4Id) return '';
  const id = esc(config.ga4Id);
  const scanEvent = person
    ? `\n    gtag('event', 'scan', { person: '${esc(person.slug)}' });`
    : '';
  return `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${id}');${scanEvent}
  </script>`;
}

/** Gemeinsamer <head>. `base` ist der relative Pfad zum Wurzelverzeichnis. */
function head({ title, description, base, config, person, ogImage, ogUrl }) {
  const meta = [
    `<meta property="og:type" content="profile">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
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
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="${esc(person?.accent || '#e8623d')}">
  ${meta}
  <link rel="stylesheet" href="${base}style.css">
  <link rel="icon" href="${base}img/favicon.svg" type="image/svg+xml">${analytics(config, person)}
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
  ${footer(base, config)}
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
    description: config.siteDescription,
    base: './',
    config,
    ogUrl: `${config.baseUrl}/`,
  })}
<body class="page-wide">
  <main class="page page--home">
    <header class="home-header">
      <h1 class="brand">${esc(config.siteTitle)}</h1>
      <p class="lead">${esc(config.siteDescription)}</p>
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

/* ----------------------------------------------------------- Datenschutz */

export function privacyPage({ config }) {
  const gaBlock = config.ga4Id
    ? `<h2>Was gemessen wird</h2>
    <p>Diese Seite nutzt Google Analytics 4, um zu zählen, wie oft welcher QR-Code
    gescannt wurde. Erfasst werden dabei die aufgerufene Seite, Zeitpunkt, grober
    Standort (Land/Region), Gerätetyp und Browser. Es werden keine Namen,
    E-Mail-Adressen oder sonstige Angaben erhoben, mit denen du direkt
    identifizierbar wärst.</p>

    <h2>Cookies</h2>
    <p>Google Analytics setzt dafür ein Cookie in deinem Browser. Es dient
    ausschliesslich der Zählung und nicht der Werbung.</p>

    <h2>Wer die Daten bekommt</h2>
    <p>Die Daten werden von Google verarbeitet. Details dazu stehen in der
    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Datenschutzerklärung
    von Google</a>.</p>

    <h2>Wie du das abstellst</h2>
    <p>Du kannst die Messung mit dem
    <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Browser-Add-on
    von Google</a> deaktivieren, im Browser „Do Not Track“ bzw. den Tracking-Schutz
    aktivieren oder Cookies für diese Seite blockieren. Die Visitenkarten
    funktionieren dann ganz normal weiter.</p>`
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
        <p class="noprint"><a href="${esc(p.slug)}.svg" download>SVG</a> · <a href="${esc(p.slug)}-invert.svg" download>SVG hell</a></p>
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
    <strong>SVG hell</strong> ist weiss auf transparent (dunkle Shirts).</p>
    <ul class="qr-grid">
${items}
    </ul>
  </main>
</body>
</html>
`;
}
