# Reggae backing-track styles

Three hand-authored native styles for the backing-track picker. They are generic groove patterns, not transcriptions of a recording. Mario can listen and keep the ones he likes.

Sources used while writing them:

- [One drop rhythm](https://en.wikipedia.org/wiki/One_drop_rhythm) (Wikipedia), including the Carlton Barrett description and the Jeff Strong variations quoted there.
- [Reggae](https://en.wikipedia.org/wiki/Reggae) (Wikipedia), musical characteristics: slower than ska/rocksteady, offbeat staccato guitar or piano, syncopated bass, emphasis on beat 3. The article also notes that slower tempos made the "double skank" practical.
- [Skank (guitar)](https://en.wikipedia.org/wiki/Skank_(guitar)) (Wikipedia): a short percussive chop. Counting is ambiguous on that page (some writers call the offbeats "2 and 4" in half-time). These styles put the chop on the "&" of each beat, which is the offbeat the Reggae article describes, and the count this app's beat grid uses.

Terminology conflict, and the choice made here: Strong (via the one-drop article) calls a quarter-note kick "rockers" and an eighth-note kick "steppers". The app needs three grooves that are different inside one bar, and the request treats **steppers** as the four-on-the-floor feel. So:

- `reggae_steppers` is four-on-the-floor on Main A. Main B adds eighth-note kicks, which is the denser Strong "steppers" layer.
- `reggae_rockers` is not that pattern. It is a slower syncopated kick (beat 1, the "&" of 2, and beat 3) so it does not collapse into steppers or one-drop.

All three are 4/4, `division: "BINARY"` (straight 8ths, not a shuffle). Loops are 2 bars (`Main_A` / `Main_B`, 8 beats) plus a 1-bar `Fill_In_AA`. Guitar is a muted-guitar chop (`CHORD2`). The keyboard bubble is Rhodes (`CHORD1`) because drawbar organ is not in the shipped SF3 packs. Bass notes are C-major chord tones so the existing transposer follows the chart. The humanizer preset `reggae` sits a little behind the beat without a triplet swing.

## Reggae – One Drop (`reggae_onedrop`, 80 BPM)

The classic drop. Beat 1 has no kick and no bass attack. Kick and a loud cross-stick land together on beat 3; a softer cross-stick also marks beats 2 and 4. Hi-hats are straight 8ths, quiet on the downbeats, with an open hat at the end of the phrase. Bass enters on the "&" of 1 and leaves the downbeat of 1 empty (root, fifth, and a sparse third). Guitar is a single short chop on every "&". The Rhodes bubble answers only on the "&" of 2 and the "&" of 4. Main B adds a few ghost snares and a fuller bubble.

## Reggae – Steppers (`reggae_steppers`, 96 BPM)

Driving. The kick is on every quarter note (four-on-the-floor). Snare, not just a cross-stick, is on beats 2 and 4. Hats are louder and more even, and a tambourine plays 8ths. Bass locks to the kick: root on beat 1, then fifths, octaves, and offbeat pickups, with much less space than one-drop. Guitar is a double chop (the "&" plus the following 16th). Main B keeps the four quarter-note kicks and adds kicks on the "&" of 1 and the "&" of 3. The bass sound is picked, so the attack is harder than the fingered bass on the other two.

## Reggae – Rockers (`reggae_rockers`, 74 BPM)

The slow, heavy one. Kick on beat 1, the "&" of 2, and beat 3 — there is a downbeat, unlike one-drop, and there is not a kick on every beat, unlike steppers. Cross-stick on 2 and 4. Hats only on the offbeats. Bass attacks beat 1 and then jumps to the syncopated kick instead of walking every quarter. Guitar is one chop per "&", a little longer than the one-drop chop but still a stab. The bubble sits on the "&" of 2 and the "&" of 4. Main B adds a quiet pickup kick on the "&" of 4.
