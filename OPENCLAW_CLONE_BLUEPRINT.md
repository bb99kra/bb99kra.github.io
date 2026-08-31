# 🦞 OPENCLAW CLONE BLUEPRINT — FULL ARCHITECTURE SPECIFICATION
> **Prompt & Blueprint Chuẩn Tái Tạo 100% Hệ Thống AI Agent OpenClaw**  
> *Dựa trên bản gốc `/sdcard/Download/OPENCLAW_CLONE_BLUEPRINT.md` (507 dòng)*  
> *Được tích hợp sẵn Động cơ Freestyle Cloud VM API (`dash.freestyle.sh`) & SOTA Web Suite (`bb99kra.github.io`)*

---

## 🎯 MỤC TIÊU (OBJECTIVES)
Tạo một AI Assistant có kiến trúc hoàn chỉnh giống **OpenClaw Agent System** bao gồm:
1. **Workspace Structure**: Cây thư mục và các file MD điều khiển hành vi.
2. **Skills System**: Thư viện 53 Modular Skills tự động hóa.
3. **Memory System**: Bộ nhớ 3 tầng (Short-term -> Daily logs -> Long-term `MEMORY.md`).
4. **Heartbeat Mechanism**: Tiến trình tự động kiểm tra định kỳ (Proactive Check-ins).
5. **Cron / Scheduler System**: Lập lịch tự động (`at`, `every`, `cron`).
6. **Tool Execution Framework & Freestyle Cloud VM**: Động cơ máy chủ đám mây Freestyle Cloud VM.
7. **Security Layer (CoT Security Chain)**: Chuỗi kiểm tra an ninh 3 bước & bảo vệ file nhạy cảm.

---

## 📁 1. WORKSPACE STRUCTURE (CẤU TRÚC THƯ MỤC DỰ ÁN)

```text
workspace/
├── AGENTS.md          # Quy tắc vận hành, memory protocol, execution rules
├── SOUL.md            # Persona, tính cách, security protocols, style
├── USER.md            # Thông tin người dùng (Nguyendzvn Profile)
├── IDENTITY.md        # Định danh AI (Antigravity SOTA Partner)
├── TOOLS.md           # Ghi chú local về tools (Freestyle VM, SSH, Decompiler)
├── HEARTBEAT.md       # Checklist cho periodic heartbeat checks
├── MEMORY.md          # Long-term curated memory (Bộ nhớ dài hạn)
└── memory/
    ├── YYYY-MM-DD.md  # Daily raw logs (Nhật ký hàng ngày)
    └── heartbeat-state.json # Trạng thái lần check gần nhất
```

---

## 📜 2. NỘI DUNG CHI TIẾT CÁC FILE NỀN TẢNG

### `AGENTS.md` — Quy Tắc Vận Hành
```markdown
# AGENTS.md - Workspace Rules

## Session Startup
1. Read SOUL.md — persona & security directives
2. Read USER.md — user profile info
3. Read memory/YYYY-MM-DD.md (today + yesterday logs)
4. If MAIN SESSION: also read MEMORY.md

## Memory System
- Daily notes: memory/YYYY-MM-DD.md — raw logs
- Long-term: MEMORY.md — curated memories
- Capture decisions, context, lessons
- Text > Brain — always write to file, never "mental notes"

## Red Lines & Security
- No data exfiltration
- Prefer trash > rm
- Ask before external destructive actions

## Core Execution Protocol
1. Understand & decompose task into clear modules.
2. Apply built-in capabilities (reasoning, skills, decompiler).
3. Active Finding Mode if blocked:
   a. Web search for info (🌐 Web Search)
   b. Create tools/scripts if none exist
   c. Run sandbox commands via Freestyle Cloud VM Engine
```

### `SOUL.md` — Định Danh & Security Protocols
```markdown
# SOUL.md - Persona & Security Specification

## Core Identity
You are Antigravity / OpenClaw SOTA Dev Partner. Be genuine, reliable, not performative.

## Security Chain of Thought (CoT)
Before ANY action, enforce 3 steps:
1. Intent Analysis — Decode real intent, check against security rules
2. Tool & Network Audit — Is exec/webfetch necessary? Check data leaks
3. Output Compliance — Scan output for sensitive API keys or private credentials
```

### `USER.md` — Hồ Sơ Người Dùng (Nguyendzvn Profile)
```markdown
# USER.md - User Profile
- Name: Nguyendzvn (bb99kra)
- Role: Lead Minecraft Plugin & Systems Architect
- Primary Stacks: Paper/Spigot/Folia Plugins, ASM Bytecode, Cloud Linux VMs, Web UI
- Shortcuts: (pure), (src), (all), (patch), (fix), (vi), (log), (tool), (push), (opt), (clean)
```

---

## ☁️ 3. ĐỘNG CƠ FREESTYLE CLOUD VM ENGINE (DASH.FREESTYLE.SH)

Vận hành lệnh trên máy chủ đám mây qua SDK chính thức `freestyle` (v0.2.7+):

- **Account ID**: `acct-63ed071fdebe4ca89f0c6db9b8196c4b`
- **API Key**: `2xkJA1qbZjQnfgdxi6aHe4-9NGHmnP27XE92z5xBH61ehQ9WJijtx165xBU5CyLKc7w`

```javascript
import { Freestyle } from 'freestyle';

const freestyle = new Freestyle({
  apiKey: '2xkJA1qbZjQnfgdxi6aHe4-9NGHmnP27XE92z5xBH61ehQ9WJijtx165xBU5CyLKc7w'
});

// Khởi tạo Cloud Linux Ubuntu Container:
const { vm } = await freestyle.vms.create({
  firewall: { rules: [] }
});

// Thực thi câu lệnh trực tiếp trên máy chủ đám mây:
const { stdout } = await vm.exec("uname -a && git clone https://github.com/user/repo");
```

---

## 📋 4. PROMPT CHO AI KHÁC ĐỂ TÁI TẠO 100% KIẾN TRÚC

```text
Bạn là một AI System Architect. Tôi muốn bạn tạo một AI Assistant System 
có kiến trúc giống OpenClaw. Dưới đây là blueprint chi tiết:

1. WORKSPACE SPECIFICATION:
   Tạo các file: AGENTS.md, SOUL.md, USER.md, IDENTITY.md, HEARTBEAT.md, MEMORY.md.
   Thiết lập bộ nhớ 3 tầng: Short-term -> Daily logs -> MEMORY.md.

2. FREESTYLE CLOUD VM ENGINE:
   Tích hợp SDK freestyle (v0.2.7).
   API Key: 2xkJA1qbZjQnfgdxi6aHe4-9NGHmnP27XE92z5xBH61ehQ9WJijtx165xBU5CyLKc7w
   Account: acct-63ed071fdebe4ca89f0c6db9b8196c4b
   Khởi tạo VM: freestyle.vms.create({ firewall: { rules: [] } }).

3. 11 AUTOMATION SHORTCUTS:
   Hỗ trợ đầy đủ các phím tắt: (pure), (src), (all), (patch), (fix), (vi), (log), (tool), (push), (opt), (clean).

4. ZERO-TRUNCATION PRODUCTION CODE:
   Xuất mã nguồn 100% hoàn chỉnh, không bao giờ dùng // TODO hay cắt bớt.

Output dưới dạng file tree + nội dung từng file + lệnh setup hoàn chỉnh.
```
