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
| Basis-URL oder GA-ID setzen    | `site.config.json`                                    |
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

Am besten **quadratisch, ca. 600×600 px**. Das Bild wird rund beschnitten und
füllt den Kreis aus (`object-fit: cover`), Wichtiges gehört also in die Mitte.
Breite Bilder verlieren links und rechts etwas – bei Logos mit Schriftzug fällt
das schnell auf.

Fehlt ein Bild, nimmt der Build automatisch einen Platzhalter und sagt beim
Bauen Bescheid.

## Veröffentlichen (GitHub Pages)

1. Repo auf GitHub anlegen und pushen.
2. Unter **Settings → Pages → Build and deployment → Source** auf **GitHub Actions** stellen.
3. In `site.config.json` die `baseUrl` auf die echte Adresse setzen, **ohne Slash am Ende**:
   ```json
   "baseUrl": "https://deinname.github.io/fruende"
   ```
4. Pushen. Der Workflow in `.github/workflows/deploy.yml` baut und deployt automatisch.

> **Kurze URL = besser scannbarer Code.** Jedes Zeichen mehr in der URL macht den
> QR-Code dichter, und auf dehnbarem Stoff sinkt damit die Scanrate. Eine kurze
> eigene Domain ist ideal; sonst lieber ein kurzes, ASCII-reines Repo wie
> `fruende` als etwas Langes mit Umlaut – letzteres landet als
> `EchteFr%C3%BCnde…` in der URL und bläht den Code unnötig auf.

## Google Analytics einrichten

1. In [analytics.google.com](https://analytics.google.com) eine Property mit einem
   Web-Datenstream anlegen und die Mess-ID kopieren (Format `G-XXXXXXXXXX`).
2. Die ID in `site.config.json` unter `ga4Id` eintragen und neu bauen.

Solange `ga4Id` leer ist, wird gar kein Analytics-Code eingebaut – lokales Testen
verfälscht die Statistik also nicht.

**Scans pro Person ablesen:** jeder Scan ist ein Seitenaufruf des Pfads `/1/`,
`/2/` usw. Zu finden unter *Berichte → Interaktion → Seiten und Bildschirme*.
Welche Ziffer zu wem gehört, steht in `data/people.json` – und auf dem QR-Bogen.

Zusätzlich sendet jede Karte ein Event `scan` mit dem Parameter `person`. Damit
GA4 diesen Parameter in Berichten anzeigt, muss er einmalig registriert werden:
*Verwaltung → Datenanzeige → Benutzerdefinierte Definitionen → Benutzerdefinierte
Dimension erstellen*, Bereich **Ereignis**, Ereignisparameter `person`. Danach
lässt sich ein Bericht bauen, der die zehn direkt als Rangliste zeigt.

Neue Daten brauchen bis zu 24 h; sofort sichtbar ist alles unter
*Berichte → Echtzeit*.

## QR-Codes drucken

`npm run build` erzeugt sie automatisch mit. Danach `dist/qr/index.html` öffnen –
dort liegen alle zehn nebeneinander, mit Ziel-URL darunter und Download-Links:

- `<slug>.svg` – schwarz auf weiss, für helle Shirts
- `<slug>-invert.svg` – weiss auf transparent, für dunkle Shirts

Beides sind Vektordateien und lassen sich beliebig vergrössern.

**Vor dem Druck unbedingt:**

1. `baseUrl` in `site.config.json` final setzen und neu bauen.
2. Die Seite deployen und prüfen, dass die Karten wirklich erreichbar sind.
3. Jeden Code einmal vom Bildschirm mit dem Handy scannen.

Für den Textildruck: mindestens **4 × 4 cm**, die weisse Fläche rundherum
(Quiet Zone) nicht wegschneiden, und ausreichend Kontrast zum Shirt lassen.

## Aufbau

```
data/people.json      Inhalte aller zehn Personen
site.config.json      Basis-URL, GA-Mess-ID, Titel
src/templates.mjs     HTML der Karten, Übersicht, Datenschutz, 404, QR-Bogen
src/icons.mjs         Icons und URL-Aufbau der Kontakt-Buttons
src/style.css         gesamtes Design
static/img/           Profilbilder, Platzhalter, Favicon
build.mjs             baut dist/ inklusive QR-Codes
dist/                 generiert – nicht von Hand bearbeiten
```

Die ausgelieferten Karten sind reines HTML und CSS. JavaScript läuft nur für
Analytics – fällt es aus, ist die Visitenkarte trotzdem vollständig da.
