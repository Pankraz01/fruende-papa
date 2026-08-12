# Echte Fründe – Visitenkarten hinter den Shirt-QR-Codes

Zehn T-Shirts, zehn QR-Codes, zehn digitale Visitenkarten. Wer einen Code scannt,
landet direkt auf der Karte der Person: rundes Profilbild, Name, ein lustiger
Spruch und optionale Kontakt-Buttons.

Alles wird aus **einer** Datei erzeugt: [`data/people.json`](data/people.json).
Ein Build-Schritt macht daraus die zehn Seiten **und** die druckfertigen QR-Codes.

## Schnellstart

```bash
npm install && npm run build
```

Fertig gebaut liegt alles in `dist/`. Lokal anschauen:

```bash
npm start
```

Dann <http://localhost:5173> öffnen.

## Was wo geändert wird

| Ich will …                     | Datei                                                |
| ------------------------------ | ---------------------------------------------------- |
| Name oder Spruch ändern        | `data/people.json`                                    |
| Profilbild tauschen            | `static/img/<slug>.jpg`                               |
| Kontakt-Buttons anpassen       | `data/people.json` → `links`                          |
| Basis-URL oder Zähler setzen   | `site.config.json`                                    |
| Design ändern                  | `src/style.css`                                       |
| Aufbau der Seiten ändern       | `src/templates.mjs`                                   |

### Eine Person in `data/people.json`

```json
{
  "slug": "1",
  "name": "Pilla",
  "spruch": "Hier steht was Lustiges.",
  "accent": "#e8623d",
  "links": [
    { "type": "instagram", "value": "username" },
    { "type": "whatsapp", "value": "41791234567" }
  ]
}
```

- **`slug`** wird zur URL (`…/1/`) und zum Dateinamen des QR-Codes. Erlaubt sind
  Kleinbuchstaben, Ziffern und Bindestriche – bewusst nur eine Ziffer, weil jedes
  zusätzliche Zeichen den QR-Code dichter und auf Stoff schlechter scannbar macht.
  **Nach dem Druck der Shirts darf sich der Slug nicht mehr ändern** – sonst zeigt
  der Code ins Leere.
- **`accent`** ist die Farbe des Kartenkopfs und der Buttons. Weglassen geht auch.
- **`links`** darf leer sein (`[]`) – dann werden schlicht keine Buttons angezeigt.

Mögliche Link-Typen und was als `value` reingehört:

| `type`      | `value`                          | wird zu                          |
| ----------- | -------------------------------- | -------------------------------- |
| `instagram` | Benutzername                     | `instagram.com/name`             |
| `tiktok`    | Benutzername                     | `tiktok.com/@name`               |
| `snapchat`  | Benutzername                     | `snapchat.com/add/name`          |
| `linkedin`  | Profil-Kürzel oder ganze URL     | `linkedin.com/in/name`           |
| `whatsapp`  | Nummer mit Ländervorwahl, z. B. `41791234567` | `wa.me/41791234567` |
| `telefon`   | Telefonnummer                    | `tel:`                           |
| `email`     | E-Mail-Adresse                   | `mailto:`                        |
| `website`   | Domain oder ganze URL            | die Seite selbst                 |

### Profilbilder

Kommen nach `static/img/`. Der Dateiname darf entweder der Slug oder der Vorname
sein – beides wird gefunden, Gross-/Kleinschreibung egal:

```
static/img/8.png       ← geht
static/img/ivan.png    ← geht genauso
```

Erlaubt sind `.jpg`, `.jpeg`, `.png`, `.webp` und `.avif`. Wer es ganz explizit
will, setzt in `data/people.json` ein `"image": "irgendwas.jpg"` – das schlägt
beide Namenskonventionen.

Das Bild wird rund beschnitten und füllt den Kreis aus (`object-fit: cover`),
Wichtiges gehört also in die Mitte. Breite Bilder verlieren links und rechts
etwas – bei Logos mit Schriftzug fällt das schnell auf.

Fehlt ein Bild, nimmt der Build automatisch einen Platzhalter und sagt beim
Bauen Bescheid.

### Neue Fotos klein rechnen

Handyfotos haben gut und gern 5–10 MB. Angezeigt wird das Bild als 108-px-Kreis,
gebraucht wird davon also ein Bruchteil. Auf dem Mac reicht das eingebaute `sips`:

