/**
 * Kleiner Proxy für MusicNerd: leitet Song-Info-Anfragen an OpenAI GPT-4.1 mini weiter.
 * Benötigt Node.js 18+ (wegen fetch).
 *
 * Einrichtung:
 *   1. Kopiere .env.example nach .env
 *   2. Trage in .env deinen OpenAI-Key ein: OPENAI_API_KEY=sk-...
 *   3. npm install && npm start
 *
 * In der App unter Spieloptionen als "OpenAI-Proxy-URL" eintragen:
 *   http://localhost:3001/api/song-info
 */

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

// MIME-Types für statische Dateien
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// Statische Dateien servieren
function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  // Query-String entfernen
  filePath = filePath.split('?')[0];
  // Sicherheit: Keine Verzeichnis-Traversal erlauben
  filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(__dirname, filePath);

  // Prüfen ob Datei existiert
  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback auf index.html für SPA-Routing
      const indexPath = path.join(__dirname, 'index.html');
      fs.readFile(indexPath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.end(data);
      });
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(fullPath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
        return;
      }
      // No-Cache für HTML-Dateien
      const headers = { 'Content-Type': contentType };
      if (ext === '.html') {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      }
      res.writeHead(200, headers);
      res.end(data);
    });
  });
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const PORT = process.env.PORT || 3001;

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY fehlt. Kopiere .env.example nach .env und trage deinen Key ein.');
  process.exit(1);
}

// Spotify: Client Credentials – Token gecacht
let spotifyToken = null;
let spotifyTokenExpiry = 0;

async function getSpotifyAccessToken() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return null;
  const now = Date.now() / 1000;
  if (spotifyToken && now < spotifyTokenExpiry - 60) return spotifyToken;
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET
      }).toString()
    });
    const data = await res.json();
    if (data.access_token) {
      spotifyToken = data.access_token;
      spotifyTokenExpiry = now + (data.expires_in || 3600);
      return spotifyToken;
    }
  } catch (e) {
    console.error('Spotify Token:', e.message);
  }
  return null;
}

