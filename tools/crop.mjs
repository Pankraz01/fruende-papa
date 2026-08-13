#!/usr/bin/env node
/**
 * Schneidet aus den Originalfotos in orig-pics/ quadratische Portraets und
 * legt sie als 600x600-JPEGs nach static/img/.
 *
 * Hintergrund: Auf der Seite werden die Bilder per CSS zum KREIS maskiert
 * (.avatar = 108px, .tile img = 72px, jeweils border-radius: 50%). Alles was
 * ausserhalb des einbeschriebenen Kreises liegt - also die vier Ecken des
 * Quadrats - ist unsichtbar. Der Kopf muss deshalb mit etwas Abstand INNERHALB
 * dieses Kreises sitzen und darf nicht am Rand kleben.
 *
 * Aufruf:  node tools/crop.mjs            (alle Bilder)
 *          node tools/crop.mjs otto ulli  (nur einzelne Personen)
 *
 * Werkzeug ist ausschliesslich `sips` (macOS-Bordmittel), ImageMagick gibt es
 * hier nicht. Wichtig: `sips --cropOffset offsetY offsetX` erwartet die
 * ABSOLUTE linke obere Ecke im Quellbild - mit der einen Ausnahme, dass
 * "0 0" als "mittig zentriert" interpretiert wird (siehe NULL_FIX unten).
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'orig-pics');
const OUT_DIR = join(ROOT, 'static', 'img');

/** Kantenlaenge der fertigen Bilder in Pixeln. */
const ZIEL_GROESSE = 600;
/** JPEG-Qualitaet (sips formatOptions), ca. 60-120 KB pro Bild. */
const JPEG_QUALITAET = 85;

/**
 * Crop-Tabelle - hier nachjustieren, wenn ein Ausschnitt nicht passt.
 *
 *   quelle  Dateiname in orig-pics/
 *   breite  Originalbreite  (nur zur Kontrolle, sips clippt sonst stillschweigend)
 *   hoehe   Originalhoehe
 *   x / y   linke obere Ecke des quadratischen Ausschnitts im Original
 *   kante   Kantenlaenge des Ausschnitts im Original
 *
 * Faustregel: Kopf ca. 40-50 % der Kantenlaenge, Kopfmitte bei ~42 % der Hoehe,
 * damit oben etwas Luft bleibt und das Kinn nicht an den Kreisrand stoesst.
 */
const CROPS = [
  // name      quelle         breite  hoehe    x     y   kante
  ['bernd',  'bernd.png',      2064,  3069,  221,  344,  1841],
  ['body',   'body.png',       1539,  2203,  291,  304,   961],
  ['harry',  'harry.png',       441,   761,   37,   17,   353],
  ['helmut', 'helmut.png',     2116,  2619,  388,    0,  1728],
  // ivan: Hut ist sehr breit - volle Bildbreite nutzen, sonst stoesst die
  // Krempe an den Kreisrand und ueber dem Hut bleibt keine Luft.
  ['ivan',   'ivan.jpg',       1024,  1536,    0,   30,  1024],
  ['mike',   'mike.png',       2540,  3764,    0,    0,  2108],
  ['otto',   'otto.png',        553,   779,  125,  198,   327],
  ['pilla',  'pilla.png',       333,   640,   45,    0,   205],
  ['rochus', 'rochus.png',      662,   850,   32,   71,   629],
  // ulli: Kopf mit Hut fuellt das Original fast komplett, breiter als die
  // Bildbreite geht nicht - y etwas hoeher gesetzt fuer Luft ueber dem Hut.
  ['ulli',   'ulli.png',        971,  1458,    0,  170,   971],
].map(([name, quelle, breite, hoehe, x, y, kante]) => ({ name, quelle, breite, hoehe, x, y, kante }));

/** Liest pixelWidth/pixelHeight eines Bildes aus. */
function masse(datei) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', datei], { encoding: 'utf8' });
  const breite = Number(out.match(/pixelWidth:\s*(\d+)/)?.[1]);
  const hoehe = Number(out.match(/pixelHeight:\s*(\d+)/)?.[1]);
  return { breite, hoehe };
}

function verarbeite(crop, tmp) {
  const quelle = join(SRC_DIR, crop.quelle);
  const ziel = join(OUT_DIR, `${crop.name}.jpg`);
  const zwischen = join(tmp, `${crop.name}.png`);

  // Kontrolle: passen die Angaben in der Tabelle noch zum Original?
  const { breite, hoehe } = masse(quelle);
  if (breite !== crop.breite || hoehe !== crop.hoehe) {
    throw new Error(`${crop.name}: Original ist ${breite}x${hoehe}, Tabelle sagt ${crop.breite}x${crop.hoehe}`);
  }
  if (crop.x + crop.kante > breite || crop.y + crop.kante > hoehe) {
    throw new Error(`${crop.name}: Ausschnitt ragt aus dem Bild heraus`);
  }

  // NULL_FIX: sips deutet "--cropOffset 0 0" als "mittig" statt als linke obere
  // Ecke. Ein Pixel Versatz kostet nichts und umgeht den Sonderfall.
  const x = crop.x === 0 && crop.y === 0 ? 1 : crop.x;

  // Schritt 1: quadratisch beschneiden (verlustfrei als PNG zwischenspeichern).
  execFileSync('sips', [
    '-s', 'format', 'png',
    '-c', String(crop.kante), String(crop.kante),
    '--cropOffset', String(crop.y), String(x),
    quelle, '--out', zwischen,
  ], { stdio: 'ignore' });

  // Schritt 2: auf Zielgroesse skalieren und als JPEG schreiben.
  execFileSync('sips', [
    '-s', 'format', 'jpeg',
    '-s', 'formatOptions', String(JPEG_QUALITAET),
    '--resampleHeightWidth', String(ZIEL_GROESSE), String(ZIEL_GROESSE),
    zwischen, '--out', ziel,
  ], { stdio: 'ignore' });

  const kb = Math.round(statSync(ziel).size / 1024);
  console.log(`${crop.name.padEnd(7)} ${crop.kante}px @ ${crop.x}/${crop.y}  ->  ${ZIEL_GROESSE}x${ZIEL_GROESSE}, ${kb} KB`);
}

const nurDiese = process.argv.slice(2);
const auswahl = nurDiese.length ? CROPS.filter((c) => nurDiese.includes(c.name)) : CROPS;
if (!auswahl.length) {
  console.error(`Keine passende Person gefunden. Bekannt: ${CROPS.map((c) => c.name).join(', ')}`);
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), 'crop-'));
try {
  for (const crop of auswahl) verarbeite(crop, tmp);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
