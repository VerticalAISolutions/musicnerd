# Ablauf: Genre & Zeitraum → API-Call

## 1. Was der User wählt

- **Genres:** Mehrfachauswahl aus der Liste (z. B. Rock, Pop, Indie). Gespeichert in `selectedGenres` als Set von IDs (z. B. `['rock', 'pop', 'indie']`).
- **Zeitraum:** Zwei Slider (von–bis). Gespeichert in `yearMin` und `yearMax` (z. B. 1980–2000).
- **Schwierigkeit:** Beginner / Intermediate / Expert → `selectedDifficulty`.
- Beim Klick auf **„Spiel starten“** wird `startGame()` ausgeführt.

---

## 2. Wann der API-Call passiert

Der Suggest-Song-API-Call wird an **zwei Stellen** ausgelöst:

1. **Beim Start des Spiels** (`startGame()`):  
   Sobald der User „Spiel starten“ klickt, wird die Songliste geladen und in `songQueue` geschrieben. Danach startet `loadNewSong()` und nimmt Songs aus dieser Queue.

2. **Beim Nachladen** (`loadNewSong()`):  
   Wenn die Queue leer ist (z. B. nach mehreren Runden), wird erneut eine Liste vom Server geholt, um die Queue aufzufüllen. Dabei werden bereits gespielte Songs herausgefiltert.

---

## 3. So sieht der API-Call genau aus

### URL

- **Lokal:** `http://localhost:3001/api/suggest-song`
- Abgeleitet aus `OPENAI_PROXY_URL`:  
  `OPENAI_SUGGEST_URL = OPENAI_PROXY_URL.replace(/\/api\/song-info\/?$/, '') + '/api/suggest-song'`  
  Also: Basis-URL des Proxys + `/api/suggest-song`.

### Methode & Headers

- **Methode:** `POST`
- **Header:** `Content-Type: application/json`

### Request-Body (JSON)

Der Body wird in `fetchSuggestSongList(genreNames, difficulty, yearMinVal, yearMaxVal, 12)` so aufgebaut:

```json
{
  "genres": ["Rock", "Pop", "Indie"],
  "difficulty": "beginner",
  "yearMin": 1980,
  "yearMax": 2000,
  "count": 12
}
```

- **genres:** Array der **Namen** der gewählten Genres (nicht die IDs).  
  Ermittelt mit: `genres.filter(g => selectedGenres.has(g.id)).map(g => g.name)`  
  Beispiel: User wählt Rock, Pop, Indie → `["Rock", "Pop", "Indie"]`.
- **difficulty:** Aktuelles Schwierigkeitslevel, z. B. `"beginner"`, `"intermediate"`, `"expert"`.
- **yearMin / yearMax:** Die Werte aus den Slidern (`yearMin`, `yearMax`).
- **count:** Immer **12** (Anzahl gewünschter Song-Vorschläge). Der Server begrenzt auf 5–15.

### Beispiel (ein konkreter Request)

User wählt: **Rock**, **Indie**, Zeitraum **1990–2005**, Schwierigkeit **Intermediate**.

```http
POST http://localhost:3001/api/suggest-song
Content-Type: application/json

{
  "genres": ["Rock", "Indie"],
  "difficulty": "intermediate",
  "yearMin": 1990,
  "yearMax": 2005,
  "count": 12
}
```

---

## 4. So sieht die Antwort (Response) aus

### Erwartetes Format vom Server

Der Server antwortet mit **JSON** in einem dieser Formate:

**Erfolg (Songs gefunden):**

```json
{
  "songs": [
    { "artist": "Radiohead", "song": "Creep" },
    { "artist": "Nirvana", "song": "Smells Like Teen Spirit" },
    { "artist": "Oasis", "song": "Wonderwall" }
  ]
}
```

- **songs:** Array von Objekten mit genau **artist** (string) und **song** (string).
- Der Server parst die OpenAI-Antwort (die ein Objekt `{ "songs": [ { artist, song, trap }, ... ] }` enthält), filtert nach Blocklist/Duplikaten und schneidet auf `count` (max 15). Die **trap**-Daten werden nicht ans Frontend geschickt (nur bei `DEBUG_SUGGEST_SONGS=true` optional in `debug`).

**Fehler oder keine Songs:**

```json
{
  "error": "Keine gültigen Songs",
  "songs": []
}
```

oder (bei OpenAI-Fehler):

```json
{
  "error": "OpenAI Fehler",
  "songs": []
}
```

### Was das Frontend damit macht

