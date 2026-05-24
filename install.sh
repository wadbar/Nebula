#!/usr/bin/env bash
# NEBULA OS: Extreme Installation Engine

echo "🌌 NEBULA OS: Initializing Genesis Installation Protocol..."

set -e

echo "📦 Forcing hyper-dependency resolution..."
npm install --no-audit --prefer-offline

echo "🔑 Generating environment skeleton..."
if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || touch .env
  echo "✅ Empty .env created. Please inject GEMINI_API_KEY."
fi

echo "⚙️ Compiling core components..."
npm run build

echo "🚀 NEBULA OS installed successfully. To ignite: npm run start"
