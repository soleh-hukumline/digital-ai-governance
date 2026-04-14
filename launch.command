#!/bin/bash
# ================================================================
# Digital Governance Watch LNA — Local Launcher (macOS)
# Double-click file ini untuk menjalankan dashboard secara lokal
# ================================================================

# Ambil direktori tempat script ini berada
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=8080
URL="http://localhost:$PORT"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║    Digital Governance Watch · LNA Dashboard          ║"
echo "║    Memulai server lokal...                           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Cek apakah port sudah digunakan, jika ya pakai port lain
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    PORT=8081
    URL="http://localhost:$PORT"
    echo "⚠️  Port 8080 sudah terpakai, beralih ke port $PORT"
fi

echo "📂 Direktori : $DIR"
echo "🌐 URL        : $URL"
echo ""
echo "Tekan Ctrl+C di jendela ini untuk menghentikan server."
echo ""

# Buka browser setelah 1.5 detik
(sleep 1.5 && open "$URL") &

# Jalankan Python HTTP server
cd "$DIR"
python3 -m http.server $PORT