// Genre-Expertise für präzise Song-Auswahl
const GENRE_EXPERTISE = {
  'Techno': {
    description: 'Detroit Techno, Berlin Techno, Minimal Techno, Industrial Techno. KEIN EDM, kein Commercial House, kein Trance, kein Big Room.',
    referenceArtists: ['Carl Cox', 'Richie Hawtin', 'Jeff Mills', 'Adam Beyer', 'Charlotte de Witte', 'Amelie Lens', 'Ben Klock', 'Marcel Dettmann', 'Nina Kraviz', 'Sven Väth', 'Paul Kalkbrenner', 'Underworld', 'The Prodigy', 'Orbital', 'Plastikman', 'Robert Hood', 'Kevin Saunderson', 'Derrick May', 'Juan Atkins', 'Surgeon', 'Regis', 'Function', 'Kobosil', 'I Hate Models', 'Paula Temple', 'Dax J', 'Blawan', 'Karenn'],
    datingTraps: 'Analoge vs. digitale Produktion, Roland TR-808/909 Drums, TB-303 Basslines, Warehouse-Ästhetik vs. moderne Produktion, Melodic Techno (ab 2015) vs. harter Detroit-Sound (90er), Industrial-Revival (2010er)',
    avoidTerms: ['EDM', 'Festival', 'Drop', 'Mainstream', 'Commercial', 'Hands Up', 'Big Room', 'David Guetta', 'Martin Garrix', 'Avicii', 'Calvin Harris', 'Tiësto (nach 2005)']
  },
  'Electronic': {
    description: 'IDM, Ambient, UK Garage, Trip-Hop, Electronica, Experimental. NICHT gleichbedeutend mit Techno, House oder EDM.',
    referenceArtists: ['Aphex Twin', 'Boards of Canada', 'Burial', 'Four Tet', 'Massive Attack', 'Portishead', 'Bonobo', 'Jon Hopkins', 'Caribou', 'Floating Points', 'Autechre', 'Squarepusher', 'Amon Tobin', 'SBTRKT', 'James Blake', 'Mount Kimbie', 'Moderat', 'Apparat', 'Kiasmos', 'Nils Frahm', 'Ólafur Arnalds', 'Max Cooper'],
    datingTraps: 'Sampling-Ästhetik, Vinyl-Crackle, digitale vs. analoge Wärme, UK Bass-Entwicklung (Dubstep → Future Garage), IDM-Phasen, Ambient-Revival',
    avoidTerms: ['EDM', 'Festival', 'Mainstream', 'Pop-Electronic', 'Hands Up']
  },
  'Rock': {
    description: 'Classic Rock, Alternative Rock, Indie Rock, Hard Rock, Prog Rock. Von Led Zeppelin bis Radiohead.',
    referenceArtists: ['Led Zeppelin', 'Pink Floyd', 'The Rolling Stones', 'Queen', 'Nirvana', 'Radiohead', 'The Strokes', 'Arctic Monkeys', 'Foo Fighters', 'Pearl Jam', 'Soundgarden', 'Alice in Chains', 'Red Hot Chili Peppers', 'Muse', 'The White Stripes', 'Kings of Leon', 'The Black Keys', 'Tame Impala'],
    datingTraps: 'Gitarren-Sounds (Fuzz vs. Distortion vs. Clean), Drum-Recording-Techniken, Produktionsästhetik (trocken vs. hallreich), Retro-Revival-Bands die älter klingen',
    avoidTerms: ['Nu Metal', 'Post-Grunge Radio Rock']
  },
  'Pop': {
    description: 'Mainstream Pop, Synth-Pop, Art Pop, Indie Pop. Von ABBA bis Taylor Swift.',
    referenceArtists: ['Michael Jackson', 'Madonna', 'Prince', 'Whitney Houston', 'Britney Spears', 'NSYNC', 'Backstreet Boys', 'Lady Gaga', 'Beyoncé', 'Taylor Swift', 'Dua Lipa', 'The Weeknd', 'Bruno Mars', 'Ariana Grande', 'Billie Eilish', 'Lorde', 'Charli XCX', 'Robyn'],
    datingTraps: 'Synth-Sounds (analog 80er vs. digital 90er vs. Retro-Revival 2010er), Vocal-Processing, Drum-Machine vs. programmed Beats, Max Martin-Produktionen',
    avoidTerms: []
  },
  'Hip-Hop': {
    description: 'Old School, Golden Age, Gangsta Rap, Conscious Hip-Hop, Trap, Boom Bap. Von Grandmaster Flash bis Kendrick Lamar.',
    referenceArtists: ['Grandmaster Flash', 'Run-DMC', 'Public Enemy', 'N.W.A', 'Wu-Tang Clan', 'Nas', 'The Notorious B.I.G.', 'Tupac', 'A Tribe Called Quest', 'OutKast', 'Jay-Z', 'Eminem', 'Kanye West', 'Kendrick Lamar', 'J. Cole', 'Drake', 'Travis Scott', 'Tyler, The Creator', 'MF DOOM'],
    datingTraps: 'Sampling-Ära vs. originale Beats, Drum-Machine-Sounds (808 vs. MPC), Vocal-Delivery-Styles, Trap-Hi-Hats (ab 2012), Auto-Tune-Ära',
    avoidTerms: []
  },
  'Indie': {
    description: 'Indie Rock, Indie Pop, Indie Folk, Lo-Fi. Von Pavement bis Bon Iver.',
    referenceArtists: ['Pavement', 'Pixies', 'Sonic Youth', 'The Smiths', 'R.E.M.', 'Arcade Fire', 'Bon Iver', 'Fleet Foxes', 'Vampire Weekend', 'MGMT', 'Grizzly Bear', 'Beach House', 'Mac DeMarco', 'Father John Misty', 'Phoebe Bridgers', 'Big Thief', 'Fontaines D.C.', 'black midi'],
    datingTraps: 'Lo-Fi-Ästhetik (authentisch 90er vs. absichtlich modern), Bedroom-Pop-Produktion, Folk-Revival-Wellen, Post-Punk-Revival',
    avoidTerms: ['Mainstream', 'Major Label Sound']
  },
  'R&B / Soul': {
    description: 'Classic Soul, Motown, Contemporary R&B, Neo-Soul, Alternative R&B.',
    referenceArtists: ['Stevie Wonder', 'Marvin Gaye', 'Aretha Franklin', 'Al Green', 'Prince', 'Whitney Houston', 'TLC', 'Aaliyah', 'Erykah Badu', 'D\'Angelo', 'Lauryn Hill', 'Frank Ocean', 'The Weeknd', 'SZA', 'Daniel Caesar', 'H.E.R.', 'Summer Walker'],
    datingTraps: 'Live-Band vs. programmierte Beats, Vocal-Processing, New Jack Swing (late 80s-90s), Neo-Soul-Ära (late 90s-00s), Alternative R&B (2010er)',
    avoidTerms: []
  },
  'Jazz': {
    description: 'Swing, Bebop, Cool Jazz, Free Jazz, Fusion, Contemporary Jazz.',
    referenceArtists: ['Louis Armstrong', 'Duke Ellington', 'Charlie Parker', 'Miles Davis', 'John Coltrane', 'Thelonious Monk', 'Dave Brubeck', 'Bill Evans', 'Herbie Hancock', 'Weather Report', 'Pat Metheny', 'Kamasi Washington', 'Robert Glasper', 'Snarky Puppy', 'GoGo Penguin'],
    datingTraps: 'Recording-Techniken (Mono vs. Stereo), Fusion-Ära (70er), Acid Jazz (90er), Nu-Jazz/Jazz-Hip-Hop-Crossover (2000er+)',
    avoidTerms: ['Smooth Jazz', 'Elevator Music']
  },
  'Metal': {
    description: 'Heavy Metal, Thrash, Death Metal, Black Metal, Doom, Progressive Metal.',
    referenceArtists: ['Black Sabbath', 'Iron Maiden', 'Metallica', 'Slayer', 'Megadeth', 'Pantera', 'Tool', 'Opeth', 'Mastodon', 'Gojira', 'Meshuggah', 'Lamb of God', 'System of a Down', 'Deftones', 'Parkway Drive'],
    datingTraps: 'Gitarren-Tuning (Standard vs. Drop), Drum-Produktion (natürlich vs. triggered), Djent-Ära (2010er), Swedish Death Metal Sound',
    avoidTerms: ['Nu Metal (außer explizit gewünscht)', 'Metalcore Radio-Hits']
  },
  'Punk': {
    description: 'Classic Punk, Hardcore, Post-Punk, Pop-Punk, Emo.',
    referenceArtists: ['Ramones', 'Sex Pistols', 'The Clash', 'Dead Kennedys', 'Black Flag', 'Minor Threat', 'Bad Brains', 'Joy Division', 'Siouxsie and the Banshees', 'Green Day', 'Blink-182', 'My Chemical Romance', 'IDLES', 'Turnstile', 'Fontaines D.C.'],
    datingTraps: 'Produktionsqualität (DIY vs. Major Label), Pop-Punk-Ära (90er-00er), Post-Punk-Revival (2000er+), Emo-Wellen',
    avoidTerms: []
  },
  'Klassik': {
    description: 'Barock, Klassik, Romantik, Moderne, Zeitgenössisch. Aufnahmen klassischer Werke.',
    referenceArtists: ['Bach', 'Mozart', 'Beethoven', 'Chopin', 'Brahms', 'Debussy', 'Stravinsky', 'Shostakovich', 'Philip Glass', 'Steve Reich', 'Arvo Pärt', 'Max Richter', 'Ólafur Arnalds', 'Nils Frahm'],
    datingTraps: 'Recording-Techniken (historisch vs. modern), Interpretationsstile verschiedener Epochen, Neoklassik-Bewegung (2010er+)',
    avoidTerms: ['Crossover', 'Classic-Pop-Arrangements']
  }
};