```bash
sips -s format jpeg -s formatOptions 85 -Z 800 FOTO.png --out static/img/name.jpg
```

`-Z 800` begrenzt die längere Kante auf 800 px, `formatOptions 85` ist die
JPEG-Qualität. Das ergibt rund 100–170 KB pro Bild, ohne dass man auf dem Handy
einen Unterschied sieht. Die Originale der zehn liegen unverändert in
`orig-pics/` – der Ordner ist in `.gitignore` und landet nicht auf GitHub.

## Veröffentlichen (GitHub Pages)

1. Repo auf GitHub anlegen und pushen.
2. Unter **Settings → Pages → Build and deployment → Source** auf **GitHub Actions** stellen.
3. In `site.config.json` steht die `baseUrl` – die echte Adresse, **ohne Slash am Ende**:
   ```json
   "baseUrl": "https://qr.danieljuric.eu"
   ```
4. Pushen. Der Workflow in `.github/workflows/deploy.yml` baut und deployt automatisch.

> **Kurze URL = besser scannbarer Code.** Jedes Zeichen mehr in der URL macht den
> QR-Code dichter, und auf dehnbarem Stoff sinkt damit die Scanrate.

### Eigene Domain (`qr.danieljuric.eu`)

Hat `baseUrl` **keinen Pfad** – nur Schema und Host, wie oben –, erkennt der
Build das automatisch als eigene Domain und schreibt beim nächsten `npm run
build` eine Datei `dist/CNAME` mit dem Hostnamen hinein. Das ist nötig, damit
GitHub Pages die Domain bei jedem einzelnen Deploy (neu) kennt – sonst würde
die Einstellung nur so lange gelten, bis das nächste Mal alles frisch gebaut
und hochgeladen wird.

Damit es funktioniert, ausserhalb dieses Repos:

1. Beim DNS-Anbieter von `danieljuric.eu` einen **CNAME-Eintrag** für `qr`
   anlegen, der auf `pankraz01.github.io` zeigt.
2. In den Repo-Settings unter **Pages → Custom domain** `qr.danieljuric.eu`
   eintragen (falls nicht schon durch die CNAME-Datei erkannt) und speichern.
3. Etwas warten, bis GitHub die Domain per DNS verifiziert hat – kann von
   Minuten bis zu 24 Stunden dauern.

**SSL-Zertifikat:** kein manueller Schritt nötig. Sobald GitHub die Domain
verifiziert hat, stellt es automatisch und kostenlos ein Let's-Encrypt-Zertifikat
aus. Danach in denselben Settings **Enforce HTTPS** anhaken, sobald die Option
anwählbar wird.

**Falls die Domain über Cloudflare läuft** (orange Wolke / Proxy aktiv): das
kann Githubs automatische Zertifikatsausstellung stören, weil GitHub beim
Verifizieren direkt auf seine eigenen Server auflösen will, aber stattdessen
Cloudflare antwortet. Für einen unkomplizierten Start den DNS-Eintrag für `qr`
zunächst auf **„DNS only“** (graue Wolke) stellen, bis „Enforce HTTPS“ in den
GitHub-Settings aktivierbar ist. Ob und wie stattdessen eine geproxte
Einrichtung sinnvoll ist, hängt davon ab, wie der Scan-Zähler künftig
funktionieren soll – siehe nächster Abschnitt.

## Scan-Zähler einrichten (Cloudflare)

GitHub Pages zählt selbst nichts – es gibt dort keine Logs, keine Statistik, keine
API. (Die Zahlen unter *Insights → Traffic* im Repo zählen Aufrufe der
**Repo-Seite auf github.com**, nicht die gescannten Visitenkarten.) Der Zähler
läuft deshalb als eigener kleiner Cloudflare Worker. **Die Seite bleibt auf
GitHub Pages, die `baseUrl` und damit die gedruckten QR-Codes ändern sich nicht.**

Gezählt wird über ein unsichtbares 1×1-Pixel-Bild auf jeder Karte. Das braucht
kein JavaScript und keine CORS-Vorabanfrage.

