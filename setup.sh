#!/bin/bash

echo "🚀 Setting up Scrum Poker with Cloudflare Workers..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install Cloudflare Workers dependencies
echo "📦 Installing Cloudflare Workers dependencies..."
cd workers
npm install
cd ..

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📦 Installing Wrangler CLI..."
    npm install -g wrangler
fi

echo "✅ Wrangler CLI installed"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Login to Cloudflare: wrangler login"
echo "2. Create D1 database: cd workers && wrangler d1 create scrum-poker-db"
echo "3. Update wrangler.toml with your database ID"
echo "4. Run migrations: cd workers && npm run db:migrate"
echo "5. Start development: npm run dev (frontend) and npm run workers:dev (backend)"
echo ""
echo "For detailed instructions, see README.md" 