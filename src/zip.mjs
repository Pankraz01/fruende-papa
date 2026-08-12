// Minimaler ZIP-Schreiber für den "Alle als ZIP"-Download auf der QR-Seite.
//
// Bewusst selbst geschrieben statt einer npm-Abhängigkeit: Node bringt mit
// `zlib.deflateRawSync` und `zlib.crc32` (ab Node 21) schon alles mit, was das
// ZIP-Format braucht – ein paar Dutzend Zeilen Format-Code sind günstiger als
// eine weitere Abhängigkeit für ein Format, das sich seit Jahrzehnten nicht
// ändert. Kein Passwortschutz, keine Unterordner-Sonderfälle, keine ZIP64-
// Erweiterung – für ein paar Dutzend kleine QR-Dateien unnötig.

import { deflateRawSync, crc32 } from 'node:zlib';

function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

/**
 * @param {Array<{name: string, data: Buffer}>} files
 * @param {Date} [date]
 * @returns {Buffer} fertiges .zip
 */
export function createZip(files, date = new Date()) {
  const { time, day } = dosDateTime(date);
  const parts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);

    // Nur komprimieren, wenn es tatsächlich kleiner macht – bei sehr kleinen
    // Dateien (kurze EPS-Header) kann DEFLATE sonst grösser werden als STORE.
    const deflated = deflateRawSync(data);
    const useDeflate = deflated.length < data.length;
    const method = useDeflate ? 8 : 0;
    const payload = useDeflate ? deflated : data;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // benötigte Version
    local.writeUInt16LE(0, 6); // Flags
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // Extra-Feld-Länge

    parts.push(local, nameBuf, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // "erstellt mit" Version
    central.writeUInt16LE(20, 6); // benötigte Version
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // Extra-Feld-Länge
    central.writeUInt16LE(0, 32); // Kommentarlänge
    central.writeUInt16LE(0, 34); // Datenträgernummer
    central.writeUInt16LE(0, 36); // interne Attribute
    // `>>> 0`: der `<<`-Operator rechnet mit vorzeichenbehafteten 32-Bit-Zahlen
    // und würde das oberste Bit sonst als Minuszeichen lesen – writeUInt32LE
    // bräche dann mit RangeError ab.
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38); // externe Attribute (unix rw-r--r--)
    central.writeUInt32LE(offset, 42);

    centralParts.push(central, nameBuf);
    offset += local.length + nameBuf.length + payload.length;
  }

  const centralDirStart = offset;
  const centralDir = Buffer.concat(centralParts);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(centralDirStart, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, centralDir, end]);
}
