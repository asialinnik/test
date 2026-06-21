# Background photos

Want the app to cycle through your own favorite photos (cycling, beaches,
night skies, mountains)? It takes two steps.

1. **Drop image files into this folder** (`public/backgrounds/`).
   Use `.jpg` or `.webp`, ideally around 1600px wide so they load fast.
   Example: `coast-skye.jpg`, `milkyway.jpg`, `bikepacking.jpg`.

2. **List the filenames in `manifest.json`** (in this same folder), like:

   ```json
   ["coast-skye.jpg", "milkyway.jpg", "bikepacking.jpg"]
   ```

The app rotates through them one per day — the same photo all day, a new one
tomorrow. Each photo is shown softly behind a hazy overlay so the numbers stay
easy to read.

If the list is empty, the app falls back to calm gradient backgrounds, so it
always looks finished.

A note on sharing: photos you add here get bundled into the app. For your own
personal use that's fine. If you ever publish the app for other people, only
include photos you have the right to redistribute (e.g. ones from free-license
libraries like Unsplash or Pexels, or your own photos).
