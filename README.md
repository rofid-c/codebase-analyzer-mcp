<div align="center">
  <h1>🕷️ Spider Map (Codebase Memory)</h1>
  <p><b>Ubah AI Assistant Anda menjadi ahli arsitektur proyek.</b></p>
  
  [![Multi-Language](https://img.shields.io/badge/languages-15%2B-blue)](https://github.com/rofid-c/codebase-analyzer-mcp)
  [![MCP](https://img.shields.io/badge/MCP-1.0-green)](https://modelcontextprotocol.io/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
</div>

---

<p align="center">
  <img src="docs/assets/preview1.png" width="48%" alt="Spider Map 3D View 1" />
  <img src="docs/assets/preview2.png" width="48%" alt="Spider Map 3D View 2" />
</p>
<p align="center">
  <img src="docs/assets/preview3.png" width="48%" alt="Spider Map 3D View 3" />
  <img src="docs/assets/preview4.png" width="48%" alt="Spider Map 3D View 4" />
</p>

## 💡 Apa itu Spider Map?

**Spider Map** adalah alat *Codebase Memory* (Ingatan Basis Kode) berbasis **MCP Server**. 

Biasanya, AI (seperti Claude, Cursor, dll) sering kebingungan atau merusak kode lain ketika mengedit proyek besar karena mereka tidak bisa "melihat" struktur seluruh proyek secara utuh. 

Spider Map memecahkan masalah ini dengan cara membaca ribuan file kode Anda, melacak siapa bergantung pada siapa (dependensi), lalu menyajikannya ke AI dalam format yang sangat hemat token. Hasilnya? AI Anda sekarang memiliki **ingatan fotografis** terhadap seluruh arsitektur proyek Anda!

---

## ✨ Fitur Unggulan

- 🧠 **Codebase Memory untuk AI:** AI dapat memetakan ribuan file secara instan.
- 🗜️ **Token Compression Algorithm:** Mampu memampatkan data hingga **80% lebih kecil** (menggunakan *Symbol Tables* & *Bit Packing*). AI bisa membaca proyek raksasa tanpa kehabisan limit token!
- ⚡ **Hybrid Auto-Indexing:** Proyek selalu *up-to-date* secara *real-time* berkat sistem *watcher* cerdas.
- ⏳ **Analisis Temporal (4D):** AI dapat mendeteksi pola bug, melihat evolusi kode dari waktu ke waktu, dan memprediksi titik rawan (*hotspots*).
- 💥 **Simulasi Dampak (Blast Radius):** Sebelum AI mengubah file, ia akan mensimulasikan file mana saja yang mungkin akan ikut *error*.
- 🎨 **Visualisasi 3D WebGL:** Terdapat halaman dasbor Web UI untuk melihat proyek Anda secara 3D interaktif.

---

## 🚀 Integrasi ke AI (Sangat Mudah!)

Agar AI Anda (Claude Desktop, Cursor, Cline, Windsurf, dll) bisa menggunakan Spider Map, cukup jalankan satu perintah:

```bash
# 1. Clone repositori ini
git clone https://github.com/rofid-c/codebase-analyzer-mcp.git
cd codebase-analyzer-mcp

# 2. Install & Build
npm install
npm run build

# 3. Jalankan Auto-Setup (Otomatis mendeteksi AI Anda)
npm run setup
```

*Jika Anda ingin memasangnya secara manual, tambahkan blok JSON ini ke file pengaturan MCP AI Anda:*
```json
"mcpServers": {
  "spider-map": {
    "command": "node",
    "args": ["/path/lengkap/ke/codebase-analyzer-mcp/dist/mcp/server.js"]
  }
}
```

---

## 🤖 Cara Memerintah AI

Setelah terhubung, *restart* aplikasi AI Anda. Kini Anda bisa berbicara seperti ini ke AI:

> *"Tolong petakan proyek saya, file mana yang paling kompleks dan butuh di-refactor?"*

> *"Saya ingin mengubah `UserController.php`. Tolong simulasikan dampaknya (blast radius), file apa saja yang akan ikut terpengaruh?"*

> *"Cek sejarah evolusi proyek ini, apakah ada file rawan (hotspot) yang sering berubah tapi minim dokumentasi?"*

---

## 🌐 Membuka Visualisasi Web 3D

Selain untuk AI, Anda juga bisa melihat proyek Anda sendiri secara 3D dengan warna-warna memukau (seperti foto di atas).

```bash
# Buka dasbor UI
npm run crawl -- --path "C:\path\ke\proyek\anda" --watch
```
Lalu buka file `src/ui/index.html` di browser Anda!

---

## 📚 Dokumentasi Teknis Lanjutan
Bagi yang ingin mendalami cara kerja Spider Map, silakan baca:
- 🧮 [Algoritma Kompresi Token (80% Savings)](./ALGORITHM_EXPLAINED.md)
- 🔄 [Sistem Auto-Indexing](./AUTO_INDEXING.md)
- 🌍 [Daftar 15+ Bahasa Pemrograman yang Didukung](./MULTI_LANGUAGE_SUPPORT.md)

---

## 📞 Support & Kontribusi
Jika alat ini membantu produktivitas ngoding Anda, jangan lupa kasih ⭐ di GitHub!

- 🐛 [Laporkan Bug](https://github.com/rofid-c/codebase-analyzer-mcp/issues)
- 💡 [Request Fitur](https://github.com/rofid-c/codebase-analyzer-mcp/issues)
- 📧 Email: rfd23052005@gmail.com
