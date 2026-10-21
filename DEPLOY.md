# MusicNerd deployen

## API-Key und Umgebungsvariablen

- **Der OpenAI-API-Key gehört nur auf den Server**, nicht ins Frontend und nicht in Git.
- `.env` steht in `.gitignore` – **niemals** die echte `.env` committen oder öffentlich hochladen.

### Auf dem Server (wo `server.js` läuft)

1. **Umgebungsvariablen der Hosting-Plattform (empfohlen)**
   Im Dashboard unter „Environment Variables“ / „Secrets“ eintragen:
   - `OPENAI_API_KEY` = dein Key
   - optional `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`
   - optional `PORT` (oft von der Plattform vorgegeben)

2. **Oder `.env`-Datei auf dem Server**
   ```env
   OPENAI_API_KEY=sk-dein-echter-key
   PORT=3001
   ```
   Rechte einschränken: `chmod 600 .env`.

> **Wichtig, falls die App schon einmal mit älterem `server.js` online war:** Bis zu dieser Version hat der Server *jede* Datei im Projektordner ausgeliefert – auch `/.env`. Wenn dort ein Key lag und der Server öffentlich erreichbar war, den OpenAI-Key **rotieren**.

---

## Render

Das Repo enthält eine Blueprint-Datei `render.yaml` (Web Service, Node, Region Frankfurt, Free-Plan, Auto-Deploy bei Push auf `main`).

- **Neu anlegen:** Render-Dashboard → *New* → *Blueprint* → Repo `VerticalAISolutions/musicnerd` wählen → `OPENAI_API_KEY` (und optional Spotify) eintragen → *Apply*.
- **Bestehender Service:** Unter *Environment* `TRUST_PROXY=1` ergänzen – sonst teilen sich hinter Renders Load-Balancer alle Spieler ein Rate-Limit. Bei aktivem Auto-Deploy reicht danach ein Push auf `main`.
- Free-Plan schläft nach 15 Min. ohne Aufrufe ein; der erste Aufruf danach dauert ca. 30–60 s.

---

## Was der Server ausliefert

`server.js` liefert die App und die API von **derselben Domain** aus:

- **Statische Dateien:** nur die Freigabeliste `PUBLIC_FILES` in `server.js` (`index.html`, `curated-match.js`, `buttons/*.svg`, `fallback-genres/*.js`). Alles andere – `.env`, `server.js`, Doku – antwortet mit 404. Neue Dateien, die das Frontend lädt, dort eintragen.
- **API** unter `/api/*` (nur `POST`). Das Frontend ruft sie relativ auf (`/api/song-info` usw.) – beim Deployen muss in `index.html` **nichts angepasst** werden.

Wenn ein nginx davor steht und selbst statische Dateien ausliefert: dort ebenfalls nur diese Dateien freigeben oder zumindest Dotfiles sperren (`location ~ /\. { deny all; }`).

---

## Schutz der API

- **Rate-Limit pro IP** (Anfragen pro Minute, `RATE_LIMITS` in `server.js`): suggest-song 10, song-info 40, itunes-search/spotify-search je 150. Darüber antwortet der Server mit 429.
- **Hinter nginx:** Die echte Client-IP kommt aus `X-Forwarded-For` – der Header wird nur akzeptiert, wenn die Anfrage von `127.0.0.1` kommt. nginx muss ihn setzen:
  ```nginx
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  ```
  Ohne den Header teilen sich alle Spieler ein Limit.
- **Erklärtexte:** Der Prompt für `/api/song-info` wird auf dem Server gebaut; der Browser schickt nur Songdaten. Der Endpunkt ist also kein freier OpenAI-Zugang.
- **iTunes-Cache:** Suchergebnisse werden 1 Stunde im Speicher gehalten (iTunes erlaubt nur ca. 20 Anfragen/Minute pro Server-IP).
- **CORS** ist standardmäßig aus. Nur wenn das Frontend auf einer anderen Domain liegt: `CORS_ORIGIN=https://deine-frontend-domain.de` setzen.

---

## Kurz-Checkliste

- [ ] API-Key **nur** auf dem Server (Plattform-Variable oder `.env` mit `chmod 600`), nie im Frontend oder in Git.
- [ ] Bei vorherigem öffentlichen Betrieb mit `.env` im Projektordner: Key rotieren.
- [ ] nginx (falls vorhanden): `/api/*` an Node weiterleiten, `X-Forwarded-For` setzen, keine Dotfiles ausliefern.
- [ ] Server starten (`npm start` oder durch die Plattform).
- [ ] Kurztest: `curl -I https://deine-domain/.env` → muss **404** liefern.
