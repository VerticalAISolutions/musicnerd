# Änderungsdokumentation – MusicNerd

Alle vorgenommenen Änderungen an der App und am Proxy, chronologisch und thematisch zusammengefasst.

---

## 1. Umbenennung der App

**Datei:** `game-test.html`

- **Seitentitel:** `In welchem Jahr?` → **MusicNerd**
- **Intro-Überschrift:** „In welchem Jahr?“ → **MusicNerd**

Die App heißt nun durchgängig „MusicNerd“.

---

## 2. Song-Info bei der Auflösung

**Datei:** `game-test.html`

### 2.1 Neuer Bereich in der Auflösung

- Im **Result-Bereich** (nach Jahr, Titel, Künstler) gibt es einen **Song-Info-Block**.
- **CSS:** `.result-song-info` – eigener Block mit Hintergrund, linkem Rand (Cherry-Rose), lesbare Schriftgröße und Zeilenabstand.
- Der Inhalt hängt vom gewählten **Schwierigkeitslevel** ab (Beginner, Intermediate, Expert).

### 2.2 Inhaltliche Vorgaben pro Level (ursprünglich)

- **Beginner:** kurz & zugänglich (2–3 Sätze, Jahr, einfache musikalische Einordnung, warum man danebenliegen kann).
- **Intermediate:** kontextuell & erklärend (3–4 Sätze, Jahr zuerst, stilistische/zeitliche Einordnung, warum oft falsch datiert).
- **Expert:** analytisch (4–5 Sätze, Jahr, Produktionsmerkmale/Ästhetik/Kontext, warum voraus oder retro).

### 2.3 Anpassungen am Erklärungstext

- **Kein Label mehr** – Es wird weder „🎵 Intermediate – kontextuell & erklärend“ noch ein anderes Label über dem Text angezeigt; der Block beginnt direkt mit der Erklärung.
- **Kein „Erscheinungsjahr: X“ im Fließtext** – Das Jahr steht bereits oben groß; bei Intermediate und Expert wurde der Satz „Erscheinungsjahr: …“ am Anfang des Textes entfernt.
- **Label-Element und zugehöriges CSS** für den Song-Info-Bereich wurden entfernt.

---

## 3. Neuer Prompt für die Song-Erläuterung

**Datei:** `game-test.html`

### 3.1 Vorgaben für die Erklärung

- Erkläre kurz, **warum der Song zeitlich so einzuordnen ist**, wie angezeigt.
- Beziehe dich auf **konkrete hörbare Merkmale** (z. B. Drum-Sound, Synths, Vocal-Stil, Arrangement, Mix, Genrephase).
- Nenne **mindestens zwei konkrete Hinweise**, an denen man die Epoche erkennen kann.
- Erkläre **konkret, warum viele den Song zu früh oder zu spät einschätzen**.
- **Ton:** musikbegeisterter Freund – erklärend, neugierig, wohlwollend.
- **Vermeiden:** abstrakte Formulierungen wie „kultureller Kontext“, „Stilistik“, „lässt sich einordnen“.
- **Regel:** Jeder Satz muss sich auf etwas **Hörbares oder musikalisch Konkretes** beziehen.

### 3.2 Umsetzung im Code

- Konstante **`SONG_INFO_PROMPT`** enthält den vollständigen Prompt (für KI-API und Fallback-Logik).
- Die **Fallback-Texte** in `getSongInfoForDifficulty()` wurden an diese Vorgaben angepasst: konkrete Begriffe (Drum-Sound, Synths, Vocal, Arrangement, Mix), zwei Epochen-Hinweise, Erklärung für Fehleinschätzung, keine abstrakten Floskeln.

---

## 4. Einbindung der OpenAI-API (GPT-4.1 mini)

**Datei:** `game-test.html`

### 4.1 Warum ein Proxy?

- Die **OpenAI-API** erlaubt keine direkten Aufrufe aus dem Browser (CORS).
- Daher: Aufruf der App an einen **eigenen Proxy**; der Proxy ruft die OpenAI-API mit dem API-Key auf und gibt die Antwort zurück.

### 4.2 Frontend

