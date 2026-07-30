#!/bin/bash
# Encode the nine shots. One shot in, one clip out — there is no frame arithmetic
# here at all, because in a cut film the file boundary IS the artistic boundary.
# (Compare soglia's encode.sh, which has to ship the seam frame in both
# neighbours to hide its cuts. This one has nothing to hide.)
set -e
cd "$(dirname "$0")"
MEDIA=../media
mkdir -p "$MEDIA/m"

SHOTS=(01-partenza 02-margine 03-sentiero 04-dall-alto 05-occhi 06-incontro 07-scorciatoia 08-radura 09-che-occhi)
# one shot may be re-cut on its own — which is the point of one clip per shot
if [ -n "$1" ]; then SHOTS=($(printf '%s
' "${SHOTS[@]}" | grep "^$1")); fi

for name in "${SHOTS[@]}"; do
  n=$(ls "frames/$name" | wc -l)
  echo "== $name ($n frames)"

  # desktop AV1, tight GOP so a scrub seek never walks far from a keyframe
  ffmpeg -y -loglevel error -framerate 24 -i "frames/$name/%05d.png" \
    -c:v libsvtav1 -crf 30 -preset 6 -g 8 -pix_fmt yuv420p \
    -movflags +faststart -an "$MEDIA/$name.av1.mp4"

  # desktop H.264 fallback
  ffmpeg -y -loglevel error -framerate 24 -i "frames/$name/%05d.png" \
    -c:v libx264 -crf 23 -preset slow -g 8 -pix_fmt yuv420p \
    -movflags +faststart -an "$MEDIA/$name.h264.mp4"

  # mobile 720x900 — a re-framed 4:5 pass, not a crop. Tighter GOP again:
  # phone decoders pay per frame-from-keyframe.
  ffmpeg -y -loglevel error -framerate 24 -i "frames-m/$name/%05d.png" \
    -c:v libx264 -crf 24 -preset slow -g 4 -pix_fmt yuv420p \
    -movflags +faststart -an "$MEDIA/m/$name.h264.mp4"

  # the poster is this shot's own first frame: nine stills that are a shot list
  ffmpeg -y -loglevel error -i "frames/$name/00000.png" \
    -c:v libaom-av1 -still-picture 1 -crf 32 -pix_fmt yuv420p "$MEDIA/$name.poster.avif"
  ffmpeg -y -loglevel error -i "frames-m/$name/00000.png" \
    -c:v libaom-av1 -still-picture 1 -crf 34 -pix_fmt yuv420p "$MEDIA/m/$name.poster.avif"
done

echo "== done"; du -sh "$MEDIA"
