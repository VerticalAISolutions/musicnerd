/**
 * Kleiner Proxy für MusicNerd: leitet Song-Info-Anfragen an OpenAI GPT-4.1 mini weiter.
 * Benötigt Node.js 18+ (wegen fetch).
 *
 * Einrichtung:
 *   1. Kopiere .env.example nach .env
 *   2. Trage in .env deinen OpenAI-Key ein: OPENAI_API_KEY=sk-...
 *   3. npm install && npm start
 *
 * Der Server liefert die App (nur freigegebene Dateien, siehe PUBLIC_FILES) und die API unter /api/* aus.
 * Optional in .env: CORS_ORIGIN (nur nötig, wenn das Frontend auf einer anderen Domain läuft).
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

// Nur diese Dateien sind öffentlich – alles andere im Projektordner (.env mit API-Key, server.js, …) bleibt privat.
// [\w-] im Dateinamen schließt auch Pfad-Tricks wie "../" aus.
const PUBLIC_FILES = [
  /^\/index\.html$/,
  /^\/curated-match\.js$/,
  /^\/buttons\/[\w-]+\.svg$/,
  /^\/fallback-genres\/[\w-]+\.js$/
];

// Statische Dateien servieren
function serveStatic(req, res) {
  let urlPath = '';
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch (_) {}
  if (urlPath === '/') urlPath = '/index.html';
  if (req.method !== 'GET' && req.method !== 'HEAD' || !PUBLIC_FILES.some(re => re.test(urlPath))) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }
  const fullPath = path.join(__dirname, urlPath);
  const ext = path.extname(fullPath).toLowerCase();
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const headers = { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' };
    // No-Cache für HTML-Dateien
    if (ext === '.html') {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const PORT = process.env.PORT || 3001;
/** Nur setzen, wenn das Frontend auf einer anderen Domain liegt (z. B. https://musicnerd.example). Sonst: same-origin, kein CORS. */
const CORS_ORIGIN = process.env.CORS_ORIGIN || '';
const MAX_BODY_BYTES = 10 * 1024;
const CURRENT_YEAR = new Date().getFullYear();

/** Text aus dem Request säubern: keine Steuerzeichen, begrenzte Länge. */
function cleanText(value, maxLength = 200) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

// Rate-Limit pro IP und Endpunkt (Anfragen pro Minute). Schützt den OpenAI-Key vor Missbrauch und iTunes vor Sperren.
// Ein Spiel mit 15 Runden braucht grob: 1–3× suggest-song, 15× song-info, 50–100× itunes-search.
const RATE_LIMITS = {
  '/api/suggest-song': 10,
  '/api/song-info': 40,
  '/api/itunes-search': 150,
  '/api/spotify-search': 150
};
const rateBuckets = new Map();
function isRateLimited(ip, route) {
  const limit = RATE_LIMITS[route];
  if (!limit) return false;
  const now = Date.now();
  const key = ip + '|' + route;
  let bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.start >= 60000) {
    bucket = { start: now, count: 0 };
    rateBuckets.set(key, bucket);
  }
  bucket.count++;
  return bucket.count > limit;
}
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.start >= 60000) rateBuckets.delete(key);
  }
}, 60000).unref();