Alles liegt in `worker/`. Die einmalige Einrichtung läuft in einem normalen
Terminal, alle Befehle im Ordner `worker/`. `login` öffnet den Browser zur
Anmeldung; `npx` lädt wrangler bei Bedarf, eine globale Installation ist nicht
nötig.

> **Stand 11.08.2026:** Schritt 1 und 2 sind bereits erledigt. Die Datenbank
> `fruende-scans` existiert (Region WEUR), die Tabelle `scans` samt Indizes ist
> eingespielt, und die `database_id` steht in `worker/wrangler.toml`. Offen sind
> nur noch `login`, `deploy` und das Eintragen der `counterUrl`. Die Schritte 1
> und 2 stehen hier trotzdem, falls die Datenbank mal neu aufgesetzt werden muss.

```bash
cd worker
npx wrangler@latest login
```

**1. Datenbank anlegen** (D1, im kostenlosen Kontingent enthalten):

```bash
npx wrangler@latest d1 create fruende-scans
```

Der Befehl gibt eine `database_id` aus. Die in `worker/wrangler.toml` bei
`database_id` eintragen.

**2. Tabelle anlegen:**

```bash
npx wrangler@latest d1 execute fruende-scans --remote --file=schema.sql
```

**3. Worker veröffentlichen:**

```bash
npx wrangler@latest deploy
```

Am Ende steht die Adresse des Workers, etwa
`https://fruende-scans.dein-name.workers.dev`.

**4. Adresse eintragen** in `site.config.json` unter `counterUrl`, **ohne Slash
am Ende**, dann neu bauen und pushen:

```json
"counterUrl": "https://fruende-scans.dein-name.workers.dev"
```

Solange `counterUrl` leer ist, wird kein Pixel eingebaut – lokales Testen
verfälscht die Statistik also nicht.

### Zahlen ansehen

Die Rangliste steht öffentlich unter `/stats/` und ist von der Startseite aus
verlinkt. Rohdaten als JSON gibt es unter `<counterUrl>/stats`.

### Was gespeichert wird

Pro Aufruf genau drei Angaben: **welche Karte**, **wann** und die **Herkunft**
(`scan`, `main` oder `card`). Keine IP-Adresse, kein User-Agent, kein Cookie,
keine Kennung, mit der sich zwei Scans einander zuordnen liessen. Deshalb
braucht die Seite auch kein Consent-Banner. Die Datenschutzseite beschreibt
genau das – wenn du am Worker etwas änderst, halte sie bitte aktuell
(`privacyPage` in `src/templates.mjs`).

### Scan, Durchklicken oder Direktaufruf

Wer über die Übersicht alle zehn Karten anschaut, würde sonst zehn Scans
erzeugen. Deshalb hält jeder Datensatz fest, woher der Aufruf kam:

| Wert     | Bedeutung |
| -------- | --------- |
| `scan`   | die aufgerufene Adresse trug das Merkmal `?s` – das steht **nur** in den gedruckten QR-Codes |
| `panel`  | kein Merkmal, aber Referrer ist die eigene Seite – Klick von der Übersicht oder einer anderen Karte |
| `direct` | weder noch – eingetippt, Lesezeichen, oder ein Link, dessen Referrer die App unterdrückt hat |

Das Merkmal steckt **ausschliesslich im Bild** des QR-Codes (`build.mjs` hängt
es beim Erzeugen an) – nirgends im für Menschen sichtbaren Text: nicht im
QR-Bogen, nicht in `og:url`, nicht im Footer-Link. Wer die Adresse abtippt oder
weiterleitet, verbreitet also nicht versehentlich das Merkmal mit.

Die Rangliste sortiert nach `scan`; `panel` und `direct` werden als zusätzliche
Balkensegmente daneben angezeigt, zählen aber nicht zur Platzierung – sonst
könnte man sich durch simples Herumklicken selbst nach oben bringen.

Ermittelt wird beides im Browser (`location.search` bzw. `document.referrer`),
**nicht** serverseitig. Ohne JavaScript greift ein `<noscript>`-Pixel: dann
wird weiterhin gezählt, aber immer als `direct`, weil sich die Adresszeile ohne
JS nicht auslesen lässt.

Vorschau-Bots von WhatsApp, Telegram & Co. werden am User-Agent erkannt und
nicht mitgezählt, sonst würde jeder geteilte Link die Statistik aufblähen.

