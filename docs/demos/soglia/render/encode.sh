#!/bin/bash
# Encode the seven segments of the flight. Seam frames ship in BOTH neighbours:
# clip c0 spans frames 168..252 and clip s1 spans 252..420, so the connector's
# last frame and the scene's first frame are the same PNG. That is the frame-lock.
set -e
cd "$(dirname "$0")"
MEDIA=../media
mkdir -p "$MEDIA/m"

# name start end
SEGS=(
  "s0-porta 0 168"
  "c0-arco 168 252"
  "s1-strada 252 420"
  "c1-vicolo 420 504"
  "s2-piazza 504 684"
  "c2-varco 684 768"
  "s3-bottega 768 935"
)

for row in "${SEGS[@]}"; do
  read -r name a b <<<"$row"
  n=$((b - a + 1))
  echo "== $name  frames $a..$b ($n)"

  # desktop AV1, tight GOP for scrubbing
  ffmpeg -y -loglevel error -framerate 24 -start_number "$a" -i frames/%05d.png \
    -frames:v "$n" -c:v libsvtav1 -crf 30 -preset 6 -g 8 -pix_fmt yuv420p \
    -movflags +faststart -an "$MEDIA/$name.av1.mp4"

  # desktop H.264 fallback
  ffmpeg -y -loglevel error -framerate 24 -start_number "$a" -i frames/%05d.png \
    -frames:v "$n" -c:v libx264 -crf 23 -preset slow -g 8 -pix_fmt yuv420p \
    -movflags +faststart -an "$MEDIA/$name.h264.mp4"

  # mobile 720x1280, even tighter GOP — phone decoders pay per frame-from-keyframe
  ffmpeg -y -loglevel error -framerate 24 -start_number "$a" -i frames-m/%05d.png \
    -frames:v "$n" -c:v libx264 -crf 24 -preset slow -g 4 -pix_fmt yuv420p \
    -movflags +faststart -an "$MEDIA/m/$name.h264.mp4"
done

# posters: first frame of each scene (the connector reuses the NEXT scene's still)
for row in "s0-porta 0" "s1-strada 252" "s2-piazza 504" "s3-bottega 768"; do
  read -r name f <<<"$row"
  png=$(printf "frames/%05d.png" "$f")
  ffmpeg -y -loglevel error -i "$png" -c:v libaom-av1 -still-picture 1 -crf 32 \
    -pix_fmt yuv420p "$MEDIA/$name.poster.avif"
  pngm=$(printf "frames-m/%05d.png" "$f")
  ffmpeg -y -loglevel error -i "$pngm" -c:v libaom-av1 -still-picture 1 -crf 34 \
    -pix_fmt yuv420p "$MEDIA/m/$name.poster.avif"
done

echo "== done"; du -sh "$MEDIA"
