/**
 * Treffer-Auswahl für kuratierte Genres (Partyhits, Filmmusik).
 * Läuft im Browser (window.CuratedMatch) und in Node (module.exports, für test-curated-lists.js).
 *
 * Kuratierte Einträge: { artist, song, year, film?, search?, album? }
 * - year steht fest (kuratiert) – iTunes liefert nur Preview, Cover und Titel.
 * - search: optionaler Suchbegriff, falls "artist song" bei iTunes schlecht trifft.
 * - album: optionaler Hinweis; Treffer mit passendem Albumnamen werden bevorzugt.
 */
(function (root) {
    'use strict';

    /** Kleinbuchstaben, ohne Akzente/Satzzeichen, "&" → "and". "Céline" → "celine". */
    function norm(str) {
        return (str || '')
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[’'`´]/g, '')
            .replace(/[^a-z0-9äöüß]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /** Hauptinterpret muss der gewünschte sein; Zusätze wie "& London Symphony Orchestra" sind ok, Tribute/Cover nicht. */
    function artistMatches(resultArtist, wantArtist) {
        const r = norm(resultArtist);
        const w = norm(wantArtist);
        if (!w) return false;
        const variants = [w, 'the ' + w];
        if (w.startsWith('the ')) variants.push(w.slice(4));
        if (/\b(tribute|cover|covers|karaoke|salute|homage|revisited|reimagined)\b/.test(r)) return false;
        for (const v of variants) {
            if (r === v || r.startsWith(v + ' ')) return true;
        }
        // Mitgenannt: "James Newton Howard & Hans Zimmer", "Lisa Gerrard, …, Hans Zimmer"
        const names = (resultArtist || '').split(/\s*(?:,|&|\band\b|\bfeat\.?|\bwith\b)\s*/i).map(norm);
        return names.some(n => variants.includes(n));
    }

    /** Tracktitel muss den gesuchten Titel enthalten (Komponisten haben hunderte Tracks). */
    function titleMatches(trackName, wantSong) {
        const t = norm(trackName);
        const w = norm(wantSong);
        return !!w && t.includes(w);
    }

    /**
     * Cover-/Versionsfilter für kuratierte Einträge. Anders als isNoCover() in index.html:
     * - Soundtrack/Motion Picture/Compilation sind erlaubt (sonst gäbe es keine Filmmusik),
     * - "feat." ist erlaubt (Artist und Titel sind kuratiert).
     * Live, Remix, Karaoke, Tribute, Cover, Demo, Re-Record bleiben gesperrt.
     */
    function resultIsOk(s) {
        if (!s || !s.previewUrl) return false;
        if (s.kind && s.kind !== 'song') return false;
        const genre = norm(s.primaryGenreName);
        if (/karaoke|children|lullab|spoken word|audiobook|podcast|fitness|easy listening/.test(genre)) return false;
        const track = norm(s.trackName);
        const album = norm(s.collectionName);
        const artist = norm(s.artistName);
        const all = track + ' | ' + album + ' | ' + artist;
        if (/karaoke|tribute|lullab|kidz? bop|in the style of|made famous|cover version|piano version|acoustic version|reimagined|string quartet|8 bit|music box|workout/.test(all)) return false;
        // Neu eingespielte Fassungen und DJ-Mixe stecken oft nur im Albumtitel ("Kill the DJ … (Re-Recorded Versions)")
        if (/re record|mash up|non stop|megamix|nonstop/.test(album)) return false;
        if (/\blive\b|\bconcert\b|\bunplugged\b|\bat the movies\b/.test(track + ' ' + album)) return false;
        if (/\bremix\b|\bdemo\b|\bouttake\b|\binstrumental\b|re record|\bacapella\b|\bsped up\b|\bslowed\b|\bacoustic\b|\bakustik\b|\bstripped\b/.test(track)) return false;
        // "Radio Mix"/"Original Mix" sind bei Dance-Hits oft die einzige Fassung – andere Mixe nicht
        if (/\bmix\b/.test(track) && !/\b(radio|original|single|7|album) mix\b/.test(track)) return false;
        return true;
    }

    const GENERIC_TITLES = ['main title', 'main titles', 'main theme', 'end credits', 'prologue', 'opening'];

    /** Wählt aus iTunes-Ergebnissen den besten Treffer oder null. */
    function pickResult(results, entry) {
        const valid = (results || []).filter(s =>
            resultIsOk(s) &&
            artistMatches(s.artistName, entry.artist) &&
            titleMatches(s.trackName, entry.song)
        );
        const albumHint = norm(entry.album || entry.film || '');
        // Generische Titel ("Main Title") nur mit passendem Album – sonst landet man beim falschen Film
        if (albumHint && GENERIC_TITLES.includes(norm(entry.song))) {
            for (let i = valid.length - 1; i >= 0; i--) {
                if (!norm(valid[i].collectionName).includes(albumHint)) valid.splice(i, 1);
            }
        }
        if (!valid.length) return null;
        const score = (s) => {
            let p = 0;
            const album = norm(s.collectionName);
            if (albumHint && album.includes(albumHint)) p -= 10;
            // Kürzerer Titel = näher am Original ("Raiders March" vor "Washington Ending / Raiders March")
            p += norm(s.trackName).length / 100;
            return p;
        };
        valid.sort((a, b) => score(a) - score(b) || new Date(a.releaseDate) - new Date(b.releaseDate));
        return valid[0];
    }

    function searchTerm(entry) {
        return (entry.search || (entry.artist + ' ' + entry.song)).trim();
    }

    /** iTunes-Store für kuratierte Suchen: Deutsche Partyhits gibt es im US-Store oft nur live oder als Cover. */
    const COUNTRY = 'DE';

    const api = { norm, artistMatches, titleMatches, resultIsOk, pickResult, searchTerm, COUNTRY };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.CuratedMatch = api;
})(typeof window !== 'undefined' ? window : globalThis);
