#!/bin/bash
# ============================================================
# deploy.sh — Run this on your GCP VM via SSH
# ============================================================

set -e

echo "📦 Installing Node.js (if not installed)..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  echo "✅ Node.js installed: $(node -v)"
else
  echo "✅ Node.js already installed: $(node -v)"
fi

echo ""
echo "📁 Setting up project..."
cd ~/translator-express

echo ""
echo "📥 Installing dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "============================================================"
echo "⚙️  BEFORE RUNNING — copy .env.example and fill it in:"
echo ""
echo "  cp .env.example .env"
echo "  nano .env"
echo ""
echo "  Set: GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_PROJECT"
echo "       JWT_SECRET, TRANSLATOR_API_KEY, PORT"
echo ""
echo "🚀 Then run:"
echo "  npm start"
echo ""
echo "Or as a background process:"
echo "  nohup npm start > translator.log 2>&1 &"
echo ""
echo "Or install pm2 for production:"
echo "  npm install -g pm2"
echo "  pm2 start src/server.js --name translator-api"
echo "  pm2 save && pm2 startup"
echo "============================================================"
