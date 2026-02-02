# MusicNerd deployen

## API-Key und Umgebungsvariablen

- **Der OpenAI-API-Key gehört nur auf den Server**, nicht ins Frontend und nicht in Git.
- `.env` steht in `.gitignore` – **niemals** die echte `.env` committen oder öffentlich hochladen.

### Auf dem Server (wo `server.js` läuft)

Du hast zwei Möglichkeiten:

1. **`.env`-Datei auf dem Server anlegen**  
   Auf dem Server (z.B. per SSH) im Projektordner eine Datei `.env` anlegen mit z.B.:
   ```env
   OPENAI_API_KEY=sk-dein-echter-key
   PORT=3001
   ```
   Der Server liest diese Datei beim Start über `dotenv`. Wichtig: Verzeichnisrechte so setzen, dass nur der Prozess die Datei lesen kann (z.B. `chmod 600 .env`).

2. **Umgebungsvariablen der Hosting-Plattform nutzen (empfohlen)**  
   Bei den meisten Anbietern (Railway, Render, Fly.io, Vercel Serverless, etc.) trägst du im Dashboard unter „Environment Variables“ / „Secrets“ ein:
   - `OPENAI_API_KEY` = dein Key  
   - optional `PORT` (oft von der Plattform vorgegeben).

Dann musst du **keine** `.env`-Datei auf den Server hochladen – der Key bleibt nur in der Plattform-Konfiguration.

---

## Frontend: Proxy-URL für Produktion

Die App (z.B. `index.html`) ruft den Proxy unter **`OPENAI_PROXY_URL`** auf. Lokal steht dort `http://localhost:3001/api/song-info`.

**Beim Deployen** muss diese URL auf deinen echten API-Server zeigen:

1. In `index.html` die Zeile mit `OPENAI_PROXY_URL` anpassen, z.B.:
   ```javascript
   const OPENAI_PROXY_URL = 'https://deine-api-domain.de/api/song-info';
   ```
   Ersetze `deine-api-domain.de` durch die echte URL, unter der dein Node-Server erreichbar ist (z.B. `https://musicnerd-api.railway.app/api/song-info`).

2. **Oder:** Wenn du Frontend und API unter derselben Domain auslieferst (z.B. Node serviert auch die HTML-Datei), kannst du eine relative URL verwenden:
   ```javascript
   const OPENAI_PROXY_URL = '/api/song-info';
   ```
   Dann funktioniert es lokal und in Produktion ohne Änderung, solange die App von derselben Origin aus geladen wird.

---

## Kurz-Checkliste

- [ ] API-Key **nur** auf dem Server (`.env` oder Umgebungsvariable der Plattform), nie im Frontend oder in Git.
- [ ] In `index.html`: `OPENAI_PROXY_URL` auf die Produktion-API-URL setzen (oder relative URL `/api/song-info` wenn gleiche Origin).
- [ ] Server starten (z.B. `npm start` oder durch die Plattform), CORS ist im Code bereits für `*` gesetzt.
- [ ] Optional: `PORT` in `.env` oder Umgebung setzen, falls der Hoster einen anderen Port verlangt.
