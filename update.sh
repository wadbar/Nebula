#!/usr/bin/env bash
# NEBULA OS: Extreme Updater Engine
# Automatically syncs with origin, purges modules, re-installs, and rebuilds.

echo "🌌 NEBULA OS: Initializing Extreme Update Protocol..."

# Force strict error handling
set -e

# Sync
echo "📡 Pulling latest topology nodes..."
git checkout .
git pull --rebase

# Clean
echo "🧹 Purging cached local modules and lockfiles..."
rm -rf node_modules package-lock.json dist server.cjs

# Install with Extreme Resilience
echo "📦 Injecting hyper-dependencies..."
npm cache clean --force
npm install --no-audit --no-fund --prefer-offline

# Compile
echo "⚙️ Compiling into Production Bunker..."
npm run build

echo "✅ Update complete. Boot daemon with: npm run start"
