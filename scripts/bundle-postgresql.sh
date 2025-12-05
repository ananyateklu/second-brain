#!/bin/bash

# Second Brain - Bundle PostgreSQL for macOS
# This script copies PostgreSQL binaries to the Tauri resources directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RESOURCE_DIR="$PROJECT_DIR/frontend/src-tauri/resources/postgresql"

echo "🐘 Bundling PostgreSQL for Second Brain..."
echo ""

# Detect PostgreSQL installation
POSTGRES_BIN=""
POSTGRES_LIB=""
POSTGRES_SHARE=""

# Check PostgreSQL 18 installation paths (no fallback to older versions)
if [ -d "/opt/homebrew/opt/postgresql@18" ]; then
    # Apple Silicon Homebrew
    POSTGRES_HOME="/opt/homebrew/opt/postgresql@18"
    POSTGRES_BIN="$POSTGRES_HOME/bin"
    POSTGRES_LIB="$POSTGRES_HOME/lib"
    POSTGRES_SHARE="$POSTGRES_HOME/share"
elif [ -d "/usr/local/opt/postgresql@18" ]; then
    # Intel Homebrew
    POSTGRES_HOME="/usr/local/opt/postgresql@18"
    POSTGRES_BIN="$POSTGRES_HOME/bin"
    POSTGRES_LIB="$POSTGRES_HOME/lib"
    POSTGRES_SHARE="$POSTGRES_HOME/share"
else
    echo "❌ PostgreSQL 18 not found!"
    echo ""
    echo "Please install PostgreSQL 18:"
    echo "  brew install postgresql@18 pgvector"
    echo ""
    exit 1
fi

echo "Found PostgreSQL at: $POSTGRES_HOME"
echo "  Binaries: $POSTGRES_BIN"
echo "  Libraries: $POSTGRES_LIB"
echo "  Share: $POSTGRES_SHARE"
echo ""

# Clean and create resource directory
rm -rf "$RESOURCE_DIR"
mkdir -p "$RESOURCE_DIR/bin"
mkdir -p "$RESOURCE_DIR/lib"
mkdir -p "$RESOURCE_DIR/share"

# Copy essential binaries
echo "📦 Copying PostgreSQL binaries..."
BINARIES=(
    "postgres"
    "initdb"
    "pg_ctl"
    "pg_isready"
    "psql"
    "createdb"
    "dropdb"
)

for bin in "${BINARIES[@]}"; do
    if [ -f "$POSTGRES_BIN/$bin" ]; then
        cp "$POSTGRES_BIN/$bin" "$RESOURCE_DIR/bin/"
        echo "  ✓ $bin"
    else
        echo "  ⚠ $bin not found (optional)"
    fi
done

# Copy essential libraries
echo ""
echo "📦 Copying PostgreSQL libraries..."
cp -R "$POSTGRES_LIB/"*.dylib "$RESOURCE_DIR/lib/" 2>/dev/null || true
cp -R "$POSTGRES_LIB/"*.a "$RESOURCE_DIR/lib/" 2>/dev/null || true

# Copy PostgreSQL internal libraries
if [ -d "$POSTGRES_LIB/postgresql" ]; then
    cp -R "$POSTGRES_LIB/postgresql" "$RESOURCE_DIR/lib/"
    echo "  ✓ postgresql extensions"
fi

# Copy share files (timezone data, encoding, etc.)
echo ""
echo "📦 Copying PostgreSQL share files..."

# Check for versioned share directory (e.g., postgresql@18)
if [ -d "$POSTGRES_SHARE/postgresql@18" ]; then
    cp -R "$POSTGRES_SHARE/postgresql@18" "$RESOURCE_DIR/share/postgresql"
    echo "  ✓ postgresql@18 data"
elif [ -d "$POSTGRES_SHARE/postgresql" ]; then
    cp -R "$POSTGRES_SHARE/postgresql" "$RESOURCE_DIR/share/"
    echo "  ✓ postgresql data"
else
    echo "  ⚠ No share directory found"
fi

# Also copy timezone data if available
if [ -d "$POSTGRES_SHARE/postgresql@18/timezone" ]; then
    echo "  ✓ timezone data included"
fi

# Copy pgvector extension if available
PGVECTOR_LIB=""
if [ -f "$POSTGRES_LIB/postgresql/vector.so" ]; then
    PGVECTOR_LIB="$POSTGRES_LIB/postgresql/vector.so"
elif [ -f "/opt/homebrew/lib/postgresql@18/vector.so" ]; then
    PGVECTOR_LIB="/opt/homebrew/lib/postgresql@18/vector.so"
elif [ -f "/usr/local/lib/postgresql@18/vector.so" ]; then
    PGVECTOR_LIB="/usr/local/lib/postgresql@18/vector.so"
fi

if [ -n "$PGVECTOR_LIB" ] && [ -f "$PGVECTOR_LIB" ]; then
    mkdir -p "$RESOURCE_DIR/lib/postgresql"
    cp "$PGVECTOR_LIB" "$RESOURCE_DIR/lib/postgresql/"
    echo ""
    echo "  ✓ pgvector extension"
fi

# Fix library paths using install_name_tool
echo ""
echo "🔧 Fixing library paths..."
cd "$RESOURCE_DIR/bin"

for bin in *; do
    if [ -f "$bin" ]; then
        # Get list of dylib dependencies
        otool -L "$bin" 2>/dev/null | grep -v "^$bin" | grep -v "/usr/lib" | grep -v "/System" | while read -r line; do
            lib_path=$(echo "$line" | awk '{print $1}')
            lib_name=$(basename "$lib_path")
            
            # Update the library path to be relative
            if [ -f "../lib/$lib_name" ]; then
                install_name_tool -change "$lib_path" "@executable_path/../lib/$lib_name" "$bin" 2>/dev/null || true
            fi
        done
    fi
done

# Make all binaries executable
chmod +x "$RESOURCE_DIR/bin/"*

# Calculate sizes
BIN_SIZE=$(du -sh "$RESOURCE_DIR/bin" | cut -f1)
LIB_SIZE=$(du -sh "$RESOURCE_DIR/lib" | cut -f1)
SHARE_SIZE=$(du -sh "$RESOURCE_DIR/share" 2>/dev/null | cut -f1 || echo "0")
TOTAL_SIZE=$(du -sh "$RESOURCE_DIR" | cut -f1)

echo ""
echo "✅ PostgreSQL bundled successfully!"
echo ""
echo "📊 Bundle sizes:"
echo "  Binaries: $BIN_SIZE"
echo "  Libraries: $LIB_SIZE"
echo "  Share: $SHARE_SIZE"
echo "  Total: $TOTAL_SIZE"
echo ""
echo "📁 Output: $RESOURCE_DIR"
echo ""
echo "Next steps:"
echo "  1. Build the backend: ./backend/publish-mac.sh"
echo "  2. Build the app: cd frontend && pnpm tauri build"