1. `data = await res.json()` – Response parsen.
2. `list = Array.isArray(data.songs) ? data.songs : []` – Liste holen (bei Fehler leeres Array).
3. Nur Einträge mit `artist` und `song` behalten, Blocklist prüfen (`isOriginalSuggestion`), Duplikate entfernen (`dedupeSongList`).
4. Ergebnis in `songQueue` schreiben. Danach sucht `loadNewSong()` für jeden Eintrag per iTunes (Original-Artist + Songtitel) und spielt die früheste gültige Version.

### Konkretes Beispiel: erster Call beim „Spiel starten“

**Request (Beispiel):**

```http
POST http://localhost:3001/api/suggest-song
Content-Type: application/json

{
  "genres": ["Rock", "Pop"],
  "difficulty": "beginner",
  "yearMin": 1990,
  "yearMax": 2005,
  "count": 12
}
```

**Response (Beispiel bei Erfolg):**

```json
{
  "songs": [
    { "artist": "Radiohead", "song": "Creep" },
    { "artist": "Nirvana", "song": "Smells Like Teen Spirit" },
    { "artist": "Oasis", "song": "Wonderwall" },
    { "artist": "Blur", "song": "Song 2" },
    { "artist": "The Verve", "song": "Bitter Sweet Symphony" }
  ]
}
```

(Der Server liefert maximal 15 Einträge; das Frontend hat 12 angefragt.)

**Response bei Fehler (z. B. OpenAI-Key fehlt):**

```json
{
  "error": "OpenAI Fehler",
  "songs": []
}
```

Dann bleibt `songQueue` leer und das Frontend fällt auf die **statische Genre-Liste** (Fallback) zurück – dort sind feste Suchbegriffe wie `"nirvana smells like teen spirit"` hinterlegt.

---

## 5. Was der Server damit macht

1. **Request parsen:** `genres`, `difficulty`, `yearMin`, `yearMax`, `count` aus dem Body.
2. **Genres:** Falls `genres` ein Array ist, wird es genutzt; sonst Fallback (z. B. `['Pop']`). Für den Prompt werden die Genres zu einem String zusammengefügt, z. B. `"Rock, Indie"`.
3. **Anzahl:** `count` wird auf 5–15 begrenzt (z. B. 12).
4. **OpenAI aufrufen:** Mit einem Kuratoren-Prompt, in dem u. a. vorkommen:
   - Genres: `genreStr`
   - Schwierigkeit: `difficulty`
   - Zeitspanne: `yearMin`–`yearMax` (z. B. 1990–2005)
   - Anzahl: `numSongs` (z. B. 12)
5. **Antwort verarbeiten:** JSON-Array aus der Antwort parsen, Blocklist anwenden (z. B. keine Covers/Tribute), Duplikate entfernen.
6. **Response:** JSON zurück an das Frontend: `{ "songs": [ { "artist": "...", "song": "..." }, ... ] }`.

---

## 5. Was das Frontend mit der Antwort macht

1. **Antwort lesen:** `data.songs` als Array von `{ artist, song }`.
2. **Normalisieren:** Einträge ohne `artist`/`song` rausfiltern, Strings trimmen.
3. **Blocklist:** `isOriginalSuggestion()` – Einträge mit verbotenen Künstlern/Titeln (z. B. Covers, Karaoke, „Vitamin String Quartet“) werden verworfen.
4. **Deduplizieren:** `dedupeSongList()` – gleicher Artist+Song nur einmal.
5. **Queue füllen:**  
   - Beim Start: `songQueue = dedupeSongList(list)`.  
   - Beim Nachladen: bereits gespielte Songs aus der Liste filtern, dann `songQueue = dedupeSongList(withoutPlayed)`.
6. **Songs abspielen:** `loadNewSong()` nimmt nacheinander Einträge aus `songQueue`, sucht sie per **iTunes Search API** (z. B. `artist + song`), prüft mit `isNoCover` und Jahr, wählt ein gültiges Ergebnis (z. B. früheste Version) und spielt die Preview ab.

---

## Kurzüberblick

| Schritt | Ort | Aktion |
|--------|-----|--------|
| 1 | User | Wählt Genres (IDs), Zeitraum (yearMin/yearMax), Schwierigkeit. |
| 2 | Frontend | Bei „Spiel starten“ oder leerer Queue: `fetchSuggestSongList(genreNames, selectedDifficulty, yearMin, yearMax, 12)`. |
| 3 | Frontend | `POST` an `OPENAI_SUGGEST_URL` mit Body `{ genres, difficulty, yearMin, yearMax, count: 12 }`. |
| 4 | Server | Parst Body, baut Kuratoren-Prompt mit Genres, Zeitraum, Schwierigkeit, ruft OpenAI auf, filtert Blocklist/Duplikate. |
| 5 | Server | Antwort: `{ "songs": [ { "artist", "song" }, ... ] }`. |
| 6 | Frontend | Filtert Blocklist, dedupliziert, füllt `songQueue`. Für jeden Song: iTunes-Suche → Filter → Abspielen. |

