#!/bin/bash

# Second Brain - macOS Build Script
# This script builds the complete macOS application

set -e

# Load nvm if available (ensures correct Node.js version)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node.js 22 if available
if command -v nvm &> /dev/null; then
    nvm use 22 2>/dev/null || echo "Note: Node.js 22 not found, using current version"
fi

echo "🧠 Building Second Brain for macOS..."
echo "📍 Using Node.js $(node --version)"
echo ""

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Step 1: Build backend
echo "📦 Step 1: Building backend..."
"$PROJECT_DIR/backend/publish-mac.sh"
echo ""

# Step 2: Build frontend
echo "📦 Step 2: Building frontend..."
cd "$PROJECT_DIR/frontend"
pnpm install
pnpm build
echo ""

# Step 3: Build Tauri app
echo "📦 Step 3: Building Tauri application..."
TARGET="${1:-}"

if [ "$TARGET" = "universal" ]; then
    echo "Building universal binary (Intel + Apple Silicon)..."
    pnpm tauri build --target universal-apple-darwin
else
    echo "Building for current architecture..."
    pnpm tauri build
fi

echo ""
echo "✅ Build complete!"
echo "📁 Output: frontend/src-tauri/target/release/bundle/"
echo ""
echo "To build a universal binary (Intel + Apple Silicon), run:"
echo "  ./build-mac.sh universal"