- **Spieloptionen:** Neues Feld **„OpenAI-Proxy-URL (optional)“**.
  - Platzhalter z. B.: `http://localhost:3001/api/song-info`
  - Wert wird in **localStorage** unter `musicnerd_openai_proxy_url` gespeichert (beim Ändern/Verlassen des Feldes).
  - Beim Laden der Seite wird der gespeicherte Wert in das Eingabefeld geladen.
- **Ablauf bei der Auflösung:**
  1. Es wird sofort **„Erklärung wird geladen…“** angezeigt.
  2. Wenn eine Proxy-URL gesetzt ist: **POST** an diese URL mit `artistName`, `trackName`, `releaseYear`, `prompt`, `userContent` (vollständiger User-Text inkl. Prompt + Song-Daten).
  3. Antwort erwartet: JSON mit **`text`** (Erklärungstext).
  4. Bei Erfolg: Anzeige des API-Textes; bei Fehler oder fehlendem Proxy: Anzeige der **Fallback-Texte** aus `getSongInfoForDifficulty()`.
- **Funktion:** `fetchSongInfoFromOpenAI(artistName, trackName, releaseYear)` – liest Proxy-URL aus Input/localStorage, sendet Request, gibt `text` oder `null` zurück.

---

## 5. Proxy-Server (Node.js)

**Datei:** `server.js`

### 5.1 Aufgabe

- Empfängt **POST** an `/api/song-info`.
- Liest **OPENAI_API_KEY** aus der Umgebung (über `dotenv` aus `.env`).
- Baut aus dem Request-Body die User-Nachricht (mit Prompt + Song + Jahr).
- Ruft **OpenAI Chat Completions** auf:
  - **Modell:** `gpt-4.1-mini`
  - **Parameter:** z. B. `max_tokens: 500`, `temperature: 0.7`
- Antwort: **`{ "text": "..." }`** oder **`{ "error": "..." }`**.
- **CORS:** `Access-Control-Allow-Origin: *` usw., damit der Browser die App aufrufen kann.

### 5.2 Port

- Standard: **3001** (überschreibbar mit Umgebungsvariable **PORT**).

---

## 6. Umgebung & API-Key (.env)

### 6.1 Neue Dateien

- **`.env`**
  - Enthält nur: `OPENAI_API_KEY=` (Key wird dahinter eingetragen).
  - Wird **nicht** ins Repo eingecheckt (siehe `.gitignore`).
- **`.env.example`**
  - Vorlage: Zeigt `OPENAI_API_KEY=sk-dein-key-hier` und optional `PORT=3001`.
  - Wird ins Repo eingecheckt; dient als Anleitung.

### 6.2 .gitignore

- **Neue Datei:** `.gitignore`
  - Einträge: `.env`, `node_modules/`, `.DS_Store`
  - Verhindert, dass der echte API-Key und Abhängigkeiten ins Repo gelangen.

---

## 7. Abhängigkeiten & Skripte

**Datei:** `package.json` (neu)

- **Projekt:** `musicnerd-proxy`
- **Abhängigkeit:** `dotenv` (z. B. ^16.4.5) zum Laden von `.env`.
- **Skript:** `npm start` → `node server.js`.

**Datei:** `server.js`

- Ganz oben: **`require('dotenv').config();`** – lädt `.env` vor dem Lesen von `process.env.OPENAI_API_KEY`.
- Fehlender Key: Server beendet sich mit Hinweis, `.env.example` nach `.env` zu kopieren und den Key einzutragen.

---

## 8. Übersicht der geänderten/neu angelegten Dateien

| Datei            | Aktion     | Kurzbeschreibung |
|------------------|------------|------------------|
| `game-test.html` | geändert   | MusicNerd, Song-Info, Prompt, OpenAI-Proxy-URL, async API-Aufruf |
| `server.js`      | neu/geändert | Node-Proxy für OpenAI GPT-4.1 mini, dotenv |
| `package.json`  | neu        | dotenv, Start-Skript |
| `.env`           | neu        | OPENAI_API_KEY (lokal, nicht im Repo) |
| `.env.example`   | neu        | Vorlage für Umgebungsvariablen |
| `.gitignore`     | neu        | .env, node_modules, .DS_Store |
| `CHANGELOG.md`   | neu        | Diese Dokumentation |

---

## 9. Keine Mixes / Remixes / Remasters (Prompt + Filter)

**Dateien:** `server.js`, `index.html`

