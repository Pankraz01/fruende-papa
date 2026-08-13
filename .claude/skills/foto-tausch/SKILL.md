---
name: foto-tausch
description: Profilfoto einer Person auf fruende-papa austauschen – quadratisch zuschneiden, auf 600x600 verkleinern und nach main pushen, damit es deployed wird. Nutzen, wenn der User ein neues Foto schickt und es für Bernd/Body/Harry/Helmut/Ivan/Mike/Otto/Pilla/Rochus/Ulli (oder eine neue Person) einsetzen will – Trigger-Wörter: "Bild/Foto austauschen/ersetzen/tauschen", "neues Bild von X", "croppen".
---

# Foto tauschen

Workflow, um das Profilfoto einer Person in `static/img/<name>.jpg` zu ersetzen.
Zielgröße ist immer 600×600 (Kreis-Avatar per CSS, `.avatar`/`.tile img`).

## Ablauf

1. **Originalbild finden.** Vom User hochgeladene Bilder liegen als frisch
   angelegte Datei unter `/root/.claude/uploads/<session-id>/*.{png,jpg}`.
   Finde die neueste mit z. B.
   `find / -maxdepth 6 -newermt '-30 minutes' \( -iname '*.png' -o -iname '*.jpg' \) 2>/dev/null | grep -v -E '^/(proc|sys)'`.

2. **Zielperson bestimmen.** Der Dateiname in `static/img/` ist der
   kleingeschriebene `name` aus `data/people.json` (siehe `build.mjs`:
   Suche nach `<slug>.<ext>` ODER `<nameSlug(name)>.<ext>`, case-insensitive).
   Beispiel: `"name": "Pilla"` → `static/img/pilla.jpg`.

3. **Original sichern.** Kopiere das Originalbild nach
   `orig-pics/<name>.png` (dieser Ordner ist per `.gitignore` ausgeschlossen,
   wird also nie committet – dient nur als Referenz für Nachjustierungen).

4. **Crop-Ausschnitt bestimmen.** Miss/schätze im Originalbild ein
   quadratisches Ausschnitt-Rechteck `(x, y, kante)`, sodass:
   - der Kopf ca. 40–50 % der Kantenlänge einnimmt,
   - die Kopfmitte bei ca. 42 % der Höhe liegt (etwas Luft über dem Kopf,
     Kinn stößt nicht an den Kreisrand),
   - `x + kante <= Bildbreite` und `y + kante <= Bildhöhe`.
   Am schnellsten testet man das iterativ: mit Python/Pillow zuschneiden,
   das Ergebnis mit dem Read-Tool ansehen, bei Bedarf x/y/kante nachjustieren.
   Ein finaler Check mit runder Maske (wie die echte CSS-Maskierung) hilft:

   ```python
   from PIL import Image, ImageDraw
   im = Image.open(SRC).convert("RGB")
   crop = im.crop((x, y, x + k, y + k))
   mask = Image.new("L", crop.size, 0)
   ImageDraw.Draw(mask).ellipse((0, 0, *crop.size), fill=255)
   preview = Image.new("RGB", crop.size, (255, 255, 255))
   preview.paste(crop, (0, 0), mask)
   preview.save(PREVIEW_PATH)
   ```

5. **Auf 600×600 skalieren und als JPEG speichern.** `tools/crop.mjs` ist
   für macOS geschrieben (nutzt `sips`) – auf Linux/im Remote-Container gibt
   es kein `sips`. Falls Pillow fehlt: `pip install --quiet Pillow`. Dann:

   ```python
   from PIL import Image
   im = Image.open(f"orig-pics/{name}.png").convert("RGB")
   crop = im.crop((x, y, x + k, y + k)).resize((600, 600), Image.LANCZOS)
   crop.save(f"static/img/{name}.jpg", "JPEG", quality=85)
   ```

   Zielgröße liegt danach typischerweise bei 60–130 KB.

6. **Crop-Tabelle in `tools/crop.mjs` pflegen**, auch wenn das Skript selbst
   auf diesem Rechner nicht läuft – sie dokumentiert die Werte für später
   (macOS-Nutzer können `node tools/crop.mjs <name>` erneut ausführen).
   Zeile für `<name>` mit den echten Original-Maßen und dem neuen
   `x, y, kante` aktualisieren (oder neue Zeile ergänzen, falls neue Person).

7. **Ergebnis committen.** Nur `static/img/<name>.jpg` und `tools/crop.mjs`
   ändern sich (nicht `orig-pics/`, das ist gitignored). Kurze, beschreibende
   Commit-Message, z. B. `<Name>-Foto austauschen`.

8. **Nach main pushen, damit es deployed wird.** Der User hat für dieses
   Repo explizit gewünscht, Bildtausche direkt nach `main` zu pushen (nicht
   nur auf den Feature-Branch), weil main den Deploy auslöst:

   ```bash
   git push -u origin <aktueller-branch>
   git fetch origin main
   git checkout -B main origin/main
   git merge --ff-only <aktueller-branch>
   git push origin main:main
   git checkout <aktueller-branch>   # Branch danach wieder auschecken
   ```

   Falls `--ff-only` fehlschlägt (main hat sich seitdem weiterbewegt), nicht
   force-pushen – stattdessen kurz nachfragen bzw. sauber mergen/rebasen.

## Hinweise

- Mehrere Personen in einem Rutsch: Schritte 1–6 pro Person wiederholen,
  danach einmal gesammelt committen/pushen.
- Neue Person (noch kein Eintrag in `data/people.json`): zusätzlich einen
  Eintrag mit `slug`, `name`, `spruch`, `accent` ergänzen – sonst hat der
  Foto-Tausch keinen Effekt auf der Seite.