**Nach jeder Änderung an dieser Logik** (in `worker/src/index.js`) muss der
Worker neu deployt werden, sonst zählt er nach den alten Regeln weiter:

```bash
cd worker && npx wrangler@latest deploy
```

### Wenn jemand dazukommt

Die erlaubten Slugs stehen im Worker als Liste (`SLUGS` in `worker/src/index.js`)
und müssen zu `data/people.json` passen. Kommt eine elfte Person dazu: dort
ergänzen und `npx wrangler@latest deploy` erneut ausführen. Alles andere wird still
ignoriert – so landet kein Müll in der Datenbank.

## QR-Codes drucken

`npm run build` erzeugt sie automatisch mit. Danach `dist/qr/index.html` öffnen –
dort liegen alle zehn nebeneinander, mit Ziel-URL darunter und Download-Links:

- `<slug>.svg` / `<slug>.eps` – schwarz auf weiss, für helle Shirts
- `<slug>-invert.svg` / `<slug>-invert.eps` – weiss auf transparent, für dunkle Shirts

Alles Vektordateien, beliebig vergrösserbar. **EPS** ist für Druckereien dabei,
deren Software kein SVG einliest – inhaltlich identisch zum jeweiligen SVG,
selbst erzeugt aus derselben QR-Kodierung (`src/eps.mjs`), nicht konvertiert.
Die EPS-Farben sind einfaches RGB-Schwarz bzw. -Weiss; verlangt eine Druckerei
Vollton-/Sonderfarbe (Spot Black), müssen sie das in ihrer eigenen Software
umfärben.

Oben auf der Seite gibt es zusätzlich **„Alle 40 Dateien als ZIP
herunterladen“** – praktisch, um alles in einem Rutsch an eine Druckerei zu
schicken. Das ZIP wird beim Build mit erzeugt (`dist/qr/alle-qr-codes.zip`,
`src/zip.mjs`), nicht erst im Browser gepackt. Die Dateien darin heissen
`<slug>-<name>.<endung>`, z. B. `8-ivan.eps`, statt nur `8.eps` – besser
lesbar, sobald das Archiv einmal entpackt ist.

**Vor dem Druck unbedingt:**

1. `baseUrl` in `site.config.json` final setzen und neu bauen.
2. Die Seite deployen und prüfen, dass die Karten wirklich erreichbar sind.
3. Jeden Code einmal vom Bildschirm mit dem Handy scannen.

Für den Textildruck: mindestens **4 × 4 cm**, die weisse Fläche rundherum
(Quiet Zone) nicht wegschneiden, und ausreichend Kontrast zum Shirt lassen.

## Aufbau

```
data/people.json      Inhalte aller zehn Personen
site.config.json      Basis-URL, Zähler-Adresse, Titel
src/templates.mjs     HTML der Karten, Übersicht, Statistik, Datenschutz, 404, QR-Bogen
worker/               Cloudflare Worker: Scan-Zähler und Auswertung
src/icons.mjs         Icons und URL-Aufbau der Kontakt-Buttons
src/eps.mjs           QR-Codes als EPS zeichnen (aus der rohen Modul-Matrix)
src/style.css         gesamtes Design
static/img/           Profilbilder, Platzhalter, Favicon
static/fonts/         Fraktur-Schrift für den Titel der Startseite
orig-pics/            unbearbeitete Originalfotos (gitignored)
build.mjs             baut dist/ inklusive QR-Codes
dist/                 generiert – nicht von Hand bearbeiten
```

Der Titel „Echte Fründe" auf der Startseite läuft in **UnifrakturMaguntia**
(SIL Open Font License 1.1). Die Schrift liegt selbst gehostet im Repo, es wird
beim Scannen also kein Google-Server kontaktiert. Nur die Startseite benutzt sie –
die Kartenseiten laden die Datei gar nicht erst.

Die zehn Kartenseiten – also genau das, was beim Scannen aufgerufen wird – sind
reines HTML und CSS, ganz ohne JavaScript. Auch der Scan-Zähler kommt ohne aus,
weil er ein Bild und kein Skript ist. JavaScript läuft einzig auf der
Statistikseite `/stats/`, um die Zahlen nachzuladen.
