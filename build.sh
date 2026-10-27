#!/bin/sh
# Bundle src/*.js into one self-contained index.html
cd "$(dirname "$0")"
{
  cat src/head.html
  for f in core levels art audio main; do echo "<script>"; cat "src/$f.js"; echo "</script>"; done
  echo "</body></html>"
} > index.html
echo "built index.html ($(wc -c < index.html) bytes)"
