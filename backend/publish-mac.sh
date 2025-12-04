#!/bin/bash

# Second Brain Backend - macOS Build Script
# This script publishes the .NET backend as self-contained executables

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_PROJECT="$PROJECT_DIR/src/SecondBrain.API"
RESOURCES_DIR="$PROJECT_DIR/../frontend/src-tauri/resources"
OUTPUT_DIR="$RESOURCES_DIR/backend"

echo "🔨 Building Second Brain API for macOS..."

# Clean previous builds
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Get current architecture
ARCH=$(uname -m)

if [ "$ARCH" = "arm64" ]; then
    echo "📦 Building for Apple Silicon (arm64)..."
    dotnet publish "$API_PROJECT" \
        -c Release \
        -r osx-arm64 \
        --self-contained true \
        -p:PublishSingleFile=false \
        -p:PublishTrimmed=false \
        -o "$OUTPUT_DIR"
    
    # Rename the executable
    mv "$OUTPUT_DIR/SecondBrain.API" "$OUTPUT_DIR/secondbrain-api"
else
    echo "📦 Building for Intel (x64)..."
    dotnet publish "$API_PROJECT" \
        -c Release \
        -r osx-x64 \
        --self-contained true \
        -p:PublishSingleFile=false \
        -p:PublishTrimmed=false \
        -o "$OUTPUT_DIR"
    
    # Rename the executable
    mv "$OUTPUT_DIR/SecondBrain.API" "$OUTPUT_DIR/secondbrain-api"
fi

# Make executable
chmod +x "$OUTPUT_DIR/secondbrain-api"

# Create a marker file with the architecture
echo "$ARCH" > "$OUTPUT_DIR/.arch"

echo "✅ Build complete!"
echo "📁 Output directory: $OUTPUT_DIR"
echo "📊 Size: $(du -sh "$OUTPUT_DIR" | cut -f1)"
ls "$OUTPUT_DIR" | head -20

