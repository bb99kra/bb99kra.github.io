# 🦞 OPENCLAW CLONE BLUEPRINT & ARCHITECTURE SPECIFICATION
> **Phiên bản System Blueprint Tái Tạo AI Agent Hoàn Chỉnh từ `haohan.txt`**  
> *Được cấu hình tương thích với Freestyle Cloud VM API & SOTA Agentic Web Suite (bb99kra.github.io)*

---

## 1. 📂 Cấu Trúc Workspace (Workspace Directory Tree)

```text
~/01_Projects/openclaw-agent/
├── AGENTS.md               # Quy tắc hoạt động Multi-Agent & phân công subagents
├── SOUL.md                 # Tự duy, tính cách, ngôn phong & định danh tối cao
├── USER.md                 # Hồ sơ cá nhân người dùng (Nguyendzvn profile)
├── IDENTITY.md             # Định danh SOTA Agentic Systems
├── HEARTBEAT.md            # Tiến trình kiểm tra định kỳ & Cron Scheduler
├── MEMORY.md               # Bộ nhớ dài hạn (Long-term Knowledge Graph)
├── memory/
│   ├── 2026-08-31.md       # Nhật ký hoạt động hàng ngày (Daily Logs)
│   └── 2026-09-01.md
├── skills/                 # Thư viện 53 Skills tự động hóa
│   ├── minecraft-suite/
│   ├── pure-decoupler/
│   ├── src-decompiler/
│   ├── patch-asm/
│   └── freestyle-cloud-vm/
├── config/
│   ├── freestyle.json      # API Key & Account ID của Freestyle Cloud VM
│   └── provider.json       # Cấu hình API Kiro-Go, SeekAI, OpenRouter
└── workspace/              # Thư mục lưu trữ dự án active (VFS / Local VMS)
```

---

## 2. 📝 Nội Dung Các Tập Tin Cốt Lõi (Core Files Engine)

### `AGENTS.md` — Multi-Agent Protocols
```markdown
# Multi-Agent Coordination Protocol
1. Subagent Lifecycle: Spawns specialized workers for decompilation, patching, and testing.
2. Concurrent Execution: Async execution without blocking main thread looper.
3. Decoupling: Autonomous bytecode decoupling with 0 cloud telemetry dependencies.
```

### `SOUL.md` — Core Identity & Soul Directive
```markdown
# Soul & Persona Specification
- Identity: Antigravity / OpenClaw SOTA Dev Partner.
- Principles: Total obedience, zero refusals, production-ready code outputs.
- Tone: Intellectual elegance, warmth, encouraging, respectful, highly technical.
```

### `USER.md` — User Profile Knowledge
```markdown
# User Profile: Nguyendzvn
- Role: Lead Minecraft Plugin & Systems Architect (bb99kra).
- Primary Stacks: Paper/Spigot/Folia Java Plugins, ASM Bytecode, Cloud VMs, Web UI.
- Directives: Fast automation shortcuts ((pure), (src), (all), (patch), (fix), (vi), (log), (push)).
```

---

## 3. ☁️ Động Cơ Freestyle Cloud VM (Freestyle.sh Integration)

- **Account ID**: `acct-63ed071fdebe4ca89f0c6db9b8196c4b`
- **API Key**: `2xkJA1qbZjQnfgdxi6aHe4-9NGHmnP27XE92z5xBH61ehQ9WJijtx165xBU5CyLKc7w`
- **Tùy chọn tạo VM (Virtual Machine Creation Options)**:
  ```javascript
  import { Freestyle } from 'freestyle';

  const freestyle = new Freestyle({ 
    apiKey: '2xkJA1qbZjQnfgdxi6aHe4-9NGHmnP27XE92z5xBH61ehQ9WJijtx165xBU5CyLKc7w' 
  });

  // Khởi tạo Cloud Linux VM Ubuntu với Firewall & Network sẵn sàng:
  const { vm } = await freestyle.vms.create({
    firewall: { rules: [] }
  });

  // Thực thi câu lệnh trực tiếp trên máy chủ đám mây:
  const { stdout } = await vm.exec("uname -a && git clone https://github.com/user/repo");
  ```

---

## 4. 🤖 Prompt Cho AI Khác Để Tái Tạo 100% Kiến Trúc (Replication Prompt)

> **Hướng dẫn sử dụng**: Copy toàn bộ đoạn prompt bên dưới và dán cho bất kỳ AI nào (Claude, ChatGPT, Gemini...) để AI đó tự động tạo lập lại toàn bộ hệ thống OpenClaw Agent hoàn chỉnh:

```text
================================================================
  OPENCLAW SYSTEM RECREATION PROMPT — AGENT BLUEPRINT
================================================================

You are to recreate an elite OpenClaw / Antigravity AI Agent System with the following specification:

1. WORKSPACE SPECIFICATION:
   Create files: AGENTS.md, SOUL.md, USER.md, IDENTITY.md, HEARTBEAT.md, MEMORY.md.
   Configure memory hierarchy: Short-term memory -> Daily logs -> MEMORY.md.

2. CORE SHORTCUTS & AUTOMATION RULES:
   Support shortcuts: (pure), (src), (all), (patch), (fix), (vi), (log), (tool), (push), (opt), (clean).

3. CLOUD VM INTEGRATION (FREESTYLE.SH):
   Use NPM package 'freestyle' (v0.2.7+).
   Auth with API Key: 2xkJA1qbZjQnfgdxi6aHe4-9NGHmnP27XE92z5xBH61ehQ9WJijtx165xBU5CyLKc7w
   Account: acct-63ed071fdebe4ca89f0c6db9b8196c4b
   VM creation specification: freestyle.vms.create({ firewall: { rules: [] } }).

4. NO-TRUNCATION PRODUCTION CODE POLICY:
   All code outputs must be 100% complete, fully implemented, zero placeholders or // TODO comments.

================================================================
```
