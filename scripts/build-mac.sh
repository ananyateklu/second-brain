#!/bin/bash

# Second Brain - macOS Build Script
# This script builds the complete macOS application

set -e

echo "🧠 Building Second Brain for macOS..."

# Check for Bun installation
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Install it with: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "📍 Using Bun $(bun --version)"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Step 1: Build backend
echo "📦 Step 1: Building backend..."
"$PROJECT_DIR/backend/publish-mac.sh"
echo ""

# Step 2: Build frontend
echo "📦 Step 2: Building frontend..."
cd "$PROJECT_DIR/frontend"
bun install
bun run build
echo ""

# Step 3: Build Tauri app
echo "📦 Step 3: Building Tauri application..."
TARGET="${1:-}"

if [ "$TARGET" = "universal" ]; then
    echo "Building universal binary (Intel + Apple Silicon)..."
    bun run tauri build --target universal-apple-darwin
else
    echo "Building for current architecture..."
    bun run tauri build
fi

echo ""
echo "✅ Build complete!"
echo "📁 Output: frontend/src-tauri/target/release/bundle/"
echo ""
echo "To build a universal binary (Intel + Apple Silicon), run:"
echo "  ./scripts/build-mac.sh universal"
