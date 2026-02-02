# Protokoll: Bekannte Probleme und Gegenmaßnahmen

Dieses Dokument fasst alle in der Entwicklung von MusicNerd aufgetretenen Probleme zusammen sowie die ergriffenen oder empfohlenen Gegenmaßnahmen.

---

## 1. Covers, Remixes, Remasters, Live-Versionen

### Problem

Statt der Originalversion erscheinen:

- Cover-Versionen (z. B. Vitamin String Quartet, The Chant Masters, Piano Guys)
- Remixe, Remaster, Live-Aufnahmen (z. B. „Smells Like Teen Spirit (Butch Vig Mix)“)
- Tribute-/Karaoke-Interpreten
- Titel mit „feat.“ / „featuring“ oder „(Live)“

### Ursachen

- **OpenAI:** Der Kuratoren-Prompt wird ignoriert oder umgangen; es werden trotzdem Cover-Künstler oder -Titel vorgeschlagen.
- **iTunes Search API:** Bei der Suche nach „Artist + Song“ liefert iTunes oft zuerst Remaster-, Live- oder Cover-Versionen; die Originalversion steht weiter hinten oder fehlt.

### Umgesetzte Gegenmaßnahmen

- **Server (`server.js`):** Strikter Kuratoren-Prompt („KRITISCH – ZUERST LESEN“), explizite Blocklist für Künstler/Titel (z. B. Vitamin String Quartet, Chant Masters, feat./featuring), Filterung vor der Rückgabe. `temperature` auf 0,3 gesenkt.
- **Frontend (`index.html`):** Blocklist `BLOCKLIST_ARTIST` / `BLOCKLIST_SONG`, `isOriginalSuggestion()` für API-Vorschläge; `isNoCover()` für iTunes-Ergebnisse (Track, Album, Artist). `resultArtistIsPrimary()` stellt sicher, dass nur Treffer mit dem **Original-Interpreten** akzeptiert werden (kein „Radiohead Tribute Band“ bei Vorschlag „Radiohead“).
- **iTunes-Auswahl:** Es wird die **früheste** Version (nach `releaseDate`) gewählt, um möglichst das Original zu treffen.

### Offen / Einschränkung

- Neue Cover-Interpreten oder Formulierungen können die Blocklist noch nicht abdecken.
- Wenn iTunes für einen Vorschlag **nur** Covers/Remaster liefert, wird der Eintrag verworfen und der nächste versucht; wenn alle durchfallen, greift der Fallback (statische Liste).

---

## 2. Falsches Erscheinungsjahr (Re-Release statt Original)

### Problem

Angezeigt wird das Jahr einer **Neuauflage** statt der **Erstveröffentlichung**, z. B.:

- „I Want to Break Free“ (Queen) → 2018 statt 1984
- „Stairway to Heaven“ → Remaster-Jahr statt 1971

### Ursachen

- iTunes liefert oft Remaster-/Deluxe-/Anniversary-Versionen zuerst; deren `releaseDate` ist das Re-Release-Jahr.
- Die Auswahl logik hat zunächst „beliebige“ Treffer genutzt statt gezielt die früheste Version.

### Umgesetzte Gegenmaßnahmen

- **Immer früheste Version:** `searchItunesForOriginal` sortiert alle gültigen Treffer nach `releaseDate` und wählt `valid[0]` (älteste Version) → angezeigt wird das **Original-Erscheinungsjahr**.
- **Zeitraum-Check:** Wenn der User einen Zeitraum (z. B. 2000–2025) gewählt hat und die **früheste** gefundene Version **außerhalb** dieses Zeitraums liegt (z. B. 1984), wird der Vorschlag verworfen (kein 80er-Song, wenn nur 2000–2025 gewünscht).

---

## 3. Duplikate (dieselben Songs mehrfach)

### Problem

- Derselbe Song erscheint mehrfach in einer Session (z. B. dreimal hintereinander).
- In der API-Antwort tauchen gleiche Artist+Song-Kombinationen in anderer Schreibweise auf (z. B. „Queen“ vs. „Queen (UK)“).

### Ursachen

- **OpenAI:** Trotz Anweisung „Keine Duplikate“ werden manchmal doppelte oder leicht abweichende Einträge geliefert.
- **Fallback:** Die statische Genre-Liste wird per Zufall durchsucht; derselbe Eintrag kann mehrfach gezogen werden.
- **Deduplizierung:** Leichte Schreibvarianten (Klammern, „- Topic“) wurden nicht als derselbe Song erkannt.

### Umgesetzte Gegenmaßnahmen

- **Normalisierung:** `normalizeForDedup(str)` entfernt Klammer-Suffixe (z. B. „(UK)“), „- Topic“ etc.; Deduplizierung erfolgt über `normalizeForDedup(artist)|normalizeForDedup(song)` (Server und Frontend).
- **Server:** Pro Batch maximal ein Song pro Artist (`seenArtist`), Duplikate werden vor der Rückgabe gefiltert.
- **Frontend:** `dedupeSongList()` mit derselben Normalisierung; `playedSongKeys` speichert alle bereits gespielten Songs – beim Nachladen und im Fallback werden bereits gespielte Songs übersprungen.
- **Fallback:** Beim Ziehen aus der statischen Liste wird `playedSongKeys` geprüft und der Versuch mehrfach wiederholt (mehrere Versuche), um Wiederholungen zu reduzieren.

### Offen / Einschränkung

- Wenn die API weiterhin viele Duplikate liefert, kann die Queue nach Filterung sehr klein werden.
- Im Fallback bleibt ein Restrisiko für Wiederholungen bei kleiner Genre-Liste.

---