/** Client-IP. X-Forwarded-For nur, wenn die Anfrage vom lokalen Reverse-Proxy (nginx) kommt – sonst wäre der Header fälschbar. */
function clientIp(req) {
  const remote = req.socket.remoteAddress || '';
  const fromLocalProxy = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'];
  if (fromLocalProxy && forwarded) {
    // Letzter Eintrag = von nginx angehängte echte Client-IP
    const parts = String(forwarded).split(',').map(x => x.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return remote;
}

// iTunes-Antworten cachen: dieselben Songs werden in vielen Spielen gesucht, und iTunes erlaubt nur ca. 20 Anfragen/Minute pro Server-IP
const ITUNES_CACHE_MS = 60 * 60 * 1000;
const ITUNES_CACHE_MAX = 3000;
const itunesCache = new Map();

// Erklärtexte zur Auflösung – serverseitig, damit /api/song-info kein freier OpenAI-Zugang ist
const SONG_INFO_PROMPTS = {
  default: `Erkläre kurz (maximal 3–4 Sätze), warum dieser Song zeitlich so einzuordnen ist.
Beziehe dich auf konkrete hörbare Merkmale (z. B. Drum-Sound, Synths, Vocal-Stil). Ton: musikbegeisterter Freund.
Nenne weder Songtitel noch Erscheinungsjahr – beides steht bereits darüber. Jeder Satz: etwas Hörbares oder Konkretes.`,
  soundtrack: `Erkläre kurz (maximal 3–4 Sätze) dieses Stück Filmmusik: Was passiert im Film an dieser Stelle bzw. wofür steht das Stück, wer hat es geschrieben, und was macht es typisch für seine Zeit (z. B. großes Sinfonieorchester, 80er-Synthesizer, moderner Hybrid-Sound aus Orchester und Elektronik)?
Ton: filmbegeisterter Freund, wohlwollend, nicht belehrend. Nenne das Erscheinungsjahr nicht – es steht bereits darüber.`,
  party: `Erzähl kurz (maximal 3 Sätze), warum dieser Song bis heute auf Partys läuft und was ihn in seine Zeit einordnet (z. B. Sound, Tanz, Zeitgeist), gern mit einem kleinen Fun Fact.
Ton: gut gelaunter Freund, kein Fachjargon, nicht belehrend. Nenne weder Songtitel noch Erscheinungsjahr – beides steht bereits darüber.`
};

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
    avoidTerms: ['EDM', 'Festival', 'Drop', 'Mainstream', 'Commercial', 'Hands Up', 'Big Room', 'David Guetta', 'Martin Garrix', 'Avicii', 'Calvin Harris', 'Tiësto (nach 2005)']
  },
  'Electronic': {
    description: 'IDM, Ambient, UK Garage, Trip-Hop, Electronica, Experimental. NICHT gleichbedeutend mit Techno, House oder EDM.',
    referenceArtists: ['Aphex Twin', 'Boards of Canada', 'Burial', 'Four Tet', 'Massive Attack', 'Portishead', 'Bonobo', 'Jon Hopkins', 'Caribou', 'Floating Points', 'Autechre', 'Squarepusher', 'Amon Tobin', 'SBTRKT', 'James Blake', 'Mount Kimbie', 'Moderat', 'Apparat', 'Kiasmos', 'Nils Frahm', 'Ólafur Arnalds', 'Max Cooper'],
    avoidTerms: ['EDM', 'Festival', 'Mainstream', 'Pop-Electronic', 'Hands Up']
  },
  'Rock': {
    description: 'Classic Rock, Alternative Rock, Indie Rock, Hard Rock, Prog Rock. Von Led Zeppelin bis Radiohead.',
    referenceArtists: ['Led Zeppelin', 'Pink Floyd', 'The Rolling Stones', 'Queen', 'Nirvana', 'Radiohead', 'The Strokes', 'Arctic Monkeys', 'Foo Fighters', 'Pearl Jam', 'Soundgarden', 'Alice in Chains', 'Red Hot Chili Peppers', 'Muse', 'The White Stripes', 'Kings of Leon', 'The Black Keys', 'Tame Impala'],
    avoidTerms: ['Nu Metal', 'Post-Grunge Radio Rock']
  },
  'Pop': {
    description: 'Mainstream Pop, Synth-Pop, Art Pop, Indie Pop. Von ABBA bis Taylor Swift.',
    referenceArtists: ['Michael Jackson', 'Madonna', 'Prince', 'Whitney Houston', 'Britney Spears', 'NSYNC', 'Backstreet Boys', 'Lady Gaga', 'Beyoncé', 'Taylor Swift', 'Dua Lipa', 'The Weeknd', 'Bruno Mars', 'Ariana Grande', 'Billie Eilish', 'Lorde', 'Charli XCX', 'Robyn'],
    avoidTerms: []
  },
  'Hip-Hop': {
    description: 'Old School, Golden Age, Gangsta Rap, Conscious Hip-Hop, Trap, Boom Bap. Von Grandmaster Flash bis Kendrick Lamar.',
    referenceArtists: ['Grandmaster Flash', 'Run-DMC', 'Public Enemy', 'N.W.A', 'Wu-Tang Clan', 'Nas', 'The Notorious B.I.G.', 'Tupac', 'A Tribe Called Quest', 'OutKast', 'Jay-Z', 'Eminem', 'Kanye West', 'Kendrick Lamar', 'J. Cole', 'Drake', 'Travis Scott', 'Tyler, The Creator', 'MF DOOM'],
    avoidTerms: []
  },
  'Indie': {
    description: 'Indie Rock, Indie Pop, Indie Folk, Lo-Fi. Von Pavement bis Bon Iver.',
    referenceArtists: ['Pavement', 'Pixies', 'Sonic Youth', 'The Smiths', 'R.E.M.', 'Arcade Fire', 'Bon Iver', 'Fleet Foxes', 'Vampire Weekend', 'MGMT', 'Grizzly Bear', 'Beach House', 'Mac DeMarco', 'Father John Misty', 'Phoebe Bridgers', 'Big Thief', 'Fontaines D.C.', 'black midi'],
    avoidTerms: ['Mainstream', 'Major Label Sound']
  },
  'R&B / Soul': {
    description: 'Classic Soul, Motown, Contemporary R&B, Neo-Soul, Alternative R&B.',
    referenceArtists: ['Stevie Wonder', 'Marvin Gaye', 'Aretha Franklin', 'Al Green', 'Prince', 'Whitney Houston', 'TLC', 'Aaliyah', 'Erykah Badu', 'D\'Angelo', 'Lauryn Hill', 'Frank Ocean', 'The Weeknd', 'SZA', 'Daniel Caesar', 'H.E.R.', 'Summer Walker'],
    avoidTerms: []
  },
  'Jazz': {
    description: 'Swing, Bebop, Cool Jazz, Free Jazz, Fusion, Contemporary Jazz.',
    referenceArtists: ['Louis Armstrong', 'Duke Ellington', 'Charlie Parker', 'Miles Davis', 'John Coltrane', 'Thelonious Monk', 'Dave Brubeck', 'Bill Evans', 'Herbie Hancock', 'Weather Report', 'Pat Metheny', 'Kamasi Washington', 'Robert Glasper', 'Snarky Puppy', 'GoGo Penguin'],
    avoidTerms: ['Smooth Jazz', 'Elevator Music']
  },
  'Metal': {
    description: 'Heavy Metal, Thrash, Death Metal, Black Metal, Doom, Progressive Metal.',
    referenceArtists: ['Black Sabbath', 'Iron Maiden', 'Metallica', 'Slayer', 'Megadeth', 'Pantera', 'Tool', 'Opeth', 'Mastodon', 'Gojira', 'Meshuggah', 'Lamb of God', 'System of a Down', 'Deftones', 'Parkway Drive'],
    avoidTerms: ['Nu Metal (außer explizit gewünscht)', 'Metalcore Radio-Hits']
  },
  'Punk': {
    description: 'Classic Punk, Hardcore, Post-Punk, Pop-Punk, Emo.',
    referenceArtists: ['Ramones', 'Sex Pistols', 'The Clash', 'Dead Kennedys', 'Black Flag', 'Minor Threat', 'Bad Brains', 'Joy Division', 'Siouxsie and the Banshees', 'Green Day', 'Blink-182', 'My Chemical Romance', 'IDLES', 'Turnstile', 'Fontaines D.C.'],
    avoidTerms: []
  },
  'Klassik': {
    description: 'Barock, Klassik, Romantik, Moderne, Zeitgenössisch. Aufnahmen klassischer Werke.',
    referenceArtists: ['Bach', 'Mozart', 'Beethoven', 'Chopin', 'Brahms', 'Debussy', 'Stravinsky', 'Shostakovich', 'Philip Glass', 'Steve Reich', 'Arvo Pärt', 'Max Richter', 'Ólafur Arnalds', 'Nils Frahm'],
    avoidTerms: ['Crossover', 'Classic-Pop-Arrangements']
  }
};

