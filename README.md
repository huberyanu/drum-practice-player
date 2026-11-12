# POCKET LAB // Drum Practice Player

Ein maßgeschneiderter **Drum-Practice-Player** mit kuratierter Song-Bibliothek, optimiert für Schlagzeuger am Set (große Touch-Flächen für Tablet/Laptop, Fußpedal- & Tastatur-Shortcuts, A–B-Loop mit Pre-Roll, Pitch-neutrales Tempo & Speed-Trainer).

---

## Features

1. **Kuratierte Song-Bibliothek & Filter-Tags**
   - Schnellfilter nach *Rock*, *Funk*, *Drumless*, *Schnell (>130 BPM)*, *In Arbeit*, *Gelernt ★*.
   - Kompakte Song-Karten mit BPM, Taktart (`4/4`, `6/8`, etc.) und 1–5 Sterne Fortschritt ("Sitzt").
   - **Eigene Tracks direkt im Browser hinzufügen (`+ Track laden`)**: Unterstützt MP3/WAV/OGG (auch mit separater Drum-Spur) und speichert sie dauerhaft offline in der Browser-Datenbank (`IndexedDB`).

2. **Interaktive 2-Farben-Wellenform & Song-Marker**
   - Zeigt Backing-Band (Cyan) und Drum-Transienten (Amber) inklusive Takt-Raster.
   - Klickbare Abschnitts-Marker (*Intro*, *Verse*, *Chorus*, *Fill/Solo*) zum direkten Anspringen.
   - **Doppelklick auf einen Marker** isoliert diesen Song-Abschnitt sofort als A–B-Loop.

3. **A–B Loop-Isolator mit Pre-Roll**
   - Große Buttons `[ LOOP START A ]` und `[ LOOP ENDE B ]` sowie ziehbare Loop-Griffe in der Wellenform.
   - **1 Takt Pre-Roll (Vorlauf):** Startet bei jedem Durchgang 1 Takt vor Punkt A, um den Einstieg im Groove-Fluss zu üben.

4. **Pitch-neutraler Tempo-Regler (50% – 120%) & Speed-Trainer**
   - Stufenloses Time-Stretching ohne Tonhöhenänderung (`preservesPitch = true`).
   - Schnellwahl-Buttons: `60%`, `75%`, `85%`, `90%`, `100%`, `110%`.
   - **Speed-Trainer-Modus:** Erhöht das Tempo automatisch alle $N$ Loop-Durchgänge um z. B. `+2%` bis zum Zieltempo.

5. **Spuren-Mixer (Stems & Metronom)**
   - Separate Lautstärke-Fader & Mute-Buttons für **Original-Drums** (Drumless-Modus), **Restliche Band** und **Click / Metronom** (inkl. optischem Beat-Monitor).

6. **Tastatur- & Fußpedal-Steuerung**
   - `Leertaste` / `PageDown`: Play / Pause (mit optionalem 4-Klick-Vorzähler)
   - `←` / `PageUp`: Sofort zurück zu Loop-Punkt A
   - `A` / `B`: Loop-Start / Loop-Ende setzen
   - `L`: Loop an/aus · `C`: Vorzähler an/aus · `D`: Drums Mute · `M`: Metronom Mute

---

## Eigene Songs fest in `songs.json` hinterlegen

Lege deine MP3- oder WAV-Dateien in einen Ordner (z. B. `audio/`) und trage sie in `songs.json` ein:

```json
{
  "id": "mein-song",
  "title": "Mein Übungs-Track",
  "subtitle": "Groove & Fill",
  "bpm": 120,
  "timeSignature": "4/4",
  "beatsPerBar": 4,
  "duration": 180,
  "tags": ["Rock", "In Arbeit"],
  "rating": 3,
  "audio": {
    "band": "audio/mein-song-band.mp3",
    "drums": "audio/mein-song-drums.mp3"
  },
  "markers": [
    { "label": "Intro", "time": 0.0, "color": "#38bdf8" },
    { "label": "Chorus", "time": 32.0, "color": "#f59e0b" }
  ],
  "defaultLoop": { "a": 32.0, "b": 48.0 },
  "notes": "Nach 2. Refrain Crash auf 1-und!"
}
```
