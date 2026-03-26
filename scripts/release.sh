#!/bin/bash

# IITM ACADEMIC ENGINE — RELEASE PACKAGER
# Version: 1.3.0
# Optimized for: macOS

echo "🚀 Packaging IITM Academic Engine v1.3.0..."

# 1. Cleanup
rm -rf dist
mkdir dist
mkdir -p dist/images

# 2. Copy Core Extension files
cp manifest.json dist/
cp *.js dist/
cp *.css dist/
cp -r images/* dist/images/

# 3. Handle Raycast Extension (Optional: symlink for dev)
# We don't zip raycast into the chrome extension, keep it separate

# 4. Zip it up
zip -r iitm_academic_engine_v1.3.0.zip dist

echo "✅ Release package created: iitm_academic_engine_v1.3.0.zip"
echo "📦 Ready for GitHub Release!"