const server = http.createServer(async (req, res) => {
  // Statische Dateien für nicht-API-Routen
  if (!req.url.startsWith('/api/')) {
    return serveStatic(req, res);
  }

  // CORS nur, wenn ausdrücklich konfiguriert – die App selbst ruft die API von derselben Domain auf
  if (CORS_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Nur POST erlaubt' });
  }

  const route = req.url.split('?')[0];
  if (isRateLimited(clientIp(req), route)) {
    return sendJson(res, 429, { error: 'Zu viele Anfragen – bitte kurz warten.', songs: [], results: [] });
  }

  let body = '';
  let tooLarge = false;
  req.on('data', chunk => {
    if (tooLarge) return;
    body += chunk;
    if (body.length > MAX_BODY_BYTES) {
      tooLarge = true;
      sendJson(res, 413, { error: 'Anfrage zu groß' });
      req.destroy();
    }
  });
  req.on('end', async () => {
    if (tooLarge) return;
    try {
      const data = JSON.parse(body || '{}');

      if (route === '/api/suggest-song') {
        const { genres, genre, count } = data;
        // Eingaben landen im Prompt → nur kurze Strings, bekannte Schwierigkeit, plausible Jahre
        const rawGenres = Array.isArray(genres) ? genres : (genre ? [genre] : []);
        let genreList = rawGenres.filter(g => typeof g === 'string').map(g => cleanText(g, 60)).filter(Boolean).slice(0, 15);
        if (!genreList.length) genreList = ['Pop'];
        const difficulty = ['beginner', 'intermediate', 'expert'].includes(data.difficulty) ? data.difficulty : 'beginner';
        const numSongs = Math.min(Math.max(parseInt(count, 10) || 12, 5), 15);
        const numCandidates = Math.min(40, Math.max(20, numSongs * 4));
        const clampYear = (v, fallback) => Math.min(Math.max(parseInt(v, 10) || fallback, 1900), CURRENT_YEAR);
        const minYear = clampYear(data.yearMin, 1940);
        const maxYear = Math.max(clampYear(data.yearMax, CURRENT_YEAR), minYear);
        const genreStr = genreList.join(', ');
        const debugSuggest = process.env.DEBUG_SUGGEST_SONGS === 'true' || process.env.DEBUG_SUGGEST_SONGS === '1';

        // Genre-Expertise-Kontext aufbauen
        const genreContextParts = genreList
          .map(g => GENRE_EXPERTISE[g])
          .filter(Boolean)
          .map(info => `
**${info.description}**
Referenz-Artists (ORIENTIERE DICH AN DIESER LIGA): ${info.referenceArtists.join(', ')}
VERMEIDE UNBEDINGT: ${info.avoidTerms.join(', ') || 'keine spezifischen Ausschlüsse'}`);

        const genreExpertiseBlock = genreContextParts.length > 0 ? `

GENRE-EXPERTISE (KRITISCH – LIES DAS VOR DEM AUSWÄHLEN):
${genreContextParts.join('\n')}

Die Referenz-Artists sind KEINE Pflicht, aber zeigen den STIL des Genres. Keine Genre-fremden Acts. ${difficulty === 'beginner' ? 'Bei beginner sind die größten Mainstream-Hits des Genres ausdrücklich erwünscht.' : 'Keine Mainstream-Crossover-Acts.'}
` : '';

        const curatorPrompt = `KRITISCH – ZUERST LESEN:
Die App sucht ZWINGEND mit ORIGINAL-ARTIST und SONGTITEL. Im Feld "artist" darf NUR der Künstler stehen, der den Song ZU ERST veröffentlicht hat – niemals Cover-, Tribute-, Karaoke- oder „Vitamin String Quartet“-Interpreten. Jeder Eintrag mit Nicht-Original-Interpret wird serverseitig verworfen und macht die Liste unbrauchbar. Song = nur der Original-Titel (kein Remix, kein Live, kein feat.).

Rolle: Du bist Kurator für ein geselliges Jahres-Ratespiel. Mehrere Leute hören gemeinsam eine 30-Sekunden-Preview und schätzen das Erscheinungsjahr. Du schlägst Songs vor, die Spaß machen, weil man sie (je nach Schwierigkeit) kennt oder einordnen kann.

Rahmen (VERBINDLICH):
- Zeitspanne ${minYear}–${maxYear}: VERBINDLICH. Schlage NUR Songs vor, die in diesem Zeitraum ZUM ERSTEN MAL veröffentlicht wurden. NIEMALS Songs aus anderen Jahrzehnten: z. B. bei 2000–2025 KEIN „Stairway to Heaven" (1971), KEIN Led Zeppelin/Queen aus 70er/80ern, KEIN Klassiker, dessen Erstveröffentlichung vor ${minYear} oder nach ${maxYear} liegt.
- Genres: ${genreStr} – WICHTIG: Siehe Genre-Expertise unten! Bei mehreren Genres die Songs GLEICHMÄSSIG auf alle Genres verteilen.
- Vielfalt: Wähle Artists quer über Jahrzehnte – auch Artists, die nicht in der Referenzliste stehen. Vielfalt bei den ARTISTS, nicht durch unbekanntere Songs.
- Schwierigkeit: ${difficulty} (steuert, WIE BEKANNT die Songs sind, siehe unten).
${genreExpertiseBlock}

Kandidatenpool: Erzeuge genau ${numCandidates} Kandidaten. Am Ende brauchen wir nur ${numSongs} Songs, aber der Pool muss groß genug sein, um Dubletten und Covers herauszufiltern.

Pro Song (Pflicht):
- artist: Nur der ORIGINAL-Künstler, der den Song zuerst veröffentlicht hat. Kein Cover, kein Karaoke, kein Tribute, kein feat./featuring.
- song: Nur der Original-Titel, keine Zusätze wie (feat.), (Mix), (Remix), (Remaster), (Live).

Schwierigkeit = Bekanntheit (die Regeln bleiben gleich):
- beginner: große Hits, die auch Gelegenheitshörer sofort erkennen – Chart-Erfolge, Radio-Dauerbrenner, DER bekannteste Song des Artists. Test: Würde ein durchschnittlicher Gast auf einer Geburtstagsfeier den Song nach 10 Sekunden erkennen? Wenn nicht → nicht beginner. Lieber zu bekannt als zu speziell.
- intermediate: bekannte Artists, aber nicht nur deren größter Hit – zweite/dritte Singles, bekannte Album-Tracks, Hits, die man kennt, aber nicht jeden Tag hört.
- expert: Songs für Musikfans – Album-Tracks, Genre-Klassiker, die Kenner kennen, Kritikerlieblinge. Keine Obskurität nur um der Schwierigkeit willen.

Hard No-Gos (Null Toleranz):
- Zeitspanne: Jeder Song muss in ${minYear}–${maxYear} ERSTVERÖFFENTLICHT worden sein. Kein 70er-/80er-/90er-Klassiker, wenn der Zeitraum z. B. 2000–2025 ist (kein Stairway to Heaven, kein Bohemian Rhapsody außerhalb des Zeitraums).
- NIEMALS Covers, Tributes, Karaoke, Live-Versionen, Vitamin String Quartet, The Chant Masters, Piano Guys, Rockabye Baby, Hit Crew, Kids Bop, Various Artists, String-Quartet-, Tribute-, Cover- oder Karaoke-Interpreten, feat./featuring. artist = ausschließlich der ORIGINAL-Künstler (der Song zuerst veröffentlicht hat). Song = nur Studio-Original, KEIN Live, KEIN Remix, KEIN Remaster.
- Keine extrem obskuren Songs nur um schwierig zu sein.
- Keine Duplikate: Jeder Song (Artist + Titel) nur EINMAL in der Liste. Auch nicht mit abweichender Schreibweise (z. B. nicht „Queen“ und „Queen (UK)“ – das ist derselbe Künstler, nur ein Eintrag).
- Maximal 1 Song pro Artist im gesamten Batch.`;

        const outputPrompt = `Antworte NUR mit einem einzigen JSON-Objekt im folgenden Schema. Kein anderer Text, kein Markdown, kein \`\`\`json.

Schema (strict):
{
  "songs": [
    {
      "artist": "Künstlername (nur Original-Interpret)",
      "song": "Songtitel (nur Original, keine Klammern)"
    }
  ]
}

Genau ${numCandidates} Einträge in "songs". Jeder Eintrag muss "artist" und "song" haben. Artist = nur Original-Interpret (ohne Klammerzusätze wie (UK)). Song = nur Original-Titel (kein Live, kein Remix, kein Remaster). KRITISCH: Jeder Song nur EINMAL – keine Dubletten. Jeder Song muss in ${minYear}–${maxYear} erstveröffentlicht worden sein. Kein Erscheinungsjahr im Output.`;

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
            temperature: 0.7
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
              const artistNorm = normalizeForDedup(artist);
              if (seenArtist.has(artistNorm)) continue;
              seenKey.add(key);
              seenArtist.add(artistNorm);
              songs.push({ artist, song });
              if (debugSuggest) {
                debugList.push({ artist, song });
              }
            }
            // Mischen vor dem Kürzen: Das Modell listet Genre für Genre – sonst landet bei "Rock, Pop" nur Rock in der Auswahl
            for (let i = songs.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [songs[i], songs[j]] = [songs[j], songs[i]];
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

      if (route === '/api/spotify-search') {
        const { artist, song, yearMin, yearMax } = data;
        const artistStr = cleanText(artist);
        const songStr = cleanText(song);
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

      if (route === '/api/song-info') {
        // Prompt wird hier gebaut – der Browser schickt nur Song-Daten (sonst wäre der Endpunkt ein freier OpenAI-Zugang)
        const artistName = cleanText(data.artistName);
        const trackName = cleanText(data.trackName);
        const film = cleanText(data.film);
        const releaseYear = parseInt(data.releaseYear, 10);
        const kind = data.kind === 'soundtrack' || data.kind === 'party' ? data.kind : 'default';
        if (!artistName || !trackName || !(releaseYear >= 1900 && releaseYear <= CURRENT_YEAR + 1)) {
          return sendJson(res, 400, { error: 'artistName, trackName und releaseYear erforderlich' });
        }
        const context = kind === 'soundtrack' && film
          ? `Stück „${trackName}" von ${artistName} aus dem Film „${film}", Kinostart ${releaseYear}`
          : `Song „${trackName}" von ${artistName}, Erscheinungsjahr ${releaseYear}`;
        const userContent = `${SONG_INFO_PROMPTS[kind]}

(Kontext für dich: ${context})

Antworte nur mit dem Erklärungstext. Keine Überschrift, keine Nennung von Songtitel oder Jahr – das steht schon darüber.`;

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
      if (route === '/api/itunes-search') {
        const term = cleanText(data.term);
        if (!term) return sendJson(res, 400, { error: 'term fehlt', results: [] });
        const limit = Math.min(Math.max(parseInt(data.limit, 10) || 50, 1), 50);
        // Optional: Store-Land (z. B. DE – deutsche Hits gibt es im US-Store oft nur live/als Cover)
        const country = /^[A-Za-z]{2}$/.test(data.country || '') ? data.country.toUpperCase() : '';
        const cacheKey = `${country}|${limit}|${term.toLowerCase()}`;
        const cached = itunesCache.get(cacheKey);
        if (cached && Date.now() - cached.time < ITUNES_CACHE_MS) {
          return sendJson(res, 200, cached.data);
        }
        try {
          const countryParam = country ? `&country=${country}` : '';
          const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${limit}${countryParam}`;
          const itunesRes = await fetch(itunesUrl);
          if (!itunesRes.ok) {
            // 403/429 = iTunes-Rate-Limit; nicht cachen, damit es später erneut versucht wird
            console.warn('iTunes-Proxy:', itunesRes.status, term);
            return sendJson(res, 502, { error: `iTunes antwortet mit ${itunesRes.status}`, results: [] });
          }
          const itunesData = await itunesRes.json();
          itunesCache.set(cacheKey, { time: Date.now(), data: itunesData });
          // Ältesten Eintrag verwerfen (Map behält die Einfügereihenfolge)
          if (itunesCache.size > ITUNES_CACHE_MAX) itunesCache.delete(itunesCache.keys().next().value);
          sendJson(res, 200, itunesData);
        } catch (e) {
          console.error('iTunes-Proxy Fehler:', e);
          sendJson(res, 502, { error: e.message || 'iTunes-Fehler', results: [] });
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
