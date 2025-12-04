#!/bin/bash

# Script to generate Tauri app icons from source image
# Source: frontend/src/assets/brain-top-tab.png

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export SOURCE_IMAGE="$SCRIPT_DIR/../src/assets/brain-top-tab.png"
ICONS_DIR="$SCRIPT_DIR/icons"

cd "$SCRIPT_DIR"

echo "Generating icons from $SOURCE_IMAGE..."

# Create a temporary directory for the iconset
ICONSET_DIR="$SCRIPT_DIR/icon.iconset"
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

# Generate PNG sizes for Tauri
echo "Generating PNG icons..."

# Main icon (512x512)
sips -z 512 512 "$SOURCE_IMAGE" --out "$ICONS_DIR/icon.png" > /dev/null

# 32x32
sips -z 32 32 "$SOURCE_IMAGE" --out "$ICONS_DIR/32x32.png" > /dev/null

# 128x128
sips -z 128 128 "$SOURCE_IMAGE" --out "$ICONS_DIR/128x128.png" > /dev/null

# 128x128@2x (256x256)
sips -z 256 256 "$SOURCE_IMAGE" --out "$ICONS_DIR/128x128@2x.png" > /dev/null

# Windows Store icons
echo "Generating Windows Store icons..."
sips -z 30 30 "$SOURCE_IMAGE" --out "$ICONS_DIR/Square30x30Logo.png" > /dev/null
sips -z 44 44 "$SOURCE_IMAGE" --out "$ICONS_DIR/Square44x44Logo.png" > /dev/null
sips -z 71 71 "$SOURCE_IMAGE" --out "$ICONS_DIR/Square71x71Logo.png" > /dev/null
sips -z 89 89 "$SOURCE_IMAGE" --out "$ICONS_DIR/Square89x89Logo.png" > /dev/null
sips -z 107 107 "$SOURCE_IMAGE" --out "$ICONS_DIR/Square107x107Logo.png" > /dev/null
sips -z 142 142 "$SOURCE_IMAGE" --out "$ICONS_DIR/Square142x142Logo.png" > /dev/null
sips -z 150 150 "$SOURCE_IMAGE" --out "$ICONS_DIR/Square150x150Logo.png" > /dev/null
sips -z 284 284 "$SOURCE_IMAGE" --out "$ICONS_DIR/Square284x284Logo.png" > /dev/null
sips -z 310 310 "$SOURCE_IMAGE" --out "$ICONS_DIR/Square310x310Logo.png" > /dev/null
sips -z 50 50 "$SOURCE_IMAGE" --out "$ICONS_DIR/StoreLogo.png" > /dev/null

# Generate macOS .icns file
echo "Generating macOS .icns file..."

# Create iconset with required sizes for macOS
sips -z 16 16 "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_16x16.png" > /dev/null
sips -z 32 32 "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_16x16@2x.png" > /dev/null
sips -z 32 32 "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_32x32.png" > /dev/null
sips -z 64 64 "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_32x32@2x.png" > /dev/null
sips -z 128 128 "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_128x128.png" > /dev/null
sips -z 256 256 "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_128x128@2x.png" > /dev/null
sips -z 256 256 "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_256x256.png" > /dev/null
sips -z 512 512 "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_256x256@2x.png" > /dev/null
sips -z 512 512 "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_512x512.png" > /dev/null
sips -z 1024 1024 "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_512x512@2x.png" > /dev/null

# Convert iconset to icns
iconutil -c icns "$ICONSET_DIR" -o "$ICONS_DIR/icon.icns"

# Clean up iconset directory
rm -rf "$ICONSET_DIR"

# Generate Windows .ico file (requires multiple sizes embedded)
echo "Generating Windows .ico file..."

# Create temp directory for ico creation
ICO_TEMP="$SCRIPT_DIR/ico_temp"
rm -rf "$ICO_TEMP"
mkdir -p "$ICO_TEMP"

# Generate sizes for .ico (16, 24, 32, 48, 64, 128, 256)
sips -z 16 16 "$SOURCE_IMAGE" --out "$ICO_TEMP/16.png" > /dev/null
sips -z 24 24 "$SOURCE_IMAGE" --out "$ICO_TEMP/24.png" > /dev/null
sips -z 32 32 "$SOURCE_IMAGE" --out "$ICO_TEMP/32.png" > /dev/null
sips -z 48 48 "$SOURCE_IMAGE" --out "$ICO_TEMP/48.png" > /dev/null
sips -z 64 64 "$SOURCE_IMAGE" --out "$ICO_TEMP/64.png" > /dev/null
sips -z 128 128 "$SOURCE_IMAGE" --out "$ICO_TEMP/128.png" > /dev/null
sips -z 256 256 "$SOURCE_IMAGE" --out "$ICO_TEMP/256.png" > /dev/null

# Check if we have a tool to create .ico
if command -v magick &> /dev/null; then
    magick "$ICO_TEMP/16.png" "$ICO_TEMP/24.png" "$ICO_TEMP/32.png" "$ICO_TEMP/48.png" "$ICO_TEMP/64.png" "$ICO_TEMP/128.png" "$ICO_TEMP/256.png" "$ICONS_DIR/icon.ico"
elif command -v convert &> /dev/null; then
    convert "$ICO_TEMP/16.png" "$ICO_TEMP/24.png" "$ICO_TEMP/32.png" "$ICO_TEMP/48.png" "$ICO_TEMP/64.png" "$ICO_TEMP/128.png" "$ICO_TEMP/256.png" "$ICONS_DIR/icon.ico"
else
    echo "Warning: ImageMagick not found. Using 256x256 PNG as .ico (may not work on all Windows versions)"
    cp "$ICO_TEMP/256.png" "$ICONS_DIR/icon.ico"
fi

# Clean up
rm -rf "$ICO_TEMP"

# Generate macOS menu bar template icons using Python/PIL
echo "Generating macOS menu bar template icons..."

export TRAY_DIR="$ICONS_DIR/tray"
mkdir -p "$TRAY_DIR"

python3 << 'PYTHON_EOF'
import sys
sys.path.insert(0, '/Users/ananyateklu/Library/Python/3.13/lib/python/site-packages')
from PIL import Image
import os

source_path = os.environ.get('SOURCE_IMAGE')
output_dir = os.environ.get('TRAY_DIR')

img = Image.open(source_path).convert("RGBA")

def create_template_icon(img, size):
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    pixels = resized.load()
    template = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    template_pixels = template.load()
    
    for y in range(size):
        for x in range(size):
            r, g, b, a = pixels[x, y]
            if a > 20:
                brightness = (r + g + b) / 3
                if brightness < 200:
                    template_pixels[x, y] = (0, 0, 0, a)
    
    return template

sizes = [(16, "tray-icon-16.png"), (22, "tray-icon-22.png"), (32, "tray-icon-32.png"), 
         (44, "tray-icon-44.png"), (64, "tray-icon-64.png")]

os.makedirs(output_dir, exist_ok=True)
for size, filename in sizes:
    template = create_template_icon(img, size)
    template.save(os.path.join(output_dir, filename), "PNG")

main_template = create_template_icon(img, 22)
main_template.save(os.path.join(output_dir, "tray-icon.png"), "PNG")
print("Template icons created successfully!")
PYTHON_EOF

echo "✅ All icons generated successfully!"
echo ""
echo "Generated files in $ICONS_DIR/:"
ls -la "$ICONS_DIR/"
echo ""
echo "Generated tray template icons in $TRAY_DIR/:"
ls -la "$TRAY_DIR/"

