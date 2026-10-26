#!/usr/bin/env bash
# Runs every browser test against a running dev server (node server.js on :3000). Needs: python3, playwright, Pillow, scikit-image, numpy.
set -e; cd "$(dirname "$0")"
[ -d photos ] || python3 make_photos.py
for t in e2e_pairing e2e_camera e2e_offline e2e_share; do echo "### $t"; python3 $t.py | grep -E "PASS|FAIL|SUMMARY"; done
echo "### share API security (disk store)"; python3 share_api.py disk http://localhost:3000 | grep -E "FAIL|SUMMARY"
