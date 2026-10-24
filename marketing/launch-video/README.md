# Spill launch video (30 s, 1080×1920)

`launch.html` is the whole video as a frame-accurate CSS animation; `render.js` seeks it frame by frame and saves JPEGs.

To re-render: copy `public/qr.svg` and the Reddit Sans woff2 files (`npm i @fontsource/reddit-sans@5`) next to `launch.html`, serve the folder on :8790, run `node render.js`, then:

    ffmpeg -framerate 30 -i frames/f%04d.jpg -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart spill-launch.mp4

## Audio
- `vo.py` — voice-over with the open-source Kokoro TTS (`pip install kokoro-onnx soundfile`; model files from the kokoro-onnx GitHub release `model-files-v1.0`), each line placed on its scene.
- `music.py` — original acoustic folk-pop bed (G–D–Em–C, 120 BPM), synthesized from scratch (Karplus-Strong guitar, stomp/clap/shaker): royalty-free.
- `mix.py` — ducks the music under the voice and writes `mix.wav`.
- Mux: `ffmpeg -i spill-launch.mp4 -i mix.wav -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=0.8[v]" -map "[v]" -map 1:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart spill-launch-music-vo.mp4`
