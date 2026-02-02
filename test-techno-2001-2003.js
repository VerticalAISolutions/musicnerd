#!/usr/bin/env node
/**
 * Test: Techno 2001–2003 Beginner
 * Ruft Suggest-Song und optional Spotify-Suche auf und gibt die Ergebnisse aus.
 *
 * Voraussetzung: Server läuft (npm start), .env mit OPENAI_API_KEY (und optional SPOTIFY_*).
 *
 * Aufruf: node test-techno-2001-2003.js
 */

const BASE = 'http://localhost:3001';

async function suggestSong() {
  console.log('--- Suggest-Song: Techno, 2001–2003, Beginner ---\n');
  const res = await fetch(`${BASE}/api/suggest-song`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      genres: ['Techno'],
      difficulty: 'beginner',
      yearMin: 2001,
      yearMax: 2003,
      count: 12
    })
  });
  const data = await res.json();
  if (data.error) {
    console.log('Fehler:', data.error);
    return [];
  }
  const songs = data.songs || [];
  console.log('Anzahl Songs:', songs.length);
  songs.forEach((s, i) => console.log(`  ${i + 1}. ${s.artist} – ${s.song}`));
  console.log('');
  return songs;
}

async function spotifySearch(artist, song) {
  const res = await fetch(`${BASE}/api/spotify-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      artist,
      song,
      yearMin: 2001,
      yearMax: 2003
    })
  });
  const data = await res.json();
  if (data.error) console.log('  Spotify-Fehler:', data.error);
  else if (data.track) console.log('  Spotify-Treffer:', data.track.artistName, '–', data.track.trackName, '| Jahr:', (data.track.releaseDate || '').slice(0, 4));
  else console.log('  Spotify: kein Treffer');
  return data.track;
}

async function main() {
  try {
    const songs = await suggestSong();
    if (songs.length > 0) {
      console.log('--- Spotify-Suche für ersten Vorschlag ---\n');
      const first = songs[0];
      await spotifySearch(first.artist, first.song);
    }
  } catch (e) {
    console.error('Fehler:', e.message);
  }
}

main();
