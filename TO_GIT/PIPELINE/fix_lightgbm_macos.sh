#!/bin/sh
# macOS without Homebrew: LightGBM wheels look for libomp.dylib in /opt/homebrew. PyTorch ships its own
# libomp, so point LightGBM at it (a symlink keeps a single OpenMP runtime in the process) and re-sign.
# With Homebrew, `brew install libomp` does the same job. Not needed on Linux.
set -eu
SITE="$(cd "$(dirname "$0")" && pwd)/venv/lib/python3.12/site-packages"
LIB="$SITE/lightgbm/lib/lib_lightgbm.dylib"

if otool -L "$LIB" | grep -q "@loader_path/libomp.dylib"; then
    echo "lightgbm already patched"
    exit 0
fi
ln -sf ../../torch/lib/libomp.dylib "$SITE/lightgbm/lib/libomp.dylib"
install_name_tool -change @rpath/libomp.dylib @loader_path/libomp.dylib "$LIB"
codesign --force --sign - "$LIB"
echo "lightgbm now uses $(readlink "$SITE/lightgbm/lib/libomp.dylib")"