## 4. API-Call / Suggest-Song „funktioniert überhaupt nicht“

### Problem

- Beim „Spiel starten“ passiert scheinbar nichts Sinnvolles oder es erscheinen nur wenige / immer gleiche Songs.
- Nutzerfeedback: „Es funktioniert so leider überhaupt nicht.“

### Mögliche Ursachen und Prüfpunkte

| Ursache | Erscheinung | Gegenmaßnahme / Prüfung |
|--------|-------------|--------------------------|
| **Server läuft nicht** | `fetch` schlägt fehl (z. B. „Failed to fetch“, „ERR_CONNECTION_REFUSED“). | Im Projektordner `npm start` bzw. `node server.js`, Seite neu laden. |
| **OpenAI-Key fehlt oder ungültig** | Server antwortet mit `{ "error": "OpenAI Fehler", "songs": [] }`. | In `.env` `OPENAI_API_KEY=sk-...` eintragen, Server neu starten. |
| **Seite als file:// geöffnet** | Browser blockiert Requests von `file://` zu `localhost`. | Seite über lokalen Webserver öffnen (z. B. `npx serve .` → `http://localhost:3000`). |
| **API liefert nur Blocklist-Treffer** | Nach Filterung ist `songs` leer oder sehr klein. | Server mit `DEBUG_SUGGEST_SONGS=true` starten; Response enthält dann `debug` mit den gefilterten Vorschlägen. |
| **iTunes liefert nur Covers** | API-Response ist in Ordnung, aber für **jeden** Vorschlag liefert iTunes nur Remix/Cover/Live → alle werden verworfen → keine Queue gefüllt. | Folge: Fallback auf statische Liste; dann Wiederholungen/Covers aus der Liste möglich. Debug: `window.DEBUG_SUGGEST = true` in Konsole, „Spiel starten“ – prüfen, ob Response `songs` befüllt hat. |
| **Immer derselbe Song (z. B. 3×)** | Duplikate von der API oder Fallback zieht mehrfach denselben Eintrag; oder `playedSongKeys` wird nicht korrekt befüllt. | Siehe Abschnitt 3. In Konsole prüfen: `songQueue.length`, ob `fetchSuggestSongList` eine nicht-leere Liste zurückgibt. |

### Debug-Hinweise

- **Browser:** F12 → Konsole. `window.DEBUG_SUGGEST = true` setzen, dann „Spiel starten“. Es erscheinen „Suggest-Song Request“, „Suggest-Song Response“ und „Suggest-Song nach Filter/Dedup“.
- **Network:** Im Tab „Network“ den Request `suggest-song` auswählen und Response ansehen – ob `songs` befüllt ist oder `error` + leeres `songs`.

Detaillierte Request/Response-Beispiele und Ablauf: **ABLAUF-API.md** (Abschnitte „Erster API-Call – Roh-Beispiel“ und „Warum es ‚funktioniert so leider überhaupt nicht‘“).

---

## 5. Fallback: Statische Genre-Liste

### Problem

Wenn der Suggest-Song-API-Call fehlschlägt oder keine gültigen Songs zurückgibt, bleibt `songQueue` leer. Das Frontend weicht auf eine **feste Liste** von Suchbegriffen pro Genre/Schwierigkeit aus (z. B. `genres[].beginner`). Das führt zu:

- Weniger Vielfalt
- Höhere Chance auf Wiederholungen (gleiche Phrase wird mehrfach zufällig gewählt)
- Bei iTunes können zu solchen Phrasen wieder Cover-Versionen gefunden werden

### Umgesetzte Gegenmaßnahmen

- Fallback nutzt dieselbe iTunes-Logik wie die API-Queue: `searchItunesForOriginal(originalArtist, songTitle, yearMin, yearMax)` mit `parseArtistAndTitle(phrase)`.
- `playedSongKeys` wird auch im Fallback befüllt; bereits gespielte Songs werden übersprungen.
- Mehrere Versuche beim Fallback, um andere Einträge zu probieren, wenn ein Treffer schon gespielt wurde.

### Einschränkung

- Die statische Liste ist begrenzt; bei vielen Runden oder wenigen Genres sind Wiederholungen möglich.
- Qualität und „Original-only“ hängen davon ab, ob iTunes für die festen Phrasen Originale zurückgibt.

---

## 6. Kurzüberblick: Wo was gefiltert wird

| Stufe | Ort | Maßnahme |
|-------|-----|----------|
| Vorschlag | Server (OpenAI-Antwort) | Kuratoren-Prompt, Blocklist, max. 1 Song pro Artist, Deduplizierung mit `normalizeForDedup`. |
| Vorschlag | Frontend | `isOriginalSuggestion()`, `dedupeSongList()` vor dem Befüllen der `songQueue`. |
| Abspielversion | Frontend (iTunes) | `searchItunesForOriginal`: `isNoCover()`, `resultArtistIsPrimary()`, Sortierung nach frühester `releaseDate`, Verwerfen wenn außerhalb yearMin/yearMax. |
| Bereits gespielt | Frontend | `playedSongKeys`; beim Nachladen und im Fallback werden gespielte Songs ausgelassen. |

---

## Dokumenten- und Versionsbezug

- **ABLAUF-API.md:** Ablauf Suggest-Song-API, Request/Response, Debug-Checkliste.
- **CHANGELOG.md:** Versionshistorie und Änderungen.
- **server.js:** Blocklist, Prompt, Filterung; **index.html:** Blocklist, `isNoCover`, `resultArtistIsPrimary`, `searchItunesForOriginal`, `playedSongKeys`, Fallback-Logik.

Stand: Februar 2026 (zusammengefasst nach Entwicklung und Nutzerfeedback).