---

## Erster API-Call – Roh-Beispiel (Request & Response)

### Request (genau so geht er raus)

**URL:** `POST http://localhost:3001/api/suggest-song`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON), z. B. bei Start mit Rock, Pop, 1990–2005, Beginner:**
```json
{
  "genres": ["Rock", "Pop"],
  "difficulty": "beginner",
  "yearMin": 1990,
  "yearMax": 2005,
  "count": 12
}
```

### Response – Erfolg

**Status:** `200 OK`  
**Content-Type:** `application/json`

**Body (Beispiel):**
```json
{
  "songs": [
    { "artist": "Radiohead", "song": "Creep" },
    { "artist": "Nirvana", "song": "Smells Like Teen Spirit" },
    { "artist": "Oasis", "song": "Wonderwall" },
    { "artist": "Blur", "song": "Song 2" },
    { "artist": "The Verve", "song": "Bitter Sweet Symphony" },
    { "artist": "Green Day", "song": "Basket Case" }
  ]
}
```

Es können weniger als 12 Einträge sein (z. B. nach Blocklist/Deduplizierung). Das Frontend nutzt diese Liste als `songQueue` und sucht pro Eintrag bei iTunes (Artist + Song).

### Response – Fehler / keine Songs

**Body (z. B. OpenAI-Key fehlt oder API-Fehler):**
```json
{
  "error": "OpenAI Fehler",
  "songs": []
}
```

**Body (OpenAI liefert nichts Brauchbares):**
```json
{
  "error": "Keine gültigen Songs",
  "songs": []
}
```

In beiden Fällen ist `songs` leer → das Frontend füllt **keine** Queue und fällt auf die **statische Genre-Liste** (Fallback) zurück. Dann kommen nur die fest eingetragenen Suchbegriffe aus `genres[].beginner`/`intermediate`/`expert` dran – und die können sich wiederholen oder bei iTunes zu Covers führen.

---

## Warum es „funktioniert so leider überhaupt nicht“

Checkliste typischer Ursachen:

| Ursache | Was du siehst / prüfen |
|--------|-------------------------|
| **Server läuft nicht** | `OPENAI_SUGGEST_URL` ist `http://localhost:3001/api/suggest-song` – wenn der Server nicht läuft, schlägt der Request fehl (Netzwerkfehler). **Lösung:** Im Projektordner `npm start` (oder `node server.js`), dann Seite neu laden. |
| **OpenAI-Key fehlt** | Server antwortet mit `{ "error": "OpenAI Fehler", "songs": [] }`. **Lösung:** In `.env` `OPENAI_API_KEY=sk-...` eintragen und Server neu starten. |
| **Seite als file:// geöffnet** | Manche Browser blockieren Requests von `file://` zu `localhost`. **Lösung:** Seite über einen lokalen Webserver öffnen (z. B. `npx serve .` im Projektordner und dann `http://localhost:3000`). |
| **API liefert nur Covers/Blocklist** | Nach Server-Filter ist `songs` leer oder sehr klein. **Prüfen:** Im Server `DEBUG_SUGGEST_SONGS=true` setzen, dann liefert die Response ein Feld `debug` mit den gefilterten Vorschlägen. |
| **iTunes liefert nur Covers** | API-Response ist ok, aber für jeden Vorschlag findet iTunes nur Remix/Cover/Live und alle werden von `isNoCover` / `resultArtistIsPrimary` verworfen → kein Song wird geladen. **Ergebnis:** Fallback auf statische Liste, die sich wiederholt. |
| **Immer derselbe Song (3×)** | Entweder die API liefert Duplikate (trotz Prompt), oder der Fallback (statische Liste) wird genutzt und derselbe Eintrag wird mehrfach per Zufall getroffen; oder `playedSongKeys` wird nicht korrekt befüllt. **Prüfen:** Console-Logs für `songQueue.length` und ob `fetchSuggestSongList` überhaupt eine nicht-leere Liste zurückgibt. |

**Schnell-Check:** In der Browser-Konsole (F12) nach dem Klick auf „Spiel starten“ prüfen: Gibt es einen Fehler beim `fetch` (z. B. „Failed to fetch“, „net::ERR_CONNECTION_REFUSED“)? Dann Server starten oder URL anpassen. Siehst du keine Fehler, aber trotzdem „Lade Song...“ und dann Fallback-Songs: Response vom Suggest-Song-Endpunkt prüfen (z. B. in den DevTools unter Network den Request `suggest-song` auswählen und Response ansehen – ob `songs` befüllt ist oder `error` + leeres `songs`).
