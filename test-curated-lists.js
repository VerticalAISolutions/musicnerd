#!/usr/bin/env node
/**
 * Prüft die kuratierten Listen (Partyhits, Filmmusik) direkt gegen die iTunes Search API:
 * Gibt es für jeden Eintrag einen Treffer mit Preview, passendem Artist und Titel?
 * Nutzt dieselbe Auswahl-Logik wie das Spiel (curated-match.js).
 *
 * Aufruf: node test-curated-lists.js [partyhits|soundtracks]
 * iTunes erlaubt ca. 20 Requests/Minute → Pause zwischen den Anfragen.
 */

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const CuratedMatch = require('./curated-match.js');

const FILES = { partyhits: 'genrePartyLists', soundtracks: 'genreSoundtrackLists' };
const PAUSE_MS = 3100;

function loadLists(file, key) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'fallback-genres', file + '.js'), 'utf8'), sandbox);
  return sandbox.window[key];
}

async function check(entry) {
  const term = CuratedMatch.searchTerm(entry);
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=50&country=${CuratedMatch.COUNTRY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  return CuratedMatch.pickResult(data.results, entry);
}

async function main() {
  const only = process.argv[2];
  const fails = [];
  let total = 0;
  for (const [file, key] of Object.entries(FILES)) {
    if (only && only !== file) continue;
    const lists = loadLists(file, key);
    for (const [level, entries] of Object.entries(lists)) {
      for (const entry of entries) {
        total++;
        let hit = null;
        try {
          hit = await check(entry);
        } catch (e) {
          console.log(`⚠️  ${file}/${level}: ${entry.artist} – ${entry.song}: ${e.message}`);
        }
        if (hit) {
          console.log(`✅ ${file}/${level}: ${entry.artist} – ${entry.song} (${entry.year}) → ${hit.artistName} | ${hit.trackName} | ${hit.collectionName}`);
        } else {
          console.log(`❌ ${file}/${level}: ${entry.artist} – ${entry.song} (${entry.year})`);
          fails.push(`${file}/${level}: ${entry.artist} – ${entry.song}`);
        }
        await new Promise(r => setTimeout(r, PAUSE_MS));
      }
    }
  }
  console.log(`\n${total - fails.length}/${total} gefunden.`);
  if (fails.length) console.log('Ohne Treffer:\n  ' + fails.join('\n  '));
}

main();