- **Kuratoren-Prompt (`server.js`):** Deutlich verschärft. Explizit verboten: Mixes, Remixes, Remasters, Live, Covers, Karaoke, Tributes. Songtitel im API-Output nur als offizieller Original-Titel (z. B. „Smells Like Teen Spirit“), keine Zusätze wie „(Butch Vig Mix)“, „(Remaster)“, „(Remix)“, „(Live)“.
- **Output-Anweisung:** In der JSON-Anweisung wiederholt: „Songtitel NUR der Original-Titel – KEINE Zusätze wie (Mix), (Remix), (Remaster), (Live).“
- **Frontend-Filter (`index.html`, `isNoCover`):** Zusätzliche Ausschlüsse für iTunes-Ergebnisse: Titel mit „ mix)“ oder „ (mix)“ oder „ mix “ oder Endung „ mix“ werden verworfen, damit z. B. „Smells Like Teen Spirit (Butch Vig Mix)“ nicht mehr angezeigt wird.

---

## 10. Nur Originale – keine feat./featuring / spätere Versionen

**Dateien:** `server.js`, `index.html`

- **Kuratoren-Prompt (`server.js`):** Explizit verboten: „feat.“, „featuring“, spätere Kollaborationen, Re-Recordings. Nur die allererste Original-Version (Beispiel: „Girls Just Want to Have Fun“ = Original Cyndi Lauper 1983, nicht spätere Versionen mit anderen Künstlern). Artist im Output nur Original-Interpret (kein feat./featuring). Songtitel nur Original-Titel, keine Zusätze wie „(feat. …)“.
- **Output-Anweisung:** „Artist = NUR der Original-Interpret (kein feat./featuring). Songtitel = NUR der Original-Titel, KEINE Zusätze wie (feat. …), (Mix), …“
- **Frontend-Filter (`index.html`, `isNoCover`):** iTunes-Ergebnisse werden ausgeschlossen, wenn der Tracktitel „(feat.“, „ feat.“, „(featuring“ oder „ featuring“ enthält – damit z. B. „Girls Just Want to Have Fun (feat. Puffy Ami Yumi)“ nicht mehr durchgeht.

---

## 11. Cover-/Karaoke-Künstler (z. B. The Chant Masters) ausschließen

**Dateien:** `server.js`, `index.html`

- **Ursache:** Der Filter `isNoCover` prüfte nur **Titel und Album**, nicht den **Künstlernamen**. „The Chant Masters“ (Cover von „In The Air Tonight“) steht in `artistName` und wurde deshalb nicht erkannt.
- **Frontend (`index.html`, `isNoCover`):** Es wird jetzt auch `artistLower` (Künstlername, lowercase) gebildet und in `combined` (Titel + Album + Künstler) einbezogen. Zusätzliche Prüfung: wenn der **Künstler** „chant masters“, „karaoke“, „tribute band“ oder „cover band“ enthält → ausschließen. Damit werden z. B. „In The Air Tonight“ von The Chant Masters zuverlässig ausgefiltert.
- **Server-Prompt (`server.js`):** Explizit: „NIEMALS Cover-/Karaoke-Interpreten wie ‚The Chant Masters‘, Karaoke- oder Tribute-Bands.“ sowie „keine Cover-Versionen“.

---

## 12. Keine Dubletten in der Songliste

**Dateien:** `server.js`, `index.html`

- **Kuratoren-Prompt (`server.js`):** Explizit: „Jeder Song (Artist + Titel) darf in der Liste nur EINMAL vorkommen – KEINE Dubletten.“ In der JSON-Output-Anweisung wiederholt: „jeder Song (Artist + Titel) nur einmal – keine Dubletten“.
- **Server-Deduplizierung:** Nach dem Parsen der API-Antwort werden Songs anhand des Keys `artist|song` (lowercase) gefiltert; nur das erste Vorkommen bleibt, Dubletten werden entfernt.
- **Frontend (`index.html`):** Hilfsfunktionen `songKey(artist, song)` und `dedupeSongList(list)`; jede von der API geladene Liste wird mit `dedupeSongList` bereinigt. Beim Start: `songQueue = dedupeSongList(list)`. Beim Nachladen (Queue leer): neue Liste wird um bereits gespielte Songs gefiltert (`playedSongKeys`), dann erneut dedupliziert. Jeder gespielte Song (aus Queue oder Fallback) wird in `playedSongKeys` eingetragen, damit beim nächsten Nachladen keine Dubletten vorkommen.

---

## 13. Nur Originale – Prompt, Blocklist, Artist-Match verschärft

**Dateien:** `server.js`, `index.html`

- **Prompt (`server.js`):** Ganz oben ein **„KRITISCH – ZUERST LESEN“**-Block: Jeder Eintrag = ORIGINAL-Künstler und ORIGINAL-Song (allererste Veröffentlichung). NIEMALS Covers, Karaoke, Tribute, „The Chant Masters“, Remix, Remaster, Live, feat./featuring. „Wenn du auch nur einen Cover-/Karaoke- oder Nicht-Original-Interpret vorschlägst, ist die gesamte Liste unbrauchbar.“ Kuratoren- und Output-Anweisung entsprechend verschärft. **Temperature** für Song-Vorschläge von 0.7 auf **0.3** gesenkt (striktere Einhaltung der Regeln).
- **Server-Blocklist:** Nach dem Parsen der API-Antwort werden Vorschläge gefiltert: Artist mit „chant masters“, „karaoke“, „tribute band“, „cover band“, „feat.“, „featuring“, „tribute to“ oder Song mit „(feat.“, „(remix)“ usw. werden verworfen, bevor die Liste an das Frontend geht.
- **Frontend-Blocklist (`index.html`):** Konstante `BLOCKLIST_ARTIST`/`BLOCKLIST_SONG` und Funktion `isOriginalSuggestion()`. Jede von der API geladene Liste wird mit `isOriginalSuggestion` gefiltert; nur Einträge ohne Blocklist-Treffer kommen in die Queue.
- **Artist-Match beim iTunes-Ergebnis:** Beim Abgleich mit der Queue-Vorgabe wird nicht mehr „irgendein Wort des Künstlers“ akzeptiert, sondern der **vollständige vorgeschlagene Künstlername** muss im iTunes-Künstlernamen vorkommen (`resultArtist.includes(wantArtist)`). So wird z. B. „The Chant Masters“ nicht mehr akzeptiert, wenn „Phil Collins“ vorgeschlagen war.

---

## 14. Vitamin String Quartet und weitere Tribute-Interpreten ausschließen

**Dateien:** `server.js`, `index.html`

- **Ursache:** „Smells Like Teen Spirit“ von Vitamin String Quartet (Cover) kam als erster Song durch – Tribute-/Cover-Interpreten wurden nicht erfasst.
- **Prompt (`server.js`):** Explizit verboten: „Vitamin String Quartet, Piano Guys, Rockabye Baby, oder irgendein Künstler mit ‚String Quartet‘, ‚Tribute‘, ‚Karaoke‘, ‚Cover‘ im Namen.“ Beispiel: „Smells Like Teen Spirit“ = Nirvana, nicht Vitamin String Quartet. VERBOTEN-Block um diese Namen ergänzt.
- **Server-Blocklist:** `vitamin string quartet`, `vitamin string`, `piano guys`, `rockabye baby`, `string quartet`, ` tribute ` (Leerzeichen, um „Tribute“ als Wort zu treffen) in der Artist-Blocklist.
- **Frontend-Blocklist:** Dieselben Einträge in `BLOCKLIST_ARTIST`.
- **Frontend `isNoCover`:** iTunes-Ergebnisse werden ausgeschlossen, wenn der Künstler „vitamin string quartet“, „vitamin string“, „piano guys“, „rockabye baby“, „string quartet“ oder „ tribute “ enthält.

---

## 15. 2-stufige Song-Kuratierung (Kandidatenpool → Qualitätsfilter)

**Datei:** `server.js`, `.env.example`

- **Problem:** Songs waren oft zu generisch / zu „sicher“. Ziel: Songs, die Spaß machen zu datieren und systematisch falsch eingeschätzt werden.
- **Umbau:** Die Route `/api/suggest-song` arbeitet jetzt 2-stufig:
  1. **Kandidatenpool:** Das LLM erzeugt einen größeren Pool (min 20, max 40 Kandidaten, ca. 4× der gewünschten Anzahl), damit es intern verwerfen kann.
  2. **Qualitätsfilter:** Jeder Song muss einen klaren „Datierungs-Irrtum“ haben. Das LLM antwortet mit strukturiertem JSON:
     - Pro Song: `artist`, `song`, `trap` mit `direction` (too_early / too_late), `expected_error_years`, `listening_clues` (2–3 konkrete hörbare Gründe).
     - Diese Trap-Daten sind im LLM-Output für Kuratierung/Debug, werden aber normalerweise nicht ans Frontend geschickt.
- **Difficulty** steuert Strenge: Beginner 2–4 Jahre Fehlspanne, Intermediate 4–7, Expert ≥7 oder starke Retro-/Voraus-seiner-Zeit-Falle. Keine Obskurität nur um der Schwierigkeit willen.
- **Genre/Zeitraum:** Weiche Constraints (Genre als Rahmen), Zeitspanne muss eingehalten werden.
- **Hard No-Gos:** Keine Covers/Tributes/Karaoke/Vitamin String Quartet; keine „Jahres-Lehrbuch“-Songs ohne Twist; keine Duplikate; max 1 Song pro Artist pro Batch.
- **Parsing:** Server parst das Objekt `{ "songs": [ { artist, song, trap }, ... ] }`, wendet Blocklist, Deduplizierung und „max 1 pro Artist“ an, schneidet auf `count` und gibt weiterhin nur `{ songs: [{ artist, song }, ...] }` zurück. Frontend unverändert.
- **Debug:** Optional `DEBUG_SUGGEST_SONGS=true` in `.env` – dann enthält die Response zusätzlich `debug: [{ artist, song, trap }, ...]` (nur für Entwicklung/Debug).
- **`.env.example`:** Eintrag für `DEBUG_SUGGEST_SONGS` ergänzt.

---

## 16. Nie wieder Covers – strikte Original-Artist-Suche

**Dateien:** `server.js`, `index.html`

- **Problem:** Trotz bisheriger Filter kamen weiterhin überwiegend Covers. Anforderung: ZWINGEND Songtitel und ORIGINAL-ARTIST suchen, nie Covers.
- **Prompt (`server.js`):** Ganz oben ein **„KRITISCH – ZUERST LESEN“**-Block: „Die App sucht ZWINGEND mit ORIGINAL-ARTIST und SONGTITEL. Im Feld artist darf NUR der Künstler stehen, der den Song ZU ERST veröffentlicht hat – niemals Cover-/Tribute-/Karaoke-Interpreten.“ Hard No-Gos erweitert um Hit Crew, Kids Bop, Various Artists, Rockabye Baby usw.
- **Blocklisten (Server + Frontend):** Umfassend erweitert. Artist-Blocklist u. a.: chant masters, vitamin string quartet, piano guys, rockabye baby, string quartet, karaoke, tribute band, cover band, hit crew, kids bop, kidz bop, various artists, sounds of, lullaby, lullabies, rendition, instrumental, acoustic version, piano version, orchestra version, reimagined, reimagining, as made famous, made famous by, in the style of, style of, tribute to, cover of, cover by. Song-Blocklist: (cover), (tribute), - cover, - tribute. isNoCover prüft Artist + Track + Album mit allen genannten Begriffen; Album mit „tribute“, „karaoke“, „lullaby“, „instrumental“ wird ausgeschlossen; Track/Album mit reimagined, in the style of, as made famous wird ausgeschlossen.
- **iTunes-Auswahl (Queue-Pfad):** Suche weiterhin strikt mit **ORIGINAL ARTIST + SONG** (`wantArtist + ' ' + wantSong`). Neue Funktion **resultArtistIsPrimary(resultArtist, wantArtist)**: Es wird nur noch akzeptiert, wenn der vorgeschlagene Künstler der **Hauptkünstler** im iTunes-Ergebnis ist (resultArtist gleich wantArtist oder startet mit wantArtist / „the “ + wantArtist). So werden z. B. „Nirvana Tribute“ oder Cover-Interpreten nie mehr akzeptiert, wenn „Nirvana“ vorgeschlagen war. Sortierung: zuerst exakter Artist-Match, dann frühestes Erscheinungsdatum.
- **Fallback-Pfad:** Sortierung so, dass Ergebnisse, bei denen der Künstler mit dem ersten Suchwort beginnt (typisch Original-Artist), bevorzugt werden, danach frühestes Datum.

---

## 18. Neue Genres „Partyhits“ & „Filmmusik“ + Schwierigkeit = Bekanntheit

**Dateien:** `index.html`, `server.js`, `curated-match.js` (neu), `fallback-genres/partyhits.js` (neu), `fallback-genres/soundtracks.js` (neu), `test-curated-lists.js` (neu)

- **Zwei neue Genres** für Leute, die keine Musiknerds sind: **Partyhits** (international + deutsche Klassiker) und **Filmmusik** (Scores wie Indiana Jones oder Star Wars sowie Film-Songs wie Eye of the Tiger oder Let It Go). Beide lassen sich mit den übrigen Genres kombinieren.
- **Kuratiert statt LLM:** Beide Genres kommen aus handgepflegten Listen, jeder Eintrag mit **festem Jahr** (Filmmusik: Kinostart des Films, für den das Stück geschrieben wurde). Grund: iTunes führt Scores oft als Reissue (Raiders March 2008 statt 1981), und der Cover-Filter `isNoCover` sperrt alles mit „Soundtrack“. Für diese Genres gibt es keinen Suggest-API-Call. iTunes liefert nur Preview, Cover und Titel.
- **Treffer-Logik** in `curated-match.js`, die Browser und Testskript gemeinsam nutzen: Der Hauptinterpret muss stimmen (Orchester-Zusätze sind ok, Tribute/Cover nicht), der Titel muss passen, Live, Remix und Karaoke sind gesperrt, Soundtrack-Alben und feat. sind erlaubt.
- **Queue:** API- und kuratierte Songs werden abwechselnd gemischt. Kuratierte Einträge werden vorab gegen den Jahres-Slider gefiltert. Bei leerer Auswahl werden andere Schwierigkeitsstufen herangezogen, damit es keine Null-Ergebnisse gibt. Queue-Einträge ohne Treffer werden entfernt, statt jede Runde erneut gesucht zu werden.
- **Auflösung:** Bei Filmmusik zeigt `resultYearNote` „Aus dem Film „…““. Eigene Erklär-Prompts und Fallback-Texte für Filmmusik und Partyhits.
- **Datierungsfallen entfernt:** Der Kuratoren-Prompt in `server.js` suchte bisher auf allen Stufen Songs, die systematisch falsch datiert werden. Deshalb war auch „Leicht“ schwer. Jetzt gilt **Schwierigkeit = Bekanntheit** (Leicht = große Hits, Mittel = bekannte Artists jenseits des größten Hits, Schwer = Songs für Musikfans). `trap`-Schema, `isValidTrap` und `datingTraps` sind entfernt.
- **Listen prüfen:** `node test-curated-lists.js [partyhits|soundtracks]` prüft jeden Eintrag gegen iTunes.

---

## 19. Hänger nach Spielende, Sicherheit, Aufräumen

**Dateien:** `index.html`, `server.js`, `curated-match.js`, `fallback-genres/rock.js`, `claude.md`, `DEPLOY.md`, `ABLAUF-API.md`; entfernt: `game-test.html`, `game-spotify.html`, `api-test.html`

### Hänger bei „Nochmal!“ / „Neues Spiel“
- **„Nochmal!“** hat die Queue geleert und sofort gesucht, ohne auf die neue Songliste zu warten. Das Spiel fiel in die Notfall-Liste und kam dort nie wieder heraus. Jetzt laufen „Spiel starten“ und „Nochmal!“ über dieselbe Funktion `runGame()`.
- **`fallback-genres/rock.js`** hatte einen Syntaxfehler (`Let's Dance`), dadurch war die Rock-Notfall-Liste komplett leer.
- **Preloading aus dem alten Spiel** lief nach dem Neustart weiter und schob alte Songs ins neue Spiel. Neu ist eine `gameId`: Jeder Start erhöht sie, und alte Vorgänge brechen ab.
- **„Neues Spiel“** blendete den Spielscreen per `style.display = 'none'` aus, `startGame()` setzte das nie zurück. Ergebnis: ein unsichtbarer Spielscreen.
- **Keine Sackgasse mehr:** Statt „Kein Song gefunden“ ohne Ausweg gibt es einen Button „Nochmal versuchen“. Läuft gerade das Nachladen der Songliste, wird darauf gewartet.
- **Kein Verlust bei kurzen Ausfällen:** Ist iTunes nur kurz nicht erreichbar, bleiben die Queue-Einträge erhalten, statt verworfen zu werden.

### Sicherheit (`server.js`)
- Der Server lieferte **jede Datei** im Projektordner aus, auch `/.env` mit dem OpenAI-Key. Jetzt gilt eine Freigabeliste (`PUBLIC_FILES`), alles andere antwortet mit 404.
- `/api/song-info` baut den Prompt selbst. Vorher wurde freier Text aus dem Browser an OpenAI durchgereicht, der Endpunkt war also ein offener ChatGPT-Zugang.
- Rate-Limit pro IP und Endpunkt, Body max. 10 KB, nur `POST`, Eingaben geprüft und gekürzt. CORS nur noch über `CORS_ORIGIN`.
- Spielernamen werden escaped, bevor sie per `innerHTML` eingefügt werden.

### Qualität
- `isNoCover` blockt jetzt auch Akustik-, Stripped- und Piano-Fassungen. Vorher konnte z. B. „Creep (Acoustic)“ als Original durchgehen.
- Der kuratierte Filter blockt neu eingespielte Fassungen und DJ-Mixe auch dann, wenn das nur im Albumtitel steht.
- Preloading startet nach jedem Song, nicht nur nach dem ersten.
- „Nächster Song“ ist gegen Doppelklick geschützt. Nach der letzten Runde erscheint das Endergebnis statt „Runde 6 / 5“.
- Eine verspätete Erklärung aus der Vorrunde überschreibt nicht mehr den aktuellen Text.
- iTunes-Antworten werden 1 h auf dem Server gecacht. Fällt der Proxy aus, sucht der Browser direkt per JSONP.
- Die Notfall-Liste macht höchstens 20 statt 80 Suchversuche (iTunes erlaubt ca. 20 Anfragen pro Minute). Die 12 Subgenre-Blöcke sind jetzt eine Schleife (`subgenresKey`).

### Aufräumen
- Fallback-Erklärungen sind genre-neutral und nennen die Epoche („frühe 80er“). Vorher stand dort immer „Drum-Sound und Synths“, auch bei Klassik.
- `claude.md` §6 beschreibt jetzt Schwierigkeit = Bekanntheit sowie die kuratierten Genres. `DEPLOY.md` und `ABLAUF-API.md` sind aktualisiert.
- Alte Testseiten entfernt, `.playwright-mcp/` steht in `.gitignore`.

---

## 20. Abwechslungsreiche Statustexte

**Datei:** `index.html`

- Statt fester Sätze gibt es Pools je Situation: erster Start, nächster Song, bereit, letzte Runde, beim Hören und Tipps abgeben. Insgesamt sind es rund 70 kurze Texte im Plattenkisten- und Jukebox-Ton.
- „Shuffle-Bag“ (`pickStatusMessage`): Jeder Text kommt einmal dran, bevor sich etwas wiederholt, und nie zweimal direkt hintereinander.
- Ist nur Filmmusik oder nur Partyhits gewählt, kommen passende Zusatztexte dazu („Popcorn bereit?“, „Der DJ legt nach“). Bei gemischter Auswahl gibt es sie nicht, weil sie sonst das Genre verraten würden.
- Auch das Laden zwischen den Runden zeigt wechselnde Texte mit animierten Punkten statt immer „Weiter geht’s“.
- Die Statuszeile hat eine feste Höhe für zwei Zeilen, damit längere Texte auf dem Handy nicht überlaufen.

---

## 17. So startest du alles

1. **API-Key:** In `.env` hinter `OPENAI_API_KEY=` deinen OpenAI-Key eintragen (optional `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET`).
2. **Server:** Im Projektordner `npm install` und `npm start` (Port 3001).
3. **App:** `http://localhost:3001` im Browser öffnen – der Server liefert App und API aus, nichts weiter einzutragen.
4. **Debug:** `http://localhost:3001/?debug=1` zeigt Such- und API-Logs direkt auf der Seite.
5. **Kuratierte Listen prüfen:** `node test-curated-lists.js` (Partyhits + Filmmusik gegen iTunes).

Deployment: siehe `DEPLOY.md`.
