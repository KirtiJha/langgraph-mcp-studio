#!/bin/bash

# Generate Electron app icons from favicon.png
# Requires ImageMagick (install with: brew install imagemagick)

echo "🎨 Generating Electron app icons from favicon.png..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Please install it with: brew install imagemagick"
    exit 1
fi

# Create assets directory if it doesn't exist
mkdir -p assets

# Source image
SOURCE="public/favicon.png"

if [ ! -f "$SOURCE" ]; then
    echo "❌ Source file $SOURCE not found!"
    exit 1
fi

echo "📱 Generating macOS icon (ICNS)..."
# Create temporary directory for iconset
mkdir -p assets/icon.iconset

# Generate different sizes for macOS iconset
convert "$SOURCE" -resize 16x16 assets/icon.iconset/icon_16x16.png
convert "$SOURCE" -resize 32x32 assets/icon.iconset/icon_16x16@2x.png
convert "$SOURCE" -resize 32x32 assets/icon.iconset/icon_32x32.png
convert "$SOURCE" -resize 64x64 assets/icon.iconset/icon_32x32@2x.png
convert "$SOURCE" -resize 128x128 assets/icon.iconset/icon_128x128.png
convert "$SOURCE" -resize 256x256 assets/icon.iconset/icon_128x128@2x.png
convert "$SOURCE" -resize 256x256 assets/icon.iconset/icon_256x256.png
convert "$SOURCE" -resize 512x512 assets/icon.iconset/icon_256x256@2x.png
convert "$SOURCE" -resize 512x512 assets/icon.iconset/icon_512x512.png
convert "$SOURCE" -resize 1024x1024 assets/icon.iconset/icon_512x512@2x.png

# Convert iconset to icns
iconutil -c icns assets/icon.iconset -o assets/icon.icns

# Clean up iconset directory
rm -rf assets/icon.iconset

echo "🪟 Generating Windows icon (ICO)..."
# Create ICO file for Windows (256x256 should be sufficient)
convert "$SOURCE" -resize 256x256 assets/icon.ico

echo "🐧 Generating Linux icon (PNG)..."
# Copy PNG for Linux
cp "$SOURCE" assets/icon.png

echo "✅ Icons generated successfully!"
echo "📁 Created files:"
echo "   - assets/icon.icns (macOS)"
echo "   - assets/icon.ico (Windows)"
echo "   - assets/icon.png (Linux)"
echo ""
echo "🔄 Don't forget to rebuild your app: npm run build && npm run dist"
