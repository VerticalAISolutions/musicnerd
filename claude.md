# claude.md
## Projekt-Instructions für Claude Code

### Projektname
**Music Year Guessing Game** (Arbeitstitel)

---

## 1. Ziel des Projekts

Ziel ist die Entwicklung einer **login-freien Musik-Quiz-App**, bei der mehrere Spieler **gemeinsam** einen Song hören (30-Sekunden-Preview) und **das Erscheinungsjahr** erraten.

Der Fokus liegt auf:
- Spielspaß
- musikalischer Bildung
- fairer, wohlwollender Bewertung
- klarer, reduzierter UX

Kein kompetitiver Hardcore-Gamification-Ansatz, sondern **intelligentes, geselliges Raten** mit Kontext und Wertschätzung für Musikgeschichte.

---

## 2. Grundlegendes Spielprinzip

1. Ein Song wird ausgewählt (abhängig von Genre- und Schwierigkeitswahl).
2. Ein **Play-Button** startet eine **30-Sekunden-Preview**.
3. Während oder nach dem Abspielen geben **alle Spieler gleichzeitig** ihren Tipp ab:
   - Eingabe: **vierstellige Jahreszahl**
4. Nach Abgabe aller Tipps:
   - Auflösung des korrekten Jahres
   - Anzeige der individuellen Abweichungen
   - **wohlwollendes, erklärendes Feedback**
   - kurze Infos zum Song (Kontext, Stil, Epoche)
5. Am Ende mehrerer Runden:
   - Ranking nach **geringster durchschnittlicher Abweichung**
   - kein Shaming, keine harten Fail-States

---

## 3. Audio- & API-Strategie (fix, nicht diskutieren)

### Preview (Hauptspielmodus)
- **30-Sekunden-Previews**
- **login-frei**
- **keine vollständigen Songs**
- **keine DRM-Umgehung**

**Primäre Quelle:**
- Apple iTunes Search API (`previewUrl`)
- öffentlich nutzbar, kein OAuth, keine App-Registrierung nötig

### Metadaten
- Titel
- Artist
- Erscheinungsjahr
- Album
- ggf. Genre / Stil

Diese können:
- ebenfalls aus iTunes stammen
- oder (optional) aus Spotify (nur Metadaten, keine Previews)

### „Ganzen Song hören"-Option (nach Auflösung)
- **Nur als externe Weiterleitung**
- Keine Einbettung, kein Playback in der App

Optionen:
- Spotify
- Apple Music
- Deezer

Die App ist **kein Streaming-Client**, sondern ein Spiel.

---

## 4. Login & Accounts

- **Kein Login erforderlich** für das Spielen.
- Keine Pflicht-Accounts.
- Keine personenbezogenen Daten.
- Optionale spätere Erweiterungen (z. B. Nicknames, lokale Speicherung) sind möglich, aber nicht Teil der Basisarchitektur.

---

## 5. Genres & Filterlogik

### Genre-Auswahl
- Nutzer können:
  - Genres **an- und abwählen**
  - mehrere Genres kombinieren
  - ein **Freitext-Genre** eingeben (z. B. „Chicago Postrock", „Krautrock", „Neo-Soul")

### Verhalten bei Freitext
- Freitext dient als **weicher Filter / Hint**, kein harter Zwang
- Claude soll bei der Logik:
  - eher interpretieren als strikt matchen
  - keine Null-Ergebnisse erzeugen
  - im Zweifel bekannte, passende Songs bevorzugen

---

## 6. Schwierigkeitsgrade (zentrale Spielmechanik)

### Beginner
- sehr bekannte Songs
- klare zeitliche Marker
- große Hits, kulturell eindeutig verortbar
- geringe Irreführung

### Intermediate
- bekannte Artists, aber:
  - Deep Cuts
  - weniger offensichtliche Songs
- Übergangsjahre
- stilistisch teils irreführend

### Expert
- bewusst schwierige Auswahl:
  - Songs, die ihrer Zeit voraus waren
  - Retro-Produktionen
  - lange Nachwirkungen
- Genres und Epochen vermischen sich
- Zielgruppe: Musiknerds

Schwierigkeitsgrad beeinflusst **Song-Auswahl**, nicht die Regeln.

---

## 7. Bewertungslogik

- Spieler tippen eine Jahreszahl
- Es wird die **Abweichung in Jahren** berechnet (absolut)
- Kein „richtig/falsch", sondern **Nähe**
- Rankings basieren auf:
  - durchschnittlicher Abweichung
  - optional: beste Einzelrunde

---

## 8. Feedback & Tonalität

### Auflösungstext
- immer:
  - korrektes Jahr
  - kurze Einordnung („späte 70er", „Post-2010 Streaming-Ära" etc.)
- optional:
  - warum der Song leicht zu früh/zu spät geschätzt wird
  - Hinweise auf Produktion, Stil, Zeitgeist

### Ton
- wohlwollend
- erklärend
- nicht belehrend
- kein Spott, kein Sarkasmus

Vorbild: **kompetenter Musikfreund**, nicht Lehrer oder Quizmaster.

---

## 9. UI/UX-Leitlinien

- Minimalistisch
- Fokus auf:
  - Play-Button
  - Eingabefeld für Jahreszahl
- Keine Metadaten sichtbar **vor** der Auflösung
- Keine Hinweise während des Hörens
- Alle Spieler sehen dasselbe zur selben Zeit

---

## 10. Technische Leitplanken

- Erst **Planung**, dann **Architektur**, dann **Implementierung**
- Keine vorschnellen Framework-Entscheidungen
- Fehlerfälle einplanen:
  - kein Preview verfügbar
  - mehrere mögliche Matches
- Fallback-Logik statt Abbruch

Claude soll:
- pragmatisch denken
- API-Realitäten respektieren
- keine „magischen" Annahmen treffen

---

## 11. Explizite No-Gos

- Kein vollständiges Audio-Streaming
- Kein Scraping
- Kein DRM-Umgehen
- Kein Zwangslogin
- Keine aggressive Monetarisierung
- Kein Over-Engineering

---

## 12. Arbeitsmodus für Claude

Claude soll:
- Annahmen explizit machen
- Entscheidungen begründen
- UX, Recht & Technik gemeinsam denken
- lieber eine saubere, einfache Lösung vorschlagen
  als eine „coole", aber fragile

---

**Ende der Instructions.**
