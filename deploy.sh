#!/bin/bash

# Exit on any error
set -e

echo "🔧 Building frontend assets..."
pnpm run build

echo "📦 Installing worker dependencies..."
cd workers
pnpm install

echo "🚀 Deploying to Cloudflare Workers..."
pnpm run deploy:production

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: https://scrum-poker.hyrivera.com" 