#!/usr/bin/env node
// Baut aus data/people.json + site.config.json die komplette statische Seite
// nach dist/ – inklusive der druckfertigen QR-Codes.
//
//   npm run build     einmal bauen
//   npm start         bauen + lokal ausliefern

import { readFile, writeFile, mkdir, rm, readdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

import { cardPage, indexPage, privacyPage, notFoundPage, qrSheet } from './src/templates.mjs';
import { LINK_TYPE_NAMES } from './src/icons.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');

const DEFAULT_ACCENT = '#e8623d';
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

const warnings = [];
const warn = (msg) => warnings.push(msg);

const json = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));

/* ------------------------------------------------------------ Einlesen */

const config = await json('site.config.json');
const people = await json('data/people.json');

if (!Array.isArray(people) || people.length === 0) {
  throw new Error('data/people.json enthält keine Personen.');
}

config.baseUrl = String(config.baseUrl || '').replace(/\/+$/, '');
if (!config.baseUrl) {
  throw new Error('site.config.json: baseUrl fehlt.');
}
if (config.baseUrl.includes('DEIN-USERNAME')) {
  warn(
    'site.config.json: baseUrl ist noch der Platzhalter. Die QR-Codes zeigen ' +
      'damit ins Leere – vor dem Druck unbedingt anpassen!'
  );
}

// Absoluter Pfad, unter dem die Seite liegt – wird für 404.html gebraucht.
try {
  const p = new URL(config.baseUrl).pathname.replace(/\/+$/, '');
  config.rootPath = `${p}/`;
} catch {
  throw new Error(`site.config.json: baseUrl ist keine gültige URL: ${config.baseUrl}`);
}

/* --------------------------------------------------- Prüfen & ergänzen */

const imageDir = path.join(root, 'static', 'img');
const availableImages = existsSync(imageDir) ? await readdir(imageDir) : [];
const seenSlugs = new Set();

// Gross-/Kleinschreibung soll beim Dateinamen egal sein (Ivan.PNG vs ivan.png).
const imagesByLowerName = new Map(availableImages.map((f) => [f.toLowerCase(), f]));

/** Name → Dateiname-tauglich: "Rochus" → "rochus", "Jörg" → "joerg". */
const nameSlug = (name) =>
  String(name)
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');

for (const person of people) {
  if (!person.slug || !SLUG_RE.test(person.slug)) {
    throw new Error(
      `Ungültiger slug: ${JSON.stringify(person.slug)}. Erlaubt sind nur ` +
        'Kleinbuchstaben, Ziffern und Bindestriche (z. B. "daniel").'
    );
  }
  if (seenSlugs.has(person.slug)) {
    throw new Error(`slug "${person.slug}" kommt doppelt vor – jeder muss eindeutig sein.`);
  }
  seenSlugs.add(person.slug);

  if (!person.name) throw new Error(`${person.slug}: "name" fehlt.`);
  if (!person.spruch) warn(`${person.slug}: "spruch" ist leer.`);
  if (!person.accent) person.accent = DEFAULT_ACCENT;

  for (const link of person.links || []) {
    if (!LINK_TYPE_NAMES.includes(link.type)) {
      warn(
        `${person.slug}: Link-Typ "${link.type}" ist unbekannt. Möglich sind: ` +
          LINK_TYPE_NAMES.join(', ')
      );
    }
  }

  // Profilbild suchen. Erlaubt ist der Slug (8.png) oder der Name (ivan.png) –
  // beim Einsammeln von zehn Fotos ist der Name schlicht weniger fehleranfällig.
  // Ein explizites "image" in people.json schlägt beides. Fehlt alles, greift
  // der Platzhalter.
  const candidates = [
    person.image,
    ...IMAGE_EXTENSIONS.flatMap((ext) => [`${person.slug}${ext}`, `${nameSlug(person.name)}${ext}`]),
  ].filter(Boolean);

  const found = candidates
    .map((c) => imagesByLowerName.get(c.toLowerCase()))
    .find(Boolean);

  if (found) {
    person.image = `img/${found}`;
  } else {
    person.image = 'img/placeholder.svg';
    warn(`${person.slug} (${person.name}): kein Profilbild in static/img/ gefunden – Platzhalter wird benutzt.`);
  }
}

/* ---------------------------------------------------------- Schreiben */

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'img'), { recursive: true });
await mkdir(path.join(dist, 'qr'), { recursive: true });

await copyFile(path.join(root, 'src', 'style.css'), path.join(dist, 'style.css'));

for (const file of availableImages) {
  await copyFile(path.join(imageDir, file), path.join(dist, 'img', file));
}

for (const person of people) {
  await mkdir(path.join(dist, person.slug), { recursive: true });
  await writeFile(
    path.join(dist, person.slug, 'index.html'),
    cardPage(person, { config, warn })
  );
}

await writeFile(path.join(dist, 'index.html'), indexPage(people, { config }));
await writeFile(path.join(dist, 'datenschutz.html'), privacyPage({ config }));
await writeFile(path.join(dist, '404.html'), notFoundPage({ config }));

// Ohne .nojekyll ignoriert GitHub Pages Dateien und Ordner mit Unterstrich.
await writeFile(path.join(dist, '.nojekyll'), '');

/* ---------------------------------------------------------- QR-Codes */

// Fehlerkorrektur "M" statt des dichteren "H": auf dehnbarem Stoff senkt jede
// zusätzliche Modulreihe die Scanrate spürbar.
// `width` setzt nur width/height im SVG-Tag – der Inhalt bleibt Vektor. Manche
// Druckereien stolpern über SVGs ganz ohne Grössenangabe.
const qrOptions = { type: 'svg', errorCorrectionLevel: 'M', margin: 4, width: 1024 };

for (const person of people) {
  const url = `${config.baseUrl}/${person.slug}/`;

  const dark = await QRCode.toString(url, {
    ...qrOptions,
    color: { dark: '#000000ff', light: '#ffffffff' },
  });
  await writeFile(path.join(dist, 'qr', `${person.slug}.svg`), dark);

  const light = await QRCode.toString(url, {
    ...qrOptions,
    color: { dark: '#ffffffff', light: '#00000000' },
  });
  await writeFile(path.join(dist, 'qr', `${person.slug}-invert.svg`), light);
}

await writeFile(path.join(dist, 'qr', 'index.html'), qrSheet(people, { config }));

/* ------------------------------------------------------------ Bericht */

console.log(`✓ ${people.length} Visitenkarten gebaut nach dist/`);
console.log(`  Basis-URL: ${config.baseUrl}`);
console.log(`  Analytics: ${config.ga4Id ? config.ga4Id : 'aus (keine ga4Id gesetzt)'}`);
console.log(`  QR-Codes:  dist/qr/index.html`);

if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} Hinweis(e):`);
  for (const w of warnings) console.log(`  · ${w}`);
}
