# Spill launch video (30 s, 1080×1920)

`launch.html` is the whole video as a frame-accurate CSS animation; `render.js` seeks it frame by frame and saves JPEGs.

To re-render: copy `public/qr.svg` and the Reddit Sans woff2 files (`npm i @fontsource/reddit-sans@5`) next to `launch.html`, serve the folder on :8790, run `node render.js`, then:

    ffmpeg -framerate 30 -i frames/f%04d.jpg -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart spill-launch.mp4
