import fs from 'fs';
import path from 'path';
import os from 'os';

console.log("🕷️ Spider Map MCP - Auto Setup 🕷️\n");

const homedir = os.homedir();
const currentDir = process.cwd();
const serverPath = path.join(currentDir, 'dist', 'mcp', 'server.js').replace(/\\/g, '/');

if (!fs.existsSync(path.join(currentDir, 'dist', 'mcp', 'server.js'))) {
  console.log("⚠️ Peringatan: File build tidak ditemukan.");
  console.log("Sebaiknya jalankan 'npm run build' terlebih dahulu sebelum menggunakan setup ini.\n");
}

const configPaths = [];

// === Claude Desktop ===
if (process.platform === 'darwin') {
  configPaths.push({ 
    name: 'Claude Desktop (Mac)', 
    path: path.join(homedir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    category: '🤖 Anthropic'
  });
}
if (process.env.APPDATA) {
  configPaths.push({ 
    name: 'Claude Desktop (Windows)', 
    path: path.join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json'),
    category: '🤖 Anthropic'
  });
}

// === VSCode Extensions (All Platforms) ===
// Cline
if (process.platform === 'darwin') {
  configPaths.push({ 
    name: 'Cline (VSCode Mac)', 
    path: path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
    category: '📝 VSCode Extensions'
  });
} else if (process.env.APPDATA) {
  configPaths.push({ 
    name: 'Cline (VSCode Windows)', 
    path: path.join(process.env.APPDATA, 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
    category: '📝 VSCode Extensions'
  });
} else {
  configPaths.push({ 
    name: 'Cline (VSCode Linux)', 
    path: path.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
    category: '📝 VSCode Extensions'
  });
}

// Roo Code
if (process.platform === 'darwin') {
  configPaths.push({ 
    name: 'Roo Code (VSCode Mac)', 
    path: path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json'),
    category: '📝 VSCode Extensions'
  });
} else if (process.env.APPDATA) {
  configPaths.push({ 
    name: 'Roo Code (VSCode Windows)', 
    path: path.join(process.env.APPDATA, 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json'),
    category: '📝 VSCode Extensions'
  });
} else {
  configPaths.push({ 
    name: 'Roo Code (VSCode Linux)', 
    path: path.join(homedir, '.config', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json'),
    category: '📝 VSCode Extensions'
  });
}

// === IDE & Editors ===
configPaths.push({ 
  name: 'Cursor', 
  path: path.join(homedir, '.cursor', 'mcp.json'),
  category: '💻 Editors'
});

configPaths.push({ 
  name: 'Windsurf', 
  path: path.join(homedir, '.codeium', 'windsurf', 'mcp_config.json'),
  category: '💻 Editors'
});

configPaths.push({ 
  name: 'Continuation Dev', 
  path: path.join(homedir, '.continuation', 'mcp.json'),
  category: '💻 Editors'
});

if (process.env.APPDATA) {
  configPaths.push({ 
    name: 'Continue IDE (Windows)', 
    path: path.join(process.env.APPDATA, 'continue', 'config.json'),
    category: '💻 Editors'
  });
} else {
  configPaths.push({ 
    name: 'Continue IDE (Mac/Linux)', 
    path: path.join(homedir, '.continue', 'config.json'),
    category: '💻 Editors'
  });
}

// === Generic/Multi-Purpose ===
configPaths.push({ 
  name: 'Antigravity IDE', 
  path: path.join(homedir, '.gemini', 'config', 'mcp_config.json'),
  category: '🌐 Multi-Purpose'
});

configPaths.push({ 
  name: 'Zed Editor', 
  path: path.join(homedir, '.config', 'zed', 'mcp.json'),
  category: '🌐 Multi-Purpose'
});

// Optional: Neovim config
configPaths.push({ 
  name: 'Neovim (nvim-cmp)', 
  path: path.join(homedir, '.config', 'nvim', 'lua', 'mcp_config.lua'),
  category: '🌐 Multi-Purpose'
});

const mcpConfig = {
  command: "node",
  args: [serverPath]
};

let installedCount = 0;
const byCategory = {};

console.log("Scanning untuk AI Assistants...\n");

for (const app of configPaths) {
  if (fs.existsSync(app.path)) {
    try {
      console.log(`✅ Mendeteksi ${app.name}...`);
      const fileData = fs.readFileSync(app.path, 'utf8');
      let json = JSON.parse(fileData);
      
      if (!json.mcpServers) {
        json.mcpServers = {};
      }
      
      json.mcpServers['spider-map'] = mcpConfig;
      
      fs.writeFileSync(app.path, JSON.stringify(json, null, 2));
      console.log(`   ✅ Berhasil ditambahkan ke ${app.name}\n`);
      installedCount++;
      
      // Track by category
      if (!byCategory[app.category]) {
        byCategory[app.category] = [];
      }
      byCategory[app.category].push(app.name);
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}\n`);
    }
  }
}

if (installedCount === 0) {
  console.log("⚠️ Tidak ada file konfigurasi AI Assistant yang terdeteksi.");
  console.log("\n📝 Silakan tambahkan blok JSON ini secara manual ke file MCP Anda:\n");
  console.log(JSON.stringify({
    "mcpServers": {
      "spider-map": mcpConfig
    }
  }, null, 2));
  
  console.log("\n\n📍 Lokasi konfigurasi untuk berbagai AI Assistant:");
  console.log("\n🤖 Anthropic:");
  console.log("  - Claude Desktop (Windows): %APPDATA%\\Claude\\claude_desktop_config.json");
  console.log("  - Claude Desktop (Mac):     ~/Library/Application Support/Claude/claude_desktop_config.json");
  
  console.log("\n📝 VSCode Extensions:");
  console.log("  - Cline (Windows):          %APPDATA%\\Code\\User\\globalStorage\\saoudrizwan.claude-dev\\settings\\cline_mcp_settings.json");
  console.log("  - Cline (Mac):              ~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json");
  console.log("  - Roo Code (Windows):       %APPDATA%\\Code\\User\\globalStorage\\rooveterinaryinc.roo-cline\\settings\\cline_mcp_settings.json");
  
  console.log("\n💻 Editors:");
  console.log("  - Cursor:                   ~/.cursor/mcp.json");
  console.log("  - Windsurf:                 ~/.codeium/windsurf/mcp_config.json");
  console.log("  - Continue IDE:             ~/.continue/config.json");
  
  console.log("\n🌐 Multi-Purpose:");
  console.log("  - Antigravity IDE:          ~/.gemini/config/mcp_config.json");
  console.log("  - Zed Editor:               ~/.config/zed/mcp.json");
  console.log("  - Neovim:                   ~/.config/nvim/lua/mcp_config.lua");
} else {
  console.log("═══════════════════════════════════════");
  console.log("🎉 Setup Selesai!\n");
  console.log("Installed ke:");
  for (const [category, apps] of Object.entries(byCategory)) {
    console.log(`\n${category}:`);
    apps.forEach(app => console.log(`  ✅ ${app}`));
  }
  console.log("\n═══════════════════════════════════════");
  console.log("\n📌 Langkah berikutnya:");
  console.log("  1. Restart semua AI Assistant yang terdeteksi");
  console.log("  2. Spider Map tools akan otomatis tersedia");
  console.log("  3. Gunakan 'get_project_map' untuk mulai menganalisis codebase\n");
}

