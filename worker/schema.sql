-- Ein Datensatz pro Scan. Bewusst kein fertiger Zählerstand, sondern die
-- einzelnen Ereignisse: daraus lässt sich sowohl die Rangliste als auch der
-- Zeitverlauf rechnen, und ein INSERT kann sich – anders als ein
-- Lesen-Ändern-Schreiben auf einem Zähler – nicht mit sich selbst überholen.
--
-- Gespeichert wird ausschliesslich, WELCHE Karte WANN aufgerufen wurde.
-- Keine IP-Adresse, kein User-Agent, keine Kennung des Geräts.

CREATE TABLE IF NOT EXISTS scans (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  person TEXT    NOT NULL,
  ts     INTEGER NOT NULL,  -- Unix-Zeit in Millisekunden
  src    TEXT              -- 'scan' | 'panel' | 'direct', siehe worker/src/index.js
);

CREATE INDEX IF NOT EXISTS scans_person_idx ON scans (person);
CREATE INDEX IF NOT EXISTS scans_ts_idx     ON scans (ts);
