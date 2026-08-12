// EPS-Export für QR-Codes. Die npm-Bibliothek `qrcode` kann SVG, PNG und
// Terminal-Ausgabe, aber kein EPS – viele Textildruck-Dienstleister verlangen
// es trotzdem, weil ihre RIP-Software kein SVG einliest.
//
// Wir greifen daher auf `QRCode.create()` zurück, das nur die rohe
// Modul-Matrix liefert (dunkel/hell pro Zelle, ohne Rendering), und zeichnen
// selbst. Das Bit pro Zelle ist bei dieser Bibliothek einfach 0/1 – geprüft
// am mitgelieferten SVG-Renderer (node_modules/qrcode/lib/renderer/svg-tag.js:
// `if (data[i])` entscheidet dunkel/hell, kein Maskieren nötig.

/**
 * @param {import('qrcode').QRCode} qrData  Rückgabe von `QRCode.create(text, opts)`
 * @param {object} opts
 * @param {number} [opts.unit=10]      Kantenlänge eines Moduls in PostScript-Punkten (1 pt = 1/72")
 * @param {number} [opts.margin=4]     Ruhezone in Modulen, wie bei den SVGs
 * @param {[number,number,number]} opts.ink          Farbe der dunklen Module, RGB 0–1
 * @param {[number,number,number]|null} [opts.background=null]  Hintergrund, oder null für transparent (kein Rechteck)
 * @param {string} [opts.title='QR-Code']
 */
export function qrToEps(qrData, { unit = 10, margin = 4, ink, background = null, title = 'QR-Code' } = {}) {
  const size = qrData.modules.size;
  const data = qrData.modules.data;
  const total = size + margin * 2;
  const side = total * unit;

  const rows = [];
  for (let i = 0; i < data.length; i++) {
    if (!data[i]) continue;
    const col = i % size;
    const row = Math.floor(i / size);
    const x = (col + margin) * unit;
    // PostScript zählt y von unten, die Modul-Matrix von oben – daher spiegeln.
    const y = side - (row + margin + 1) * unit;
    rows.push(`${x} ${y} ${unit} ${unit} rectfill`);
  }

  const bgCmd = background
    ? `${background.join(' ')} setrgbcolor\n0 0 ${side} ${side} rectfill\n`
    : '';

  return `%!PS-Adobe-3.0 EPSF-3.0
%%Creator: Echte Fruende Visitenkarten
%%Title: ${title}
%%BoundingBox: 0 0 ${side} ${side}
%%HiResBoundingBox: 0 0 ${side} ${side}
%%LanguageLevel: 2
%%Pages: 1
%%EndComments
gsave
${bgCmd}${ink.join(' ')} setrgbcolor
${rows.join('\n')}
grestore
%%EOF
`;
}