const server = http.createServer(async (req, res) => {
  // Statische Dateien für nicht-API-Routen
  if (!req.url.startsWith('/api/')) {
    return serveStatic(req, res);
  }

  // CORS: Erlaube Aufrufe aus dem Browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body || '{}');

      if (req.url === '/api/suggest-song') {
        const { genres, genre, difficulty, yearMin, yearMax, count } = data;
        const genreList = Array.isArray(genres) ? genres : (genre ? [genre] : ['Pop']);
        const numSongs = Math.min(Math.max(parseInt(count, 10) || 12, 5), 15);
        const numCandidates = Math.min(40, Math.max(20, numSongs * 4));
        const maxYear = yearMax || new Date().getFullYear();
        const minYear = yearMin || 1940;
        const genreStr = genreList.join(', ');
        const debugSuggest = process.env.DEBUG_SUGGEST_SONGS === 'true' || process.env.DEBUG_SUGGEST_SONGS === '1';

        // Genre-Expertise-Kontext aufbauen
        const genreContextParts = genreList
          .map(g => GENRE_EXPERTISE[g])
          .filter(Boolean)
          .map(info => `
**${info.description}**
Referenz-Artists (ORIENTIERE DICH AN DIESER LIGA): ${info.referenceArtists.join(', ')}
Typische Datierungs-Fallen für dieses Genre: ${info.datingTraps}
VERMEIDE UNBEDINGT: ${info.avoidTerms.join(', ') || 'keine spezifischen Ausschlüsse'}`);

        const genreExpertiseBlock = genreContextParts.length > 0 ? `

GENRE-EXPERTISE (KRITISCH – LIES DAS VOR DEM AUSWÄHLEN):
${genreContextParts.join('\n')}

Die Referenz-Artists sind KEINE Pflicht, aber zeigen das NIVEAU und den STIL. Schlage Artists vor, die in derselben Liga spielen – nicht Mainstream-Crossover oder Genre-fremde Acts.
` : '';

        const curatorPrompt = `KRITISCH – ZUERST LESEN:
Die App sucht ZWINGEND mit ORIGINAL-ARTIST und SONGTITEL. Im Feld "artist" darf NUR der Künstler stehen, der den Song ZU ERST veröffentlicht hat – niemals Cover-, Tribute-, Karaoke- oder „Vitamin String Quartet“-Interpreten. Jeder Eintrag mit Nicht-Original-Interpret wird serverseitig verworfen und macht die Liste unbrauchbar. Song = nur der Original-Titel (kein Remix, kein Live, kein feat.).

Rolle: Du bist Kurator für ein Jahres-Ratespiel. Du erzeugst einen Kandidatenpool von Songs, die sich gut zum Datieren eignen – weil sie systematisch falsch eingeschätzt werden („zu früh“ oder „zu spät“).

Ziel: Songs, die Spaß machen zu datieren. Nur Songs, bei denen du einen klaren „Datierungs-Irrtum“ vorhersagen kannst: typische Fehlrichtung (zu früh / zu spät), erwartete Fehlspanne in Jahren, und 2–3 konkrete hörbare Gründe (Drum-Sound, Synth-Typ, Mix, Vocal-Style, Genrephase, Produktionsästhetik). Ohne diese Begründung darf ein Song nicht in die Liste.

Rahmen (VERBINDLICH):
- Zeitspanne ${minYear}–${maxYear}: VERBINDLICH. Schlage NUR Songs vor, die in diesem Zeitraum ZUM ERSTEN MAL veröffentlicht wurden. NIEMALS Songs aus anderen Jahrzehnten: z. B. bei 2000–2025 KEIN „Stairway to Heaven" (1971), KEIN Led Zeppelin/Queen aus 70er/80ern, KEIN Klassiker, dessen Erstveröffentlichung vor ${minYear} oder nach ${maxYear} liegt.
- Genres: ${genreStr} – WICHTIG: Siehe Genre-Expertise unten!
- Schwierigkeit: ${difficulty || 'Beginner'} (steuert Strenge der Auswahl, siehe unten).
${genreExpertiseBlock}

Kandidatenpool: Erzeuge genau ${numCandidates} Kandidaten. Du wirst intern verwerfen; am Ende brauchen wir nur ${numSongs} Songs, aber der Pool muss groß genug sein, um qualitativ zu filtern.

Pro Song (Pflicht):
- artist: Nur der ORIGINAL-Künstler, der den Song zuerst veröffentlicht hat. Kein Cover, kein Karaoke, kein Tribute, kein feat./featuring.
- song: Nur der Original-Titel, keine Zusätze wie (feat.), (Mix), (Remix), (Remaster), (Live).
- trap: Objekt mit:
  - direction: "too_early" (meist zu früh datiert) oder "too_late" (meist zu spät datiert)
  - expected_error_years: Zahl (erwartete durchschnittliche Fehlspanne in Jahren)
  - listening_clues: Array mit 2–4 konkreten hörbaren Gründen (Drums, Synth, Mix, Vocal, Arrangement, Genrephase)
  - aha_line: Ein Satz im Stil „Klar denkt man X – aber hör mal auf Y" (für die Auflösung im Spiel)

Schwierigkeit steuert Strenge (nicht nur Bekanntheit):
- beginner: eher bekannte Songs, Fehlspanne typ. 2–4 Jahre, klare Marker, wenig „fies“.
- intermediate: bekannte Artists, teils weniger erwartete Songs, Fehlspanne typ. 4–7 Jahre, Übergänge/Stilbrüche.
- expert: Songs, die selbst Musikfans falsch datieren; Fehlspanne >= 7 Jahre ODER starke Retro-/Voraus-seiner-Zeit-Falle. Keine Obskurität nur um der Schwierigkeit willen.

Hard No-Gos (Null Toleranz):
- Zeitspanne: Jeder Song muss in ${minYear}–${maxYear} ERSTVERÖFFENTLICHT worden sein. Kein 70er-/80er-/90er-Klassiker, wenn der Zeitraum z. B. 2000–2025 ist (kein Stairway to Heaven, kein Bohemian Rhapsody außerhalb des Zeitraums).
- NIEMALS Covers, Tributes, Karaoke, Live-Versionen, Vitamin String Quartet, The Chant Masters, Piano Guys, Rockabye Baby, Hit Crew, Kids Bop, Various Artists, String-Quartet-, Tribute-, Cover- oder Karaoke-Interpreten, feat./featuring. artist = ausschließlich der ORIGINAL-Künstler (der Song zuerst veröffentlicht hat). Song = nur Studio-Original, KEIN Live, KEIN Remix, KEIN Remaster.
- Keine „Jahres-Lehrbuch“-Songs ohne Twist.
- Keine extrem obskuren Songs nur um schwierig zu sein.
- Keine Duplikate: Jeder Song (Artist + Titel) nur EINMAL in der Liste. Auch nicht mit abweichender Schreibweise (z. B. nicht „Queen“ und „Queen (UK)“ – das ist derselbe Künstler, nur ein Eintrag).
- Maximal 1 Song pro Artist im gesamten Batch.`;

        const outputPrompt = `Antworte NUR mit einem einzigen JSON-Objekt im folgenden Schema. Kein anderer Text, kein Markdown, kein \`\`\`json.

Schema (strict):
{
  "songs": [
    {
      "artist": "Künstlername (nur Original-Interpret)",
      "song": "Songtitel (nur Original, keine Klammern)",
      "trap": {
        "direction": "too_early" oder "too_late",
        "expected_error_years": <Zahl>,
        "listening_clues": ["hörbarer Grund 1", "hörbarer Grund 2", "optional 3-4."],
        "aha_line": "Klar denkt man X – aber hör mal auf Y"
      }
    }
  ]
}

Genau ${numCandidates} Einträge in "songs". Jeder Eintrag muss "artist", "song" und "trap" haben. Artist = nur Original-Interpret (ohne Klammerzusätze wie (UK)). Song = nur Original-Titel (kein Live, kein Remix, kein Remaster). KRITISCH: Jeder Song nur EINMAL – keine Dubletten. Jeder Song muss in ${minYear}–${maxYear} erstveröffentlicht worden sein. Kein Erscheinungsjahr im Output.`;

        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4.1-mini',
            messages: [
              { role: 'user', content: curatorPrompt },
              { role: 'user', content: outputPrompt }
            ],
            max_tokens: 4500,
            temperature: 0.3
          })
        });

        const openaiData = await openaiRes.json();
        if (openaiData.error) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: openaiData.error.message || 'OpenAI Fehler', songs: [] }));
          return;
        }

        const raw = openaiData.choices?.[0]?.message?.content?.trim() || '';

        // Blocklist als Regex-Patterns für bessere Erkennung
        const artistBlocklistPatterns = [
            // Explizite Cover-/Tribute-Projekte
            /tribute/i, /karaoke/i, /cover\s*band/i, /string\s*quartet/i,
            // Bekannte Cover-Interpreten
            /vitamin\s*string/i, /piano\s*guys/i, /rockabye\s*baby/i, /hit\s*crew/i,
            /kidz?\s*bop/i, /postmodern\s*jukebox/i, /scott\s*bradlee/i, /chant\s*masters/i,
            /midnite\s*string/i, /london\s*symphony.*tribute/i, /punk\s*rock\s*factory/i,
            /scala\s.*kolacny/i, /northern\s*kings/i,
            // Generische Cover-Indikatoren
            /various\s*artists/i, /sounds\s*of\s/i, /lullaby/i, /lullabies/i,
            /acoustic\s*version/i, /piano\s*version/i,
            /reimagined/i, /reimagining/i,
            /as\s*made\s*famous/i, /made\s*famous\s*by/i, /in\s*the\s*style\s*of/i,
            /cover\s*of/i, /cover\s*by/i, /tribute\s*to/i,
            /smooth\s*jazz\s*all/i, /easy\s*listening\s*all/i,
            // Featuring (oft nicht das Original)
            /\bfeat\.\s/i, /\bfeaturing\s/i, /\bft\.\s/i,
            // Verdächtige Wörter im Artist-Namen (NICHT "experience" - Jimi Hendrix Experience!)
            /\bsalute\s*to\b/i, /\bhomage\s*to\b/i
        ];

        const songBlocklistPatterns = [
            /\(remix\)/i, /\(remaster/i, /\(live\)/i, /\(cover\)/i, /\(tribute\)/i,
            /\bfeat\.\s/i, /\bfeaturing\s/i, /\bft\.\s/i,
            /\s-\s*cover$/i, /\s-\s*tribute$/i, /\s-\s*live$/i,
            /\(.*mix\)/i, /\bredux\b/i, /\brevisited\b/i
        ];

        // Hilfsfunktion für Regex-Blocklist-Check
        const matchesBlocklist = (str, patterns) => patterns.some(p => p.test(str));

        const normalizeForDedup = (str) => {
          const s = (str || '').trim().toLowerCase();
          return s.replace(/\s*\([^)]*\)\s*$/g, '').replace(/\s*-\s*topic\s*$/gi, '').replace(/\s*-\s*[^-|]+$/g, '').trim();
        };

        // Trap-Validierung: Nur Songs mit vollständiger, konkreter Datierungsfalle akzeptieren
        const isValidTrap = (trap) => {
          if (!trap || typeof trap !== 'object') return false;
          // direction muss too_early oder too_late sein
          if (!['too_early', 'too_late'].includes(trap.direction)) return false;
          // expected_error_years muss eine positive Zahl sein
          if (typeof trap.expected_error_years !== 'number' || trap.expected_error_years < 1) return false;
          // listening_clues muss ein Array mit mindestens 2 konkreten Einträgen sein
          if (!Array.isArray(trap.listening_clues) || trap.listening_clues.length < 2) return false;
          // Keine generischen Floskeln
          const genericPhrases = ['typisch für', 'klingt nach', 'erinnert an das jahr', 'passt zum zeitraum'];
          const hasGeneric = trap.listening_clues.some(c =>
            genericPhrases.some(p => (c || '').toLowerCase().includes(p))
          );
          if (hasGeneric) return false;
          return true;
        };

        let songs = [];
        let debugList = [];
        const objMatch = raw.match(/\{[\s\S]*"songs"[\s\S]*\}/);
        if (objMatch) {
          try {
            const parsed = JSON.parse(objMatch[0]);
            const rawList = Array.isArray(parsed.songs) ? parsed.songs : [];
            const seenKey = new Set();
            const seenArtist = new Set();

            for (const x of rawList) {
              if (!x || typeof x.artist !== 'string' || typeof x.song !== 'string') continue;
              const artist = String(x.artist).trim();
              const song = String(x.song).trim();
              const key = `${normalizeForDedup(artist)}|${normalizeForDedup(song)}`;
              if (seenKey.has(key)) continue;
              // Blocklist-Check mit Regex-Patterns
              if (matchesBlocklist(artist, artistBlocklistPatterns)) continue;
              if (matchesBlocklist(song, songBlocklistPatterns)) continue;
              // Trap-Validierung: Nur Songs mit konkreter Datierungsfalle
              if (!isValidTrap(x.trap)) {
                if (debugSuggest) console.log(`[Trap-Check] ${artist} - ${song}: Ungültige/fehlende Trap-Daten`);
                continue;
              }
              const artistNorm = normalizeForDedup(artist);
              if (seenArtist.has(artistNorm)) continue;
              seenKey.add(key);
              seenArtist.add(artistNorm);
              songs.push({ artist, song });
              if (debugSuggest) {
                debugList.push({ artist, song, trap: x.trap });
              }
            }
            songs = songs.slice(0, numSongs);
          } catch (_) {}
        }

        const payload = songs.length ? { songs } : { error: 'Keine gültigen Songs', songs: [] };
        if (debugSuggest && debugList.length) payload.debug = debugList.slice(0, numSongs);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
        return;
      }

      if (req.url === '/api/spotify-search') {
        const { artist, song, yearMin, yearMax } = data;
        const artistStr = (artist || '').trim();
        const songStr = (song || '').trim();
        if (!artistStr || !songStr) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ track: null, error: 'artist und song erforderlich' }));
          return;
        }
        const token = await getSpotifyAccessToken();
        if (!token) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ track: null, error: 'Spotify nicht konfiguriert (SPOTIFY_CLIENT_ID/SECRET in .env)' }));
          return;
        }
        const yearMinVal = yearMin != null ? parseInt(yearMin, 10) : null;
        const yearMaxVal = yearMax != null ? parseInt(yearMax, 10) : null;
        let q = [artistStr, songStr].join(' ');
        if (yearMinVal != null && yearMaxVal != null && !isNaN(yearMinVal) && !isNaN(yearMaxVal)) {
          q += ' year:' + yearMinVal + '-' + yearMaxVal;
        }
        const url = `https://api.spotify.com/v1/search?type=track&limit=50&q=${encodeURIComponent(q)}`;
        try {
          const spotifyRes = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          const spotifyData = await spotifyRes.json();
          const items = spotifyData.tracks?.items || [];
          // Preview wird vom Client über iTunes geholt – hier nur passende Songs finden (mit oder ohne Spotify-Preview)
          const withMeta = items.filter(t => t.artists?.[0] && t.album?.release_date);
          const withYear = (yearMinVal != null && yearMaxVal != null && !isNaN(yearMinVal) && !isNaN(yearMaxVal))
            ? withMeta.filter(t => {
                const y = parseInt((t.album.release_date || '').substring(0, 4), 10);
                return y >= yearMinVal && y <= yearMaxVal;
              })
            : withMeta;
          // Frühestes Release zuerst = Original-Erscheinungsjahr (z. B. Kind of Blue 1959, nicht Remaster 2005)
          withYear.sort((a, b) => (a.album.release_date || '').localeCompare(b.album.release_date || ''));
          // Katalogfehler vermeiden: Jahr vor 1940 oft falsch (z. B. Take Five als 1939 statt 1959) – bevorzuge frühestes ab 1940
          const minSaneYear = 1940;
          const sane = withYear.filter(t => {
            const y = parseInt((t.album.release_date || '').substring(0, 4), 10);
            return !isNaN(y) && y >= minSaneYear;
          });
          const first = (sane.length > 0 ? sane[0] : null) || withYear[0] || withMeta[0];
          if (!first) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ track: null }));
            return;
          }
          const releaseDate = first.album.release_date || '';
          const isoDate = releaseDate.length === 4 ? releaseDate + '-01-01' : (releaseDate.length >= 10 ? releaseDate : releaseDate + '-01');
          const track = {
            trackName: first.name,
            artistName: first.artists[0].name,
            releaseDate: isoDate,
            previewUrl: first.preview_url || null
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ track }));
        } catch (e) {
          console.error('Spotify Search:', e.message);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ track: null, error: e.message }));
        }
        return;
      }

      if (req.url === '/api/song-info') {
        const userContent = data.userContent || [
          data.prompt,
          '',
          `Song: „${data.trackName}" von ${data.artistName}`,
          `Korrektes Erscheinungsjahr: ${data.releaseYear}`,
          '',
          'Antworte nur mit dem Erklärungstext, ohne Überschrift oder Vorrede.'
        ].join('\n');

        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4.1-mini',
            messages: [{ role: 'user', content: userContent }],
            max_tokens: 300,
            temperature: 0.7
          })
        });

        const openaiData = await openaiRes.json();
        if (openaiData.error) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: openaiData.error.message || 'OpenAI Fehler' }));
          return;
        }
        const text = openaiData.choices?.[0]?.message?.content?.trim() || '';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text }));
        return;
      }

      // iTunes-Suche als Proxy (umgeht CORS-Probleme auf Mobile)
      if (req.url === '/api/itunes-search') {
        const { term, limit } = data;
        if (!term) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'term fehlt' }));
          return;
        }
        try {
          const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${limit || 50}`;
          const itunesRes = await fetch(itunesUrl);
          const itunesData = await itunesRes.json();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(itunesData));
        } catch (e) {
          console.error('iTunes-Proxy Fehler:', e);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message || 'iTunes-Fehler' }));
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (e) {
      console.error(e);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message || 'Serverfehler' }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const localIPs = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIPs.push(net.address);
      }
    }
  }
  console.log(`MusicNerd Proxy läuft auf:`);
  console.log(`  - http://localhost:${PORT} (dieser Rechner)`);
  if (localIPs.length > 0) {
    console.log(`  - http://${localIPs[0]}:${PORT} (für andere Geräte im Netzwerk)`);
  }
  if (SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET) {
    console.log('Spotify-Suche aktiv (primäre Quelle für Song-Previews).');
  } else {
    console.log('Spotify nicht konfiguriert – Song-Suche nutzt nur iTunes. Optional: SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET in .env.');
  }
});
