# Reggae backing-track style

One hand-authored native style, `reggae` (category `reggae`). It is a generic groove, not a transcription. The four mains are the three patterns Mario already liked, plus a busier steppers variation, so a long progression can move Main A → B → C → D without leaving reggae.

Sources used while writing the original grooves:

- [One drop rhythm](https://en.wikipedia.org/wiki/One_drop_rhythm) (Wikipedia), including the Carlton Barrett description and the Jeff Strong variations quoted there.
- [Reggae](https://en.wikipedia.org/wiki/Reggae) (Wikipedia): slower than ska/rocksteady, offbeat staccato guitar or keyboard, syncopated bass, emphasis on beat 3.
- [Skank (guitar)](https://en.wikipedia.org/wiki/Skank_(guitar)) (Wikipedia). These parts put the chop on the "&" of each beat, which is the offbeat this app's beat grid uses.

Terminology: some writers call a quarter-note kick "rockers" and an eighth-note kick "steppers". In this style the names follow the three grooves that were already in the app:

- **Main A** is one drop (no kick on beat 1; the kick is on beat 3).
- **Main B** is rockers (kick on beat 1, the "&" of 2, and beat 3).
- **Main C** and **Main D** are steppers (kick on every quarter). Main D is the fuller one.

The file is 4/4, `division: "BINARY"` (straight 8ths). Each main is 2 bars (8 beats). Fills are 1 bar (4 beats), which is what `resolveFillPart` substitutes for the last bar of a main. Guitar is a muted-guitar chop (`CHORD2`). The keyboard bubble is Rhodes (`CHORD1`) because drawbar organ is not in the shipped SF3 packs. Bass notes are C-major chord tones so the transposer follows the chart (`BASS` + `MELODY` + `ROOT_TRANSPOSITION`; drums `BYPASS`). The humanizer preset `reggae` sits a little behind the beat.

## Count-in

Play always starts on `Intro_A`. `useBackingTrackEngine` calls `setSkipIntro(false)`, and `BackingTrackEngine._resetForPlay()` picks `getIntroName('Main_A')`, which is `Intro_A`. The engine does not mute bass or chord channels during that bar, so the count-in is exactly the notes in `Intro_A`. Other shipped styles keep harmonic channels empty there and use drums (and sometimes percussion) to set the groove. Reggae follows that.

`Intro_B` and `Intro_C` are not the count-in. After `Intro_A` the engine goes to `Main_A`. Later A→B→C→D changes use fills, not intros. Those two parts stay as longer musical intros (the band coming in over several bars). Nothing in playback starts on them.

## Tempo: 84 BPM

A style file has one tempo, and `GENRE_CATALOG` has one bpm. The player uses the catalog bpm; the user can still move the tempo control.

84 is a middle reggae tempo. One drop was written at 80, so 84 keeps that space. Rockers was written at 74; the identity is the syncopated kick, and 84 is still a heavy lope rather than a ska tempo. Steppers was written at 96; four-on-the-floor still drives at 84, and it does not rush the one-drop and rockers mains that share the file. Splitting into a slow style and a fast style would throw away the A→B→C→D variation the engine already runs on one style.

## Part map

| Part | Length | What it is |
|---|---|---|
| Main_A | 8 | One drop. Beat 1 has no kick and no bass attack. Kick and a loud cross-stick land on beat 3; a softer cross-stick marks beats 2 and 4. Hi-hats are straight 8ths, quiet on the downbeats, with an open hat at the end of the phrase. Bass enters on the "&" of 1 (root, fifth, sparse third). Guitar is one short chop on every "&". Rhodes answers on the "&" of 2 and the "&" of 4. Cabasa on the offbeats. |
| Main_B | 8 | Rockers. Kick on beat 1, the "&" of 2, and beat 3. Cross-stick on 2 and 4. Hats only on the offbeats. Bass attacks beat 1, then jumps to the syncopated kick instead of walking beat 2. Guitar is one chop per "&", a little longer than the one-drop chop. Bubble on the "&" of 2 and the "&" of 4. |
| Main_C | 8 | Steppers. Kick on every quarter. Snare on beats 2 and 4. Hats louder and more even. Tambourine on 8ths. Bass locks to the kick: root on beat 1, then fifths, octaves, and offbeat pickups. Guitar is a double chop (the "&" plus the following 16th). Rhodes bubbles on every "&". |
| Main_D | 8 | Fuller steppers. Same four-on-the-floor kicks, plus kicks on the "&" of 1 and the "&" of 3, ghost snares, and 16th hats and tambourine accented on the "&" so the extra notes stay offbeat rather than becoming a straight pop pattern. Bass moves on more subdivisions, still only C-major chord tones. Guitar keeps the double chop, adds a quiet chop on the "e", and the "&" chop is slightly longer. |
| Fill_In_AA | 4 | One-drop bar, then a snare fill on beat 4 and a bass octave pickup. The skank stops before the fill. |
| Fill_In_BB | 4 | Rockers bar (kick on 1, the "&" of 2, and 3), then the same kind of snare fill. |
| Fill_In_CC | 4 | Steppers quarters, then extra snare hits from the "&" of 3 through the last 16th. Bass walks the bar in quarters instead of the main's syncopation. |
| Fill_In_DD | 4 | Fuller steppers for two beats (quarters, the "&" of 1, 16th hats and tambourine, the longer chop), then a rising snare roll. Hats drop out under the roll. Bass climbs the chord tones instead of looping the main. |
| Fill_In_BA | 4 | Rockers → one drop. Beat 1 and the "&" of 2 are the rockers kicks and the longer chop. Beat 3 is the one-drop kick and loud cross-stick, and the chop shortens. A snare pickup on the "&" of 4 leads into the empty one-drop downbeat. There is no Intro_D or Ending_D; `getIntroName('Main_D')` stays null, as it does for the other shipped styles. |
| Intro_A | 4 | Count-in. One-drop drums and cabasa only, one bar. Closed hats on straight 8ths (quiet on the downbeat, louder on the "&"), cross-stick on beats 2 and 4, kick plus a loud cross-stick on beat 3, cabasa on every "&", open hat on the last "&" into Main A. Bass, guitar chop, and Rhodes have empty `notes`. |
| Intro_B | 8 | Musical intro, not the count-in. Rockers. Bar 1 is drums and cabasa only. Bar 2 brings in bass, the longer chop, and the bubble. |
| Intro_C | 16 | Musical intro, not the count-in. Steppers build. Bar 1 is kick and hat. Bar 2 adds snare and tambourine. Bar 3 adds bass. Bar 4 is the full double-chop groove. |
| Ending_A | 4 | One-drop button. The band hits the beat-3 drop and holds the chord and bass root. A soft cross-stick on beat 4 closes it. |
| Ending_B | 8 | One bar of rockers, then a second bar that keeps the kick on 1 and the "&" of 2 and lands the chord on beat 3. |
| Ending_C | 12 | Two bars of steppers, then a last bar that drives for two beats, a short snare pickup, and a final kick, snare, and chord on beat 3. |

Old ids `reggae_onedrop`, `reggae_steppers`, and `reggae_rockers` are removed. Nothing in the repo (presets, lessons, or saved-state docs) referenced them except the catalog, tests, and this file.
