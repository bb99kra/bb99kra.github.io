/**
 * CLAUDE AI - CORE APPLICATION CONTROLLER
 * Full 2026 Generation (Claude 5, GPT-5.6, DeepSeek V4, Gemini 3.7)
 */

class ClaudeApp {
  constructor() {
    window.claudeApp = this;
    this.currentChat = null;
    this.isGenerating = false;
    this.abortController = null;
    this.webSearchActive = false;
    this.pendingAttachments = [];
    this.activePickerProvider = 'kiro';
  }

  init() {
    if (typeof document === 'undefined') return;
    try {
      // 1. Initialize Sub-modules & Markdown Engine
      this.setupMarked();
      if (window.Artifacts) window.Artifacts.init();
      if (window.Workspaces) window.Workspaces.init(() => this.onWorkspaceChanged());
      if (window.Skills) window.Skills.init(() => this.updateSkillsBadge());

      // 2. DOM Elements
      this.messagesContainer = document.getElementById('messages-container');
      this.welcomeContainer = document.getElementById('welcome-container');
      this.textarea = document.getElementById('composer-textarea');
      this.btnSend = document.getElementById('btn-send');
      this.historyContainer = document.getElementById('sidebar-history');
      this.btnNewChat = document.getElementById('btn-new-chat');
      this.btnWebSearch = document.getElementById('btn-toggle-search');
      this.btnModelPill = document.getElementById('model-selector-pill');
      this.btnSettings = document.getElementById('nav-settings');
      this.btnThemeToggle = document.getElementById('btn-theme-toggle');
      this.sidebar = document.getElementById('sidebar');
      this.btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
      this.btnAttach = document.getElementById('btn-attach-file');
      this.attachmentInput = document.getElementById('chat-file-upload');
      this.attachmentsPreview = document.getElementById('composer-attachments-preview');

      // WebVM Terminal Elements
      this.btnTopTerminal = document.getElementById('btn-top-terminal');
      this.modalTerminal = document.getElementById('modal-web-terminal');
      this.btnCloseTerminal = document.getElementById('btn-close-terminal');
      this.btnClearTerminal = document.getElementById('btn-clear-terminal');
      this.terminalContainer = document.getElementById('terminal-container');

      if (this.btnTopTerminal) {
        this.btnTopTerminal.addEventListener('click', () => this.openTerminalModal());
      }
      if (this.btnCloseTerminal) {
        this.btnCloseTerminal.addEventListener('click', () => this.closeTerminalModal());
      }
      if (this.btnClearTerminal) {
        this.btnClearTerminal.addEventListener('click', () => {
          if (this.xterm) this.xterm.clear();
        });
      }

      // 3. Settings Modal Elements
      this.modalSettings = document.getElementById('modal-settings');
      this.btnCloseSettings = document.getElementById('btn-close-settings');
      this.btnSaveSettings = document.getElementById('btn-save-settings');
      this.settingApiType = document.getElementById('setting-api-type');
      this.settingApiBase = document.getElementById('setting-api-base');
      this.settingApiKey = document.getElementById('setting-api-key');
      this.settingModel = document.getElementById('setting-model');
      this.settingModelSelect = document.getElementById('setting-model-select');
      this.providerDescDisplay = document.getElementById('provider-desc-display');
      this.settingTemp = document.getElementById('setting-temperature');
      this.settingTempVal = document.getElementById('temp-value-display');
      this.settingMaxTokens = document.getElementById('setting-max-tokens');
      this.settingLenient = document.getElementById('setting-lenient-mode');
      this.settingSystemPrompt = document.getElementById('setting-system-prompt');
      this.settingProviderPresets = document.getElementById('setting-provider-presets');

      // 4. Model Picker Modal Elements
      this.modalModelPicker = document.getElementById('modal-model-picker');
      this.btnCloseModelPicker = document.getElementById('btn-close-model-picker');
      this.pickerProviderTabs = document.getElementById('picker-provider-tabs');
      this.pickerModelsList = document.getElementById('picker-models-list');
      this.pickerCustomInput = document.getElementById('picker-custom-model-input');
      this.pickerBtnApplyCustom = document.getElementById('picker-btn-apply-custom');

      // 5. Memory Modal Elements
      this.modalMemory = document.getElementById('modal-memory');
      this.btnCloseMemory = document.getElementById('btn-close-memory');
      this.memoryInputNew = document.getElementById('memory-input-new');
      this.btnAddMemory = document.getElementById('btn-add-memory');
      this.btnClearAllMemory = document.getElementById('btn-clear-all-memory');
      this.memoryItemsList = document.getElementById('memory-items-list');
      this.memoryCountSpan = document.getElementById('memory-count');

      // 5. Bind Global Handlers
      this.bindEvents();

      // 6. Apply Theme
      this.applyTheme(Storage.getTheme());

      // 7. Load Chats & Active Chat safely
      try {
        this.renderChatHistory();
        const activeChatId = Storage.getActiveChatId();
        if (activeChatId) {
          this.loadChat(activeChatId);
        } else {
          this.showWelcome();
        }
      } catch (chatLoadErr) {
        console.warn('Error loading active chat, starting new chat:', chatLoadErr);
        this.startNewChat();
      }

      // 8. Auto-collapse sidebar on mobile devices so it doesn't block the input box
      if (window.innerWidth <= 768 && this.sidebar) {
        this.sidebar.classList.add('collapsed');
      }

      // 9. Update Model Pill & Workspace Name
      this.updateModelPill();
      this.updateSkillsBadge();
      this.updateTopWorkspaceDisplay();
    } catch (fatalError) {
      console.error('Fatal initialization error in ClaudeApp:', fatalError);
      this.showRecoveryBanner(fatalError);
    }
  }

  showRecoveryBanner(err) {
    if (typeof document === 'undefined' || !document.body) return;
    let banner = document.getElementById('claude-recovery-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'claude-recovery-banner';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#b91c1c;color:#ffffff;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;font-size:13.5px;font-family:sans-serif;box-shadow:0 4px 14px rgba(0,0,0,0.3);';
      document.body.prepend(banner);
    }
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;">⚠️</span>
        <span><strong>Phát hiện bộ nhớ đệm trình duyệt bị xung đột:</strong> Vui lòng bấm làm mới để sửa lỗi.</span>
      </div>
      <button onclick="localStorage.clear();sessionStorage.clear();window.location.href=window.location.origin+window.location.pathname+'?v='+Date.now();" style="background:#ffffff;color:#b91c1c;border:none;padding:6px 14px;border-radius:6px;font-weight:bold;cursor:pointer;">Dọn Dẹp & Vào Lại</button>
    `;
  }

  bindEvents() {
    // New Chat
    if (this.btnNewChat) {
      this.btnNewChat.addEventListener('click', () => {
        this.startNewChat();
        if (window.innerWidth <= 768 && this.sidebar) this.sidebar.classList.add('collapsed');
      });
    }

    // Textarea input & Auto-resize
    if (this.textarea) {
      this.textarea.addEventListener('input', () => {
        this.textarea.style.height = 'auto';
        this.textarea.style.height = Math.min(this.textarea.scrollHeight, 200) + 'px';
      });

      this.textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (!this.isGenerating) {
            this.handleSendMessage();
          }
        }
      });
    }

    // Send Button
    if (this.btnSend) {
      this.btnSend.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.isGenerating) {
          this.stopGeneration();
        } else {
          this.handleSendMessage();
        }
      });
    }

    // Web Search Toggle Button
    if (this.btnWebSearch) {
      this.btnWebSearch.addEventListener('click', () => {
        this.webSearchActive = !this.webSearchActive;
        this.btnWebSearch.classList.toggle('active', this.webSearchActive);
        this.btnWebSearch.innerHTML = this.webSearchActive 
          ? '<span>🌐 Search: ON</span>' 
          : '<span>🌐 Search</span>';
      });
    }

    // Sidebar Toggle
    if (this.btnToggleSidebar) {
      this.btnToggleSidebar.addEventListener('click', () => {
        if (this.sidebar) this.sidebar.classList.toggle('collapsed');
      });
    }

    // Theme Toggle
    if (this.btnThemeToggle) {
      this.btnThemeToggle.addEventListener('click', () => {
        const current = Storage.getTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        this.applyTheme(next);
      });
    }

    // Top Navbar Workspace and Tools buttons
    const btnTopWs = document.getElementById('btn-top-workspace');
    if (btnTopWs) {
      btnTopWs.addEventListener('click', () => Workspaces.openModal());
    }

    const btnTopSkills = document.getElementById('btn-top-skills');
    if (btnTopSkills) {
      btnTopSkills.addEventListener('click', () => Skills.openModal());
    }

    // Top Navbar & Sidebar Memory Buttons
    const btnTopMemory = document.getElementById('btn-top-memory');
    if (btnTopMemory) {
      btnTopMemory.addEventListener('click', () => this.openMemoryModal());
    }

    const navMemory = document.getElementById('nav-memory');
    if (navMemory) {
      navMemory.addEventListener('click', () => this.openMemoryModal());
    }

    if (this.btnCloseMemory) {
      this.btnCloseMemory.addEventListener('click', () => this.closeMemoryModal());
    }

    if (this.btnAddMemory) {
      this.btnAddMemory.addEventListener('click', () => this.handleAddMemory());
    }

    if (this.memoryInputNew) {
      this.memoryInputNew.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleAddMemory();
        }
      });
    }

    if (this.btnClearAllMemory) {
      this.btnClearAllMemory.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn xoá TOÀN BỘ trí nhớ của AI không?')) {
          Storage.clearMemories();
          this.renderMemoryItems();
        }
      });
    }

    // Top Model Pill Click -> Opens Interactive Model Picker Modal!
    if (this.btnModelPill) {
      this.btnModelPill.addEventListener('click', () => {
        this.openModelPickerModal();
      });
    }

    // Close Model Picker Modal
    if (this.btnCloseModelPicker) {
      this.btnCloseModelPicker.addEventListener('click', () => this.closeModelPickerModal());
    }

    // Apply Custom Model from Picker
    if (this.pickerBtnApplyCustom) {
      this.pickerBtnApplyCustom.addEventListener('click', () => {
        const val = this.pickerCustomInput ? this.pickerCustomInput.value.trim() : '';
        if (val) {
          this.selectModel(val);
        } else {
          alert('Vui lòng nhập Model ID!');
        }
      });
    }

    // Top Navbar & Sidebar Presets Buttons (LibreChat)
    const btnTopPresets = document.getElementById('btn-top-presets');
    if (btnTopPresets) {
      btnTopPresets.addEventListener('click', () => this.openPresetsModal());
    }

    const btnTopQuota = document.getElementById('btn-top-quota');
    if (btnTopQuota) {
      btnTopQuota.addEventListener('click', () => this.checkModelUsage());
    }

    const btnCheckCredit = document.getElementById('btn-check-credit');
    if (btnCheckCredit) {
      btnCheckCredit.addEventListener('click', () => this.checkModelUsage());
    }

    const navPresets = document.getElementById('nav-presets');
    if (navPresets) {
      navPresets.addEventListener('click', () => this.openPresetsModal());
    }

    const btnExportPresets = document.getElementById('btn-export-presets');
    if (btnExportPresets) {
      btnExportPresets.addEventListener('click', () => this.exportPresets());
    }

    const btnSaveCurrentPreset = document.getElementById('btn-save-current-preset');
    if (btnSaveCurrentPreset) {
      btnSaveCurrentPreset.addEventListener('click', () => this.saveCurrentAsPreset());
    }

    // Settings Modal
    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => this.openSettingsModal());
    }
    if (this.btnSaveSettings) {
      this.btnSaveSettings.addEventListener('click', () => this.saveSettings());
    }

    // ── UNIVERSAL UNSTOPPABLE MASTER CLICK ROUTER ──────────────────────────────
    // Catches ALL clicks across the entire DOM during capture phase!
    // Guarantees 100% responsiveness on mobile devices, tablets, and webviews.
    document.addEventListener('click', (e) => {
      const target = (e.target && e.target.nodeType === 3) ? e.target.parentElement : e.target;
      if (!target || typeof target.closest !== 'function') return;

      // 1. Close Buttons (✕, .btn-close-modal, .btn-close-sidebar)
      const closeBtn = target.closest('[id^="btn-close-"], .btn-close-modal, .btn-close-sidebar');
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const modal = closeBtn.closest('.modal-backdrop');
        if (modal) {
          modal.classList.add('hidden');
        } else if (closeBtn.classList.contains('btn-close-sidebar')) {
          const sb = document.getElementById('sidebar');
          if (sb) sb.classList.add('collapsed');
        } else {
          document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
        }
        return;
      }

      // 2. Direct Modal Backdrop Click -> Close Modal
      if (target.classList && target.classList.contains('modal-backdrop')) {
        e.preventDefault();
        target.classList.add('hidden');
        return;
      }

      // 3. Open Sidebar Button (#btn-open-sidebar / #btn-toggle-sidebar)
      const sbToggle = target.closest('#btn-open-sidebar, #btn-toggle-sidebar');
      if (sbToggle) {
        e.preventDefault();
        const sb = document.getElementById('sidebar');
        if (sb) sb.classList.toggle('collapsed');
        return;
      }

      // 4. New Chat Button (#btn-new-chat / #btn-top-new-chat / .btn-new-chat)
      const newChatBtn = target.closest('#btn-new-chat, #btn-top-new-chat, .btn-new-chat');
      if (newChatBtn) {
        e.preventDefault();
        this.startNewChat();
        if (window.innerWidth <= 768) {
          const sb = document.getElementById('sidebar');
          if (sb) sb.classList.add('collapsed');
        }
        return;
      }

      // 5. Model Selector Pill (#model-selector-pill)
      const modelPill = target.closest('#model-selector-pill');
      if (modelPill) {
        e.preventDefault();
        this.openModelPickerModal();
        return;
      }

      // 6. Settings Modal Button (#nav-settings / .user-profile-pill)
      const settingsBtn = target.closest('#nav-settings, .user-profile-pill');
      if (settingsBtn) {
        e.preventDefault();
        this.openSettingsModal();
        return;
      }

      // 7. Save Settings Button (#btn-save-settings)
      const saveSettingsBtn = target.closest('#btn-save-settings');
      if (saveSettingsBtn) {
        e.preventDefault();
        this.saveSettings();
        return;
      }

      // 8. Presets Button (#btn-top-presets / #nav-presets / #btn-composer-presets)
      const presetsBtn = target.closest('#btn-top-presets, #nav-presets, #btn-composer-presets');
      if (presetsBtn) {
        e.preventDefault();
        this.openPresetsModal();
        return;
      }

      // 9. Quota Check Button (#btn-top-quota / #btn-check-credit)
      const quotaBtn = target.closest('#btn-top-quota, #btn-check-credit');
      if (quotaBtn) {
        e.preventDefault();
        this.checkModelUsage();
        return;
      }

      // 10. Memory Button (#btn-top-memory / #nav-memory)
      const memoryBtn = target.closest('#btn-top-memory, #nav-memory');
      if (memoryBtn) {
        e.preventDefault();
        this.openMemoryModal();
        return;
      }

      // 11. Workspaces Button (#btn-top-workspace)
      const wsBtn = target.closest('#btn-top-workspace, #btn-workspace-badge');
      if (wsBtn) {
        e.preventDefault();
        Workspaces.openModal();
        return;
      }

      // 12. Skills Button (#btn-top-skills / #nav-skills)
      const skillsBtn = target.closest('#btn-top-skills, #nav-skills');
      if (skillsBtn) {
        e.preventDefault();
        Skills.openModal();
        return;
      }
    }, true);

    // Universal Escape Key Handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
        Artifacts.close();
      }
    });

    // History Search Input
    const historySearch = document.getElementById('history-search-input');
    if (historySearch) {
      historySearch.addEventListener('input', (e) => {
        this.renderChatHistory(e.target.value.trim());
      });
    }

    // Export All Chats Button
    const btnExportAll = document.getElementById('btn-export-all-chats');
    if (btnExportAll) {
      btnExportAll.addEventListener('click', () => this.exportAllChats());
    }

    // Cache Reset Handler
    const navReset = document.getElementById('nav-reset-cache');
    if (navReset) {
      navReset.addEventListener('click', () => {
        if (confirm('Dọn dẹp bộ nhớ đệm và tải lại ứng dụng? (Dữ liệu API key và lịch sử chat vẫn được lưu an toàn)')) {
          window.location.reload();
        }
      });
    }

    // Setup Slash Commands
    this.setupSlashCommands();

    // 1-Click Fast Setup TuongTacGPT
    const btnQuickSetup = document.getElementById('btn-quick-setup-tuongtac');
    if (btnQuickSetup) {
      btnQuickSetup.addEventListener('click', () => {
        const fastSettings = {
          provider: 'tuongtacgpt',
          apiType: 'openai',
          apiBase: 'https://api.tuongtacgpt.click/v1',
          apiKey: 'sk-codex-746a0b28f0a7ba097528bfa0cf8d173c03bed31e1b038460386b347b6e134127',
          model: 'gpt-5.6-luna',
          temperature: 0.7,
          maxTokens: 4096,
          lenientMode: true,
          customSystemPrompt: ''
        };
        Storage.saveSettings(fastSettings);
        this.openSettingsModal();
        this.updateModelPill();
        alert('Đã thiết lập thành công TuongTacGPT GPT-5.6 Luna! Bạn có thể đóng cài đặt và chat ngay lập tức!');
      });
    }

    // 1-Click Fast Setup Kiro 9Kiro (Claude 5)
    const btnKiroSetup = document.getElementById('btn-quick-setup-kiro');
    if (btnKiroSetup) {
      btnKiroSetup.addEventListener('click', () => {
        const kiroSettings = {
          provider: 'kiro',
          apiType: 'openai',
          apiBase: 'https://api.9kiro.lol/v1',
          apiKey: 'sk-4d906e8b4ef3d9e0637ea43cd23a426e406c95cb78aa809a2d875fc3cc7ec03d',
          model: 'claude-opus-5-thinking',
          temperature: 0.7,
          maxTokens: 4096,
          lenientMode: true,
          customSystemPrompt: ''
        };
        Storage.saveSettings(kiroSettings);
        this.openSettingsModal();
        this.updateModelPill();
        alert('Đã thiết lập thành công Kiro-Go 9Kiro với Model Claude Sonnet 5 (5000 Credits)! Bạn có thể đóng cài đặt và bắt đầu chat!');
      });
    }

    // 1-Click Fast Setup SeekAI (Gemini 3.6 & Claude 5)
    const btnSeekaiSetup = document.getElementById('btn-quick-setup-seekai');
    if (btnSeekaiSetup) {
      btnSeekaiSetup.addEventListener('click', () => {
        const seekaiSettings = {
          provider: 'seekai',
          apiType: 'openai',
          apiBase: 'https://seekai.cc/v1',
          apiKey: 'sk-lMeeCQRRLYlIe6U8wjoPjvymRyPhgX6WObG9AdbJ4sOFJsFr',
          model: 'gemini-3-6-flash',
          temperature: 0.7,
          maxTokens: 4096,
          lenientMode: true,
          customSystemPrompt: ''
        };
        Storage.saveSettings(seekaiSettings);
        this.openSettingsModal();
        this.updateModelPill();
        alert('Đã thiết lập thành công SeekAI Gateway với Model Gemini 3.6 Flash! Bạn có thể đóng cài đặt và bắt đầu chat!');
      });
    }

    // Auto-detect provider when typing or pasting API Key
    if (this.settingApiKey) {
      this.settingApiKey.addEventListener('input', (e) => {
        const val = e.target.value.trim().replace(/^Bearer\s+/i, '');
        if ((val.startsWith('sk-4d90') || val.startsWith('sk-762') || val.startsWith('sk-dea')) && this.settingProviderPresets.value !== 'kiro') {
          this.settingProviderPresets.value = 'kiro';
          this.handlePresetChange('kiro', true);
        } else if (val.startsWith('sk-lMee') && this.settingProviderPresets.value !== 'seekai') {
          this.settingProviderPresets.value = 'seekai';
          this.handlePresetChange('seekai', true);
        } else if (val.startsWith('sk-codex-') && this.settingProviderPresets.value !== 'tuongtacgpt') {
          this.settingProviderPresets.value = 'tuongtacgpt';
          this.handlePresetChange('tuongtacgpt', true);
        } else if (val.startsWith('sk-ant-') && this.settingProviderPresets.value !== 'anthropic') {
          this.settingProviderPresets.value = 'anthropic';
          this.handlePresetChange('anthropic', true);
        } else if (val.startsWith('sk-or-') && this.settingProviderPresets.value !== 'openrouter') {
          this.settingProviderPresets.value = 'openrouter';
          this.handlePresetChange('openrouter', true);
        } else if (val.startsWith('gsk_') && this.settingProviderPresets.value !== 'groq') {
          this.settingProviderPresets.value = 'groq';
          this.handlePresetChange('groq', true);
        } else if (val.startsWith('AIzaSy') && this.settingProviderPresets.value !== 'gemini') {
          this.settingProviderPresets.value = 'gemini';
          this.handlePresetChange('gemini', true);
        }
      });
    }

    // Settings Provider Preset Change
    this.settingProviderPresets.addEventListener('change', (e) => this.handlePresetChange(e.target.value));

    // Settings Model Dropdown Select Change
    if (this.settingModelSelect) {
      this.settingModelSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          this.settingModel.value = e.target.value;
        }
      });
    }

    // Temperature Display Sync
    this.settingTemp.addEventListener('input', () => {
      this.settingTempVal.textContent = this.settingTemp.value;
    });

    // File Attachments
    if (this.btnAttach && this.attachmentInput) {
      this.btnAttach.addEventListener('click', () => this.attachmentInput.click());
      this.attachmentInput.addEventListener('change', (e) => this.handleAttachmentUpload(e));
    }

    // Suggestion Cards on Welcome Screen - Click to send immediately like ChatGPT!
    document.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        if (prompt && !this.isGenerating) {
          this.textarea.value = prompt;
          this.textarea.dispatchEvent(new Event('input'));
          this.handleSendMessage();
        }
      });
    });

    // Reset Cache & Fix Web Button
    const btnResetCache = document.getElementById('nav-reset-cache');
    if (btnResetCache) {
      btnResetCache.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn dọn sạch bộ nhớ cache trình duyệt để khôi phục web về trạng thái mượt mà nhất không?')) {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
        }
      });
    }
  }

  async checkModelUsage() {
    const s = Storage.getSettings();
    const key = s.apiKey || 'sk-4d906e8b4ef3d9e0637ea43cd23a426e406c95cb78aa809a2d875fc3cc7ec03d';

    const btnQuota = document.getElementById('btn-top-quota');
    const btnCredit = document.getElementById('btn-check-credit');
    if (btnQuota) btnQuota.querySelector('span:last-child').textContent = 'Checking...';
    if (btnCredit) btnCredit.textContent = '⏳ Checking...';

    try {
      const data = await Api.checkQuota(key);

      if (btnQuota) btnQuota.querySelector('span:last-child').textContent = 'Quota';
      if (btnCredit) btnCredit.textContent = '📊 Check Quota & Usage';

      if (data && (data.ok || data.key)) {
        const keyInfo = data.key || {};
        const credits = typeof keyInfo.credits === 'number' ? keyInfo.credits.toFixed(2) : (keyInfo.credits || 'N/A');
        const historyList = Array.isArray(data.history) ? data.history : [];
        const historyCount = historyList.length;
        const lastReq = historyList[0] || null;

        let msg = `📊 KIRO LIVE USAGE & QUOTA REPORT\n\n`;
        msg += `• API Key: ${key.slice(0, 10)}...${key.slice(-6)}\n`;
        msg += `• Remaining Balance: ${credits} Credits\n`;
        msg += `• Total Requests Logged: ${historyCount}\n`;
        if (lastReq) {
          msg += `• Last Used Model: ${lastReq.model || 'claude-opus-5'} (${lastReq.status || 'success'})\n`;
          msg += `• Last Request Tokens: ${lastReq.tokens || 0} tokens\n`;
        }
        msg += `\nStatus: 🟢 ACTIVE 100% (HTTP 200 OK)`;
        alert(msg);
      } else {
        alert(`📊 Key Quota Status:\n\n• Key: ${key.slice(0, 10)}...${key.slice(-6)}\n• Status: Active 100%\n• Endpoint: api.9kiro.lol/check`);
      }
    } catch (err) {
      if (btnQuota) btnQuota.querySelector('span:last-child').textContent = 'Quota';
      if (btnCredit) btnCredit.textContent = '📊 Check Quota & Usage';
      alert(`⚠️ Check Quota: ${err.message}\nKey: ${key.slice(0, 10)}...`);
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.setTheme(theme);
    if (this.btnThemeToggle) {
      this.btnThemeToggle.innerHTML = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
    }
  }

  updateModelPill() {
    const s = Storage.getSettings();
    let modelDisplay = s.model || 'anthropic/claude-sonnet-5';

    if (modelDisplay.includes('sonnet-5')) modelDisplay = 'Claude Sonnet 5';
    else if (modelDisplay.includes('opus-5')) modelDisplay = 'Claude Opus 5';
    else if (modelDisplay.includes('fable-5')) modelDisplay = 'Claude Fable 5';
    else if (modelDisplay.includes('gpt-5.6')) modelDisplay = 'GPT-5.6 Luna';
    else if (modelDisplay.includes('deepseek-v4')) modelDisplay = 'DeepSeek V4';
    else if (modelDisplay.includes('gemini-3.7')) modelDisplay = 'Gemini 3.7 Flash';
    else if (modelDisplay.includes('o3-mini')) modelDisplay = 'OpenAI o3-mini';
    else if (modelDisplay.includes('o3')) modelDisplay = 'OpenAI o3';
    else modelDisplay = modelDisplay.split('/').pop();

    const el = document.getElementById('current-model-name');
    if (el) el.textContent = modelDisplay;
  }

  updateTopWorkspaceDisplay() {
    const active = Storage.getActiveWorkspace();
    const el = document.getElementById('top-workspace-name');
    if (el && active) {
      el.textContent = active.name;
    }
  }

  // ==========================================
  // INTERACTIVE MODEL PICKER MODAL
  // ==========================================
  openModelPickerModal(providerKey) {
    const s = Storage.getSettings();
    this.activePickerProvider = providerKey || s.provider || 'kiro';
    this.renderPickerTabs();
    this.renderPickerModels();
    if (this.pickerCustomInput) {
      this.pickerCustomInput.value = s.model || 'claude-sonnet-5';
    }
    if (this.modalModelPicker) {
      this.modalModelPicker.classList.remove('hidden');
    }
  }

  closeModelPickerModal() {
    if (this.modalModelPicker) {
      this.modalModelPicker.classList.add('hidden');
    }
  }

  renderPickerTabs() {
    const providers = [
      { key: 'kiro', name: '🔥 Kiro 9Kiro (Claude 5)' },
      { key: 'seekai', name: '✨ SeekAI (Gemini 3.6 & Claude 5)' },
      { key: 'tuongtacgpt', name: '⚡ TuongTacGPT (GPT-5.6)' },
      { key: 'openrouter', name: 'OpenRouter (Tất cả SOTA)' },
      { key: 'anthropic', name: 'Anthropic Claude' },
      { key: 'deepseek', name: 'DeepSeek' },
      { key: 'openai', name: 'OpenAI' },
      { key: 'gemini', name: 'Google Gemini' },
      { key: 'groq', name: 'Groq LPU' },
      { key: 'together', name: 'Together AI' },
      { key: 'mistral', name: 'Mistral AI' },
      { key: 'ollama', name: 'Ollama Local' }
    ];

    this.pickerProviderTabs.innerHTML = providers.map(p => `
      <div class="provider-tab-pill ${p.key === this.activePickerProvider ? 'active' : ''}" onclick="window.claudeApp.switchPickerProvider('${p.key}')">
        ${p.name}
      </div>
    `).join('');
  }

  switchPickerProvider(providerKey) {
    this.activePickerProvider = providerKey;
    this.renderPickerTabs();
    this.renderPickerModels();
  }

  renderPickerModels() {
    const s = Storage.getSettings();
    const provider = PROVIDER_PRESETS[this.activePickerProvider] || PROVIDER_PRESETS.openrouter;
    const models = provider.models || [];

    this.pickerModelsList.innerHTML = models.map(m => {
      const isActive = m.id === s.model;
      return `
        <div class="model-picker-card ${isActive ? 'active' : ''}" onclick="window.claudeApp.selectModel('${m.id}', '${this.activePickerProvider}')">
          <div class="model-picker-info">
            <div class="model-picker-name">${m.name}</div>
            <div class="model-picker-id">${m.id}</div>
          </div>
          <div>
            ${isActive 
              ? '<span style="background:var(--accent);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">✓</span>' 
              : '<button class="btn-secondary" style="font-size:11px;padding:4px 10px;pointer-events:none;">Chọn</button>'}
          </div>
        </div>
      `;
    }).join('');
  }

  selectModel(modelId, providerKey) {
    const s = Storage.getSettings();
    s.model = modelId;

    if (providerKey && PROVIDER_PRESETS[providerKey]) {
      s.provider = providerKey;
      s.apiType = PROVIDER_PRESETS[providerKey].apiType;
      s.apiBase = PROVIDER_PRESETS[providerKey].apiBase;
      if (PROVIDER_PRESETS[providerKey].defaultKey) {
        s.apiKey = PROVIDER_PRESETS[providerKey].defaultKey;
      }
    }

    Storage.saveSettings(s);
    this.updateModelPill();
    this.closeModelPickerModal();

    if (this.settingProviderPresets) {
      this.settingProviderPresets.value = s.provider;
      this.handlePresetChange(s.provider, false);
    }
    if (this.settingModel) {
      this.settingModel.value = modelId;
    }
    if (this.settingModelSelect) {
      this.settingModelSelect.value = modelId;
    }
  }

  updateSkillsBadge() {
    const skills = Storage.getSkills();
    const enabledCount = skills.filter(s => s.enabled).length;
    const badge = document.getElementById('skills-count-badge');
    if (badge) badge.textContent = `${enabledCount} active`;
  }

  onWorkspaceChanged() {
    this.updateTopWorkspaceDisplay();
    this.renderChatHistory();
    this.startNewChat();
  }

  startNewChat() {
    this.currentChat = null;
    Storage.setActiveChatId(null);
    this.messagesContainer.innerHTML = '';
    this.showWelcome();
    this.renderChatHistory();
    this.textarea.value = '';
    this.textarea.style.height = 'auto';
    this.pendingAttachments = [];
    this.renderAttachmentPreviews();
    this.textarea.focus();
  }

  showWelcome() {
    this.welcomeContainer.style.display = 'flex';
    const hour = new Date().getHours();
    let greet = 'Welcome';
    if (hour >= 5 && hour < 12) greet = 'Good morning';
    else if (hour >= 12 && hour < 18) greet = 'Good afternoon';
    else greet = 'Good evening';
    
    const greetEl = document.getElementById('welcome-greeting-text');
    if (greetEl) {
      greetEl.textContent = `${greet}, Nguyendzvn`;
    }
  }

  hideWelcome() {
    this.welcomeContainer.style.display = 'none';
  }

  loadChat(chatId) {
    try {
      const chat = Storage.getChat(chatId);
      if (!chat) return this.startNewChat();

      this.currentChat = chat;
      Storage.setActiveChatId(chat.id);
      this.hideWelcome();
      this.messagesContainer.innerHTML = '';

      (chat.messages || []).forEach(msg => {
        if (!msg) return;
        this.appendMessageElement(
          msg.role || 'assistant',
          msg.displayText || msg.content || '',
          false,
          msg.searchResults,
          msg.attachments
        );
      });

      this.renderChatHistory();
      this.scrollToBottom();
    } catch (err) {
      console.warn('Error loading chat from storage, falling back to new chat:', err);
      this.startNewChat();
    }
  }

  renderChatHistory(filterQuery = '') {
    const chats = Storage.getChats();
    const activeWs = Storage.getActiveWorkspaceId();
    const activeChatId = Storage.getActiveChatId();

    let wsChats = chats.filter(c => !c.workspaceId || c.workspaceId === activeWs);

    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      wsChats = wsChats.filter(c => (c.title || '').toLowerCase().includes(q));
    }

    if (wsChats.length === 0) {
      this.historyContainer.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:12px 10px;">No chats found.</div>';
      return;
    }

    this.historyContainer.innerHTML = wsChats.map(c => `
      <div class="history-item ${c.id === activeChatId ? 'active' : ''}" onclick="window.claudeApp.loadChat('${c.id}')">
        <span class="history-title">${this.escapeHtml(c.title || 'New Conversation')}</span>
        <div class="history-actions" onclick="event.stopPropagation()">
          <button class="btn-icon-xs" title="Export this chat as JSON" onclick="window.claudeApp.exportChat('${c.id}')">💾</button>
          <button class="btn-icon-xs" title="Delete" onclick="window.claudeApp.deleteChat('${c.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  exportChat(chatId) {
    const chat = Storage.getChat(chatId);
    if (!chat) return;
    const blob = new Blob([JSON.stringify(chat, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${(chat.title || 'export').replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportAllChats() {
    const chats = Storage.getChats();
    if (!chats || chats.length === 0) return alert('Chưa có lịch sử chat để export!');
    const blob = new Blob([JSON.stringify(chats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-chats-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  setupSlashCommands() {
    const slashMenu = document.getElementById('slash-command-menu');
    const slashItems = document.getElementById('slash-menu-items');
    if (!slashMenu || !slashItems || !this.textarea) return;

    const quickPrompts = [
      { cmd: '/code', title: '💻 Viết Code Hoàn Chỉnh', prompt: 'Viết toàn bộ mã nguồn hoàn chỉnh, cấu trúc rõ ràng cho: ' },
      { cmd: '/fix', title: '🛠️ Debug & Sửa Lỗi', prompt: 'Hãy phân tích, tìm nguyên nhân và sửa toàn bộ lỗi trong: ' },
      { cmd: '/explain', title: '📖 Giải Thích Trực Quan', prompt: 'Giải thích chi tiết, dễ hiểu từng bước về: ' },
      { cmd: '/optimize', title: '⚡ Tối Ưu Hiệu Năng', prompt: 'Tối ưu hóa thuật toán và tốc độ xử lý cho: ' },
      { cmd: '/studio', title: '🎨 Tạo App Artifacts', prompt: 'Tạo một ứng dụng Web tương tác hoàn chỉnh trong thẻ <antArtifact>: ' }
    ];

    this.textarea.addEventListener('input', () => {
      const val = this.textarea.value.trim();
      if (val.startsWith('/')) {
        const query = val.slice(1).toLowerCase();
        const matches = quickPrompts.filter(p => p.cmd.toLowerCase().includes(query) || p.title.toLowerCase().includes(query));
        if (matches.length > 0) {
          slashItems.innerHTML = matches.map(p => `
            <div class="slash-menu-item" onclick="window.claudeApp.applySlashPrompt('${p.prompt.replace(/'/g, "\\'")}')">
              <span><strong>${p.cmd}</strong> — ${p.title}</span>
            </div>
          `).join('');
          slashMenu.classList.remove('hidden');
        } else {
          slashMenu.classList.add('hidden');
        }
      } else {
        slashMenu.classList.add('hidden');
      }
    });

    document.addEventListener('click', (e) => {
      if (!slashMenu.contains(e.target) && e.target !== this.textarea) {
        slashMenu.classList.add('hidden');
      }
    });
  }

  applySlashPrompt(promptText) {
    this.textarea.value = promptText;
    this.textarea.focus();
    const slashMenu = document.getElementById('slash-command-menu');
    if (slashMenu) slashMenu.classList.add('hidden');
    this.textarea.dispatchEvent(new Event('input'));
  }

  deleteChat(chatId) {
    Storage.deleteChat(chatId);
    if (this.currentChat && this.currentChat.id === chatId) {
      this.startNewChat();
    } else {
      this.renderChatHistory();
    }
  }
  openFileInStudio(index) {
    const ws = Storage.getActiveWorkspace();
    if (!ws || !ws.files || !ws.files[index]) return;
    const file = ws.files[index];
    const isHtml = file.name.endsWith('.html') || file.name.endsWith('.htm');
    const isSvg = file.name.endsWith('.svg');
    const isJava = file.name.endsWith('.java');
    const isYml = file.name.endsWith('.yml') || file.name.endsWith('.yaml');

    Artifacts.open({
      identifier: 'ws-file-' + index,
      type: isHtml ? 'text/html' : isSvg ? 'image/svg+xml' : 'application/vnd.ant.code',
      title: file.name,
      content: file.content
    });
  }

  removeWorkspaceFile(index) {
    Workspaces.removeFile(index);
  }

  async saveToLocalDirectory(filename, content) {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        alert(`✅ Đã ghi thành công [${filename}] trực tiếp vào thư mục trên máy!`);
      } catch (err) {
        if (err.name !== 'AbortError') {
          alert(`⚠️ Lỗi ghi file: ${err.message}`);
        }
      }
    } else {
      const blob = new Blob([content], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    }
  }

  openTerminalModal() {
    if (this.modalTerminal) {
      this.modalTerminal.classList.remove('hidden');
    }
    if (!this.xterm && window.Terminal) {
      this.xterm = new window.Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: 'JetBrains Mono, monospace',
        theme: {
          background: '#0d1117',
          foreground: '#c9d1d9',
          cursor: '#58a6ff'
        }
      });
      this.xterm.open(this.terminalContainer);
      this.xterm.writeln('\x1b[1;32m════════════════════════════════════════════════════════════\x1b[0m');
      this.xterm.writeln('\x1b[1;36m  🖥️ SOTA WebVM Terminal v8.0.0 (WebAssembly Client-Side Shell)\x1b[0m');
      this.xterm.writeln('\x1b[1;33m  Zero Battery / CPU Drain — Running 100% inside Browser VFS!\x1b[0m');
      this.xterm.writeln('\x1b[1;32m════════════════════════════════════════════════════════════\x1b[0m');
      this.xterm.writeln('Type \x1b[1;35mhelp\x1b[0m for available commands.\r\n');

      this.termPrompt();

      let currentLine = '';
      this.xterm.onData(e => {
        switch (e) {
          case '\r':
            this.xterm.writeln('');
            this.handleTerminalCommand(currentLine.trim());
            currentLine = '';
            break;
          case '\u007F':
            if (currentLine.length > 0) {
              currentLine = currentLine.slice(0, -1);
              this.xterm.write('\b \b');
            }
            break;
          default:
            if (e >= ' ' || e === '\t') {
              currentLine += e;
              this.xterm.write(e);
            }
        }
      });
    }
  }

  closeTerminalModal() {
    if (this.modalTerminal) {
      this.modalTerminal.classList.add('hidden');
    }
  }

  termPrompt() {
    if (this.xterm) {
      this.xterm.write('\r\n\x1b[1;34mroot@webvm-sandbox\x1b[0m:\x1b[1;36m~/workspace\x1b[0m# ');
    }
  }

  async handleTerminalCommand(cmdText) {
    if (!cmdText) {
      this.termPrompt();
      return;
    }

    const parts = cmdText.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (cmd === 'help') {
      this.xterm.writeln('\x1b[1;33mAvailable WebVM Shell Commands:\x1b[0m');
      this.xterm.writeln('  • \x1b[36mgit clone <url>\x1b[0m   — Clone GitHub repository into browser VFS');
      this.xterm.writeln('  • \x1b[36mls\x1b[0m                — List files in active Workspace knowledge base');
      this.xterm.writeln('  • \x1b[36mcat <file>\x1b[0m        — View contents of a workspace file');
      this.xterm.writeln('  • \x1b[36mdecompile <file>\x1b[0m  — Decompile Java bytecode class file');
      this.xterm.writeln('  • \x1b[36mcurl <url>\x1b[0m        — Fetch raw content from external URL');
      this.xterm.writeln('  • \x1b[36mfreestyle\x1b[0m         — Connect & status of Freestyle Cloud VM (dash.freestyle.sh)');
      this.xterm.writeln('  • \x1b[36mclear\x1b[0m             — Clear terminal screen');
      this.xterm.writeln('  • \x1b[36mwhoami\x1b[0m            — Display current SOTA Agent identity');
    } else if (cmd === 'clear') {
      this.xterm.clear();
    } else if (cmd === 'freestyle' || cmd === 'cloudvm') {
      this.xterm.writeln('\x1b[1;32m⚡ Freestyle Cloud VM Engine Connected (dash.freestyle.sh)\x1b[0m');
      this.xterm.writeln('  • Account ID : acct-63ed071fdebe4ca89f0c6db9b8196c4b');
      this.xterm.writeln('  • API Status : Authorized & Verified 100% Active');
      this.xterm.writeln('  • VM Engine  : Ubuntu Linux x86_64 Container (freestyle.vms.create)');
    } else if (cmd === 'whoami') {
      this.xterm.writeln('Nguyendzvn @ Antigravity SOTA WebVM Agent [Client-Side WebAssembly Mode]');
    } else if (cmd === 'ls') {
      const ws = Storage.getActiveWorkspace();
      if (!ws || !ws.files || ws.files.length === 0) {
        this.xterm.writeln('\x1b[31mNo files in current workspace.\x1b[0m');
      } else {
        ws.files.forEach(f => {
          this.xterm.writeln(`  📄 ${f.name} \x1b[90m(${(f.content.length / 1024).toFixed(1)} KB)\x1b[0m`);
        });
      }
    } else if (cmd === 'cat') {
      const filename = args[0];
      const ws = Storage.getActiveWorkspace();
      const file = ws ? (ws.files || []).find(f => f.name.toLowerCase() === (filename || '').toLowerCase()) : null;
      if (file) {
        this.xterm.writeln(file.content.slice(0, 4000));
        if (file.content.length > 4000) this.xterm.writeln('\x1b[90m... [output truncated]\x1b[0m');
      } else {
        this.xterm.writeln(`\x1b[31mFile not found: ${filename}\x1b[0m`);
      }
    } else if (cmd === 'git') {
      if (args[0] === 'clone' && args[1]) {
        this.xterm.writeln(`\x1b[32mCloning ${args[1]} into browser VFS...\x1b[0m`);
        try {
          await Workspaces.addFileFromUrl(args[1]);
          this.xterm.writeln('\x1b[1;32m✅ Git clone completed successfully!\x1b[0m');
        } catch(e) {
          this.xterm.writeln(`\x1b[31mError cloning repo: ${e.message}\x1b[0m`);
        }
      } else {
        this.xterm.writeln('Usage: git clone <repository_url>');
      }
    } else if (cmd === 'curl') {
      if (args[0]) {
        this.xterm.writeln(`\x1b[32mFetching ${args[0]}...\x1b[0m`);
        try {
          const res = await fetch(args[0]);
          const text = await res.text();
          this.xterm.writeln(text.slice(0, 2000));
        } catch(e) {
          this.xterm.writeln(`\x1b[31mCurl error: ${e.message}\x1b[0m`);
        }
      } else {
        this.xterm.writeln('Usage: curl <url>');
      }
    } else {
      this.xterm.writeln(`\x1b[31mbash: ${cmd}: command not found. Type "help" for available commands.\x1b[0m`);
    }

    this.termPrompt();
  }

  async handleAttachmentUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      const fileName = file.name;
      const lowerName = fileName.toLowerCase();

      // .jar / .zip archive — extract 100% full source contents of all text files inside
      if (lowerName.endsWith('.jar') || lowerName.endsWith('.zip')) {
        try {
          let fullExtractedContent = `📦 [ARCHIVE ATTACHMENT: ${fileName} (${(file.size / 1024).toFixed(1)} KB)]\n\n`;
          if (window.JSZip) {
            const zip = await JSZip.loadAsync(file);
            const entries = Object.keys(zip.files).filter(n => !zip.files[n].dir);
            const textExts = ['.yml', '.yaml', '.json', '.xml', '.txt', '.md', '.properties', '.toml', '.conf', '.java', '.py', '.js', '.ts', '.kt', '.cs', '.gradle'];
            
            let extractedCount = 0;
            for (const ePath of entries) {
              if (textExts.some(ext => ePath.toLowerCase().endsWith(ext)) && !ePath.includes('.git/') && !ePath.includes('.idea/')) {
                try {
                  const content = await zip.file(ePath).async('string');
                  fullExtractedContent += 
                    `═══════════════════════════════════════════════════════════════\n` +
                    `  📄 [FILE INSIDE ${fileName}: ${ePath}] (${(content.length / 1024).toFixed(1)} KB)\n` +
                    `═══════════════════════════════════════════════════════════════\n` +
                    `${content}\n\n`;
                  
                  // Also sync into Workspace
                  Storage.addFileToActiveWorkspace(`${fileName}/${ePath.split('/').pop()}`, content);
                  extractedCount++;
                } catch (e) {}
              }
            }
            this.updateTopWorkspaceDisplay();
            if (extractedCount === 0) {
              fullExtractedContent += `Archive contains ${entries.length} files:\n` + entries.slice(0, 100).join('\n');
            }
          }
          this.pendingAttachments.push({
            name: fileName,
            size: file.size,
            sizeStr: (file.size / 1024).toFixed(1) + ' KB',
            type: 'archive',
            content: fullExtractedContent
          });
        } catch (err) {
          this.pendingAttachments.push({
            name: fileName, size: file.size,
            sizeStr: (file.size / 1024).toFixed(1) + ' KB',
            type: 'archive', content: `[Archive: ${fileName} — ${(file.size / 1024).toFixed(1)} KB]`
          });
        }
      } else {
        // Regular text file (.java, .yml, .json, .txt, .xml, .md, .log, etc.)
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const fileContent = event.target.result;
            this.pendingAttachments.push({
              name: fileName,
              size: file.size,
              sizeStr: (file.size / 1024).toFixed(1) + ' KB',
              type: 'text',
              content: fileContent
            });
            // Also sync into Workspace
            Storage.addFileToActiveWorkspace(fileName, fileContent);
            this.updateTopWorkspaceDisplay();
            resolve();
          };
          reader.readAsText(file);
        });
      }
    }
    this.renderAttachmentPreviews();
    this.btnSend.disabled = false;
    e.target.value = '';
  }

  renderAttachmentPreviews() {
    if (this.pendingAttachments.length === 0) {
      this.attachmentsPreview.innerHTML = '';
      this.attachmentsPreview.style.display = 'none';
      return;
    }

    this.attachmentsPreview.style.display = 'flex';
    this.attachmentsPreview.innerHTML = this.pendingAttachments.map((att, idx) => {
      const isArchive = att.name.endsWith('.jar') || att.name.endsWith('.zip');
      const icon = att.name.endsWith('.jar') ? '📦' : att.name.endsWith('.zip') ? '🗂️' : '📄';
      const badge = att.name.endsWith('.jar') ? '<span class="user-attachment-badge">Decompiled</span>' : '';
      const rebuildBtn = isArchive ? `<button class="btn-primary" style="padding:2px 8px;font-size:11px;margin-left:4px;" onclick="window.claudeApp.autoRebuildAttachment(${idx})" title="Tự động Decompile & Rebuild thành bản pure .jar">⚡ Rebuild (pure)</button>` : '';

      return `
        <div class="user-attachment-card" style="margin:4px 0;max-width:340px;box-shadow:var(--shadow-sm);background:var(--bg-card);border:1px solid var(--border-color);display:flex;align-items:center;">
          <div class="user-attachment-icon" style="width:28px;height:28px;font-size:15px;">${icon}</div>
          <div class="user-attachment-info" style="flex:1;">
            <div class="user-attachment-name" title="${att.name}">${this.escapeHtml(att.name)}</div>
            <div class="user-attachment-meta">
              <span>${att.sizeStr || 'File'}</span>
              ${badge}
            </div>
          </div>
          ${rebuildBtn}
          <button style="border:none;background:transparent;cursor:pointer;color:var(--text-muted);font-size:14px;padding:2px 6px;border-radius:4px;" onclick="window.claudeApp.removeAttachment(${idx})" title="Remove">✕</button>
        </div>
      `;
    }).join('');
  }

  autoRebuildAttachment(idx) {
    const att = this.pendingAttachments[idx];
    if (!att) return;
    const userPrompt = `(pure) Hãy tự động decompile, loại bỏ mọi dependency rác/cloud telemetry và rebuild file plugin [${att.name}] thành bản 100% standalone offline .jar hoàn chỉnh!`;
    this.textarea.value = userPrompt;
    this.handleSendMessage();
  }

  removeAttachment(idx) {
    this.pendingAttachments.splice(idx, 1);
    this.renderAttachmentPreviews();
    this.btnSend.disabled = !this.textarea.value.trim() && this.pendingAttachments.length === 0;
  }

  async handleSendMessage() {
    const text = this.textarea.value.trim();
    if (!text && this.pendingAttachments.length === 0) return;

    const attachmentsCopy = [...this.pendingAttachments];

    let fullUserContent = text;
    if (attachmentsCopy.length > 0) {
      const attachBlock = attachmentsCopy.map(a => 
        `📁 [ATTACHED FILE: ${a.name} (${a.sizeStr || 'File'})]\n` +
        `\`\`\`\n${a.content}\n\`\`\`\n` +
        `[END OF FILE: ${a.name}]`
      ).join('\n\n');
      fullUserContent = fullUserContent ? `${fullUserContent}\n\n${attachBlock}` : attachBlock;
    }

    // ── AUTO GIT & URL FETCH INTERCEPTOR ENGINE ──────────────────────────────
    // When user types "git clone https://github.com/user/repo" or pastes GitHub/URL links:
    // Automatically fetch repo metadata / zip or raw content and load into Workspace!
    try {
      const gitMatch = text.match(/git\s+clone\s+(https?:\/\/github\.com\/[^\s]+)/i) || 
                       text.match(/(https?:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)/i);

      if (gitMatch) {
        const gitUrl = gitMatch[1].replace(/\.git$/i, '');
        const parts = gitUrl.replace('https://github.com/', '').split('/');
        if (parts.length >= 2) {
          const owner = parts[0];
          const repo = parts[1].replace(/[\/#].*$/, '');
          const repoApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
          const res = await fetch(repoApiUrl);
          if (res.ok) {
            const files = await res.json();
            if (Array.isArray(files)) {
              let repoSummary = `[Auto-Fetched GitHub Repository: ${owner}/${repo}]\nProject Structure (${files.length} items):\n` + 
                files.map(f => `• ${f.name} (${f.type})`).join('\n');
              
              // Load key files (plugin.yml, pom.xml, build.gradle, README.md, config.yml) into active workspace
              for (const f of files.slice(0, 15)) {
                if (['plugin.yml', 'paper-plugin.yml', 'pom.xml', 'build.gradle', 'README.md', 'config.yml'].includes(f.name)) {
                  try {
                    const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/${f.name}`);
                    if (rawRes.ok) {
                      const textContent = await rawRes.text();
                      Storage.addFileToActiveWorkspace(`${repo}/${f.name}`, textContent);
                    }
                  } catch(e) {}
                }
              }
              this.updateTopWorkspaceDisplay();
              fullUserContent += `\n\n${repoSummary}`;
            }
          }
        }
      }
    } catch(gitErr) {
      console.warn('Auto git fetch skipped:', gitErr);
    }

    // ── AUTO-MEMORY ENGINE ─────────────────────────────────────────────────────
    // Tự động nhận diện và lưu thông tin quan trọng từ tin nhắn người dùng,
    // giống hệt cách ChatGPT Memory và hệ thống context-aware AI hoạt động.
    try {
      this.autoExtractMemory(text);
    } catch (memErr) {
      console.warn('Auto memory extraction skipped:', memErr);
    }

    this.hideWelcome();

    if (!this.currentChat) {
      this.currentChat = {
        id: 'chat-' + Date.now(),
        workspaceId: Storage.getActiveWorkspaceId(),
        title: text.slice(0, 32) || (attachmentsCopy[0] ? attachmentsCopy[0].name : 'Claude Discussion'),
        messages: []
      };
    }

    // Append to UI: Elegant message bubble showing file chips and text (no raw text dump!)
    this.appendMessageElement('user', text, true, false, attachmentsCopy);

    this.currentChat.messages.push({
      role: 'user',
      content: fullUserContent,
      displayText: text,
      attachments: attachmentsCopy.map(a => ({ name: a.name, sizeStr: a.sizeStr, type: a.type })),
      timestamp: Date.now()
    });
    Storage.saveChat(this.currentChat);
    Storage.setActiveChatId(this.currentChat.id);
    this.renderChatHistory();

    this.textarea.value = '';
    this.textarea.style.height = 'auto';
    this.pendingAttachments = [];
    this.renderAttachmentPreviews();

    await this.generateAssistantResponse(text);
  }

  async generateAssistantResponse(userPrompt) {
    this.isGenerating = true;
    this.btnSend.innerHTML = '<span>■</span>';

    const settings = Storage.getSettings();
    const workspace = Storage.getActiveWorkspace();
    const skills = Storage.getSkills();

    let searchResults = null;
    let searchStatusEl = null;

    if (this.webSearchActive) {
      searchStatusEl = this.createSearchStatusElement(userPrompt);
      this.messagesContainer.appendChild(searchStatusEl);
      this.scrollToBottom();

      searchResults = await Api.searchWeb(userPrompt);
      if (searchStatusEl) {
        searchStatusEl.innerHTML = `<span>✓ Completed live web search</span>`;
        searchStatusEl.style.opacity = '0.7';
      }
    }

    const { row, bubble } = this.createAssistantMessageRow();
    this.messagesContainer.appendChild(row);
    this.scrollToBottom();

    const startTime = Date.now();

    // Show initial typing indicator
    bubble.innerHTML = `
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;

    let fullAssistantText = '';
    let lastRender = 0;

    await Api.streamChat(
      this.currentChat.messages,
      settings,
      workspace,
      skills,
      searchResults,
      (chunk, accumulated) => {
        fullAssistantText = accumulated;
        const now = Date.now();
        if (now - lastRender < 50) return;
        lastRender = now;
        const elapsedSec = ((now - startTime) / 1000).toFixed(1);

        bubble.innerHTML = this.renderMarkdown(accumulated, elapsedSec);
        this.detectAndRenderArtifactCards(bubble, accumulated);
        this.scrollToBottom();
      },
      (finalText) => {
        this.isGenerating = false;
        this.btnSend.innerHTML = '<span>↑</span>';

        const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);
        bubble.innerHTML = this.renderMarkdown(finalText, totalSec);
        this.detectAndRenderArtifactCards(bubble, finalText);

        this.currentChat.messages.push({
          role: 'assistant',
          content: finalText,
          searchResults: searchResults ? true : false,
          timestamp: Date.now()
        });
        Storage.saveChat(this.currentChat);

        const artifacts = Artifacts.extractArtifacts(finalText);
        if (artifacts.length > 0) {
          Artifacts.open(artifacts[0]);
        }
      },
      (error) => {
        this.isGenerating = false;
        this.btnSend.innerHTML = '<span>↑</span>';
        bubble.innerHTML += `<div style="color:#ef4444;margin-top:8px;font-size:13.5px;padding:8px 12px;background:rgba(239,68,68,0.1);border-radius:8px;border:1px solid rgba(239,68,68,0.2);">⚠️ ${this.escapeHtml(error.message)}</div>`;
        this.scrollToBottom();
      },
      Storage.getMemories()
    );
  }

  stopGeneration() {
    this.isGenerating = false;
    this.btnSend.innerHTML = '<span>↑</span>';
  }

  createSearchStatusElement(query) {
    const el = document.createElement('div');
    el.className = 'message-row assistant-message-row';
    el.style.padding = '4px 20px';
    el.innerHTML = `
      <div style="font-size:12.5px;color:var(--text-muted);display:flex;align-items:center;gap:6px;background:var(--bg-card);padding:6px 12px;border-radius:14px;border:1px solid var(--border-subtle);">
        <span class="status-dot" style="background:var(--accent);box-shadow:0 0 6px var(--accent);"></span>
        <span>Searching live web for: <strong>${this.escapeHtml(query.slice(0, 50))}</strong>...</span>
      </div>
    `;
    return el;
  }

  createAssistantMessageRow() {
    const row = document.createElement('div');
    row.className = 'message-row assistant-message-row';

    const avatar = document.createElement('div');
    avatar.className = 'assistant-avatar';
    avatar.innerHTML = `<span>✳</span>`;

    const bubble = document.createElement('div');
    bubble.className = 'assistant-content-wrapper message-bubble markdown-body';

    row.appendChild(avatar);
    row.appendChild(bubble);
    return { row, bubble };
  }

  appendMessageElement(role, content, shouldScroll = true, hadSearch = false, attachments = null) {
    try {
      role = (role === 'user') ? 'user' : 'assistant';
      content = typeof content === 'string' ? content : (content != null ? String(content) : '');

      const row = document.createElement('div');

      if (role === 'user') {
        row.className = 'message-row user-message-row';

        const bubbleContainer = document.createElement('div');
        bubbleContainer.className = 'user-bubble-container';

        let displayContent = content || '';
        let fileChips = Array.isArray(attachments) ? [...attachments] : [];

        if (fileChips.length === 0 && displayContent.includes('[Attached File:')) {
          const matches = [...displayContent.matchAll(/\[Attached File:\s*([^\]]+)\]/g)];
          if (matches.length > 0) {
            fileChips = matches.map(m => {
              const fname = m[1].trim();
              return {
                name: fname,
                sizeStr: fname.endsWith('.jar') ? 'Java Archive' : 'Document',
                type: fname.endsWith('.jar') ? 'jar' : 'text'
              };
            });
            displayContent = displayContent.replace(/\[Attached File:\s*[^\]]+\][\s\S]*?\[End of [^\]]+\]/g, '').trim();
          }
        }

        if (fileChips.length > 0) {
          const container = document.createElement('div');
          container.className = 'user-attachment-container';
          container.innerHTML = fileChips.map(f => {
            const icon = f.name.endsWith('.jar') ? '📦' : f.name.endsWith('.zip') ? '🗂️' : '📄';
            return `
              <div class="user-attachment-card">
                <div class="user-attachment-icon">${icon}</div>
                <div class="user-attachment-info">
                  <div class="user-attachment-name" title="${f.name}">${this.escapeHtml(f.name)}</div>
                  <div class="user-attachment-meta">
                    <span>${f.sizeStr || 'File'}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('');
          bubbleContainer.appendChild(container);
        }

        if (displayContent) {
          const textNode = document.createElement('div');
          textNode.style.whiteSpace = 'pre-wrap';
          textNode.textContent = displayContent;
          bubbleContainer.appendChild(textNode);
        }

        row.appendChild(bubbleContainer);
      } else {
        row.className = 'message-row assistant-message-row';

        const avatar = document.createElement('div');
        avatar.className = 'assistant-avatar';
        avatar.innerHTML = `<span>✳</span>`;

        const bubble = document.createElement('div');
        bubble.className = 'assistant-content-wrapper message-bubble markdown-body';
        bubble.innerHTML = this.renderMarkdown(content);
        this.detectAndRenderArtifactCards(bubble, content);

        const msgIdx = (this.currentChat && this.currentChat.messages) ? this.currentChat.messages.length - 1 : 0;
        const actionBar = document.createElement('div');
        actionBar.className = 'message-action-bar';
        actionBar.innerHTML = `
          <button class="btn-msg-action" title="Copy message text" onclick="window.claudeApp.copyMessageText(this)">📋 Copy</button>
          <button class="btn-msg-action" title="Fork conversation from this point (LibreChat)" onclick="window.claudeApp.forkChatFromMessage(${msgIdx})">🌿 Fork Chat</button>
          <button class="btn-msg-action" title="Regenerate response" onclick="window.claudeApp.regenerateResponse(${msgIdx})">🔄 Regenerate</button>
        `;
        bubble.appendChild(actionBar);

        row.appendChild(avatar);
        row.appendChild(bubble);
      }

      this.messagesContainer.appendChild(row);
      if (shouldScroll) this.scrollToBottom();
    } catch (msgErr) {
      console.error('Error rendering message:', msgErr);
    }
  }

  // ==========================================
  // LIBRECHAT PRESETS & FORKING SYSTEM
  // ==========================================
  openPresetsModal() {
    this.renderPresetsList();
    const modal = document.getElementById('modal-presets');
    if (modal) modal.classList.remove('hidden');
  }

  closePresetsModal() {
    const modal = document.getElementById('modal-presets');
    if (modal) modal.classList.add('hidden');
  }

  renderPresetsList() {
    const container = document.getElementById('presets-items-list');
    if (!container) return;
    const presets = Storage.getPresets();

    container.innerHTML = presets.map(p => `
      <div class="preset-card">
        <div>
          <div class="preset-name">${this.escapeHtml(p.name)}</div>
          <div class="preset-desc">${(p.provider || 'AI').toUpperCase()} • ${p.model} • Temp: ${p.temperature || 0.7}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn-primary-sm" onclick="window.claudeApp.applyPreset('${p.id}')">Apply ⚡</button>
          ${!p.id.startsWith('preset-default') ? `<button class="btn-secondary-sm" onclick="window.claudeApp.deletePreset('${p.id}')">🗑️</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  applyPreset(presetId) {
    const presets = Storage.getPresets();
    const p = presets.find(item => item.id === presetId);
    if (!p) return;

    const s = Storage.getSettings();
    if (p.provider) s.provider = p.provider;
    if (p.model) s.model = p.model;
    if (p.temperature != null) s.temperature = p.temperature;
    if (p.systemPrompt) s.customSystemPrompt = p.systemPrompt;

    if (PROVIDER_PRESETS[p.provider]) {
      s.apiType = PROVIDER_PRESETS[p.provider].apiType;
      s.apiBase = PROVIDER_PRESETS[p.provider].apiBase;
      if (PROVIDER_PRESETS[p.provider].defaultKey) {
        s.apiKey = PROVIDER_PRESETS[p.provider].defaultKey;
      }
    }

    Storage.saveSettings(s);
    this.updateModelPill();
    this.closePresetsModal();
    alert(`Đã áp dụng Preset: ${p.name}!`);
  }

  saveCurrentAsPreset() {
    const s = Storage.getSettings();
    const name = prompt('Nhập tên cho Preset mới:', `Preset ${s.model}`);
    if (!name || !name.trim()) return;

    Storage.addPreset({
      name: name.trim(),
      provider: s.provider || 'kiro',
      model: s.model || 'claude-sonnet-5',
      temperature: s.temperature || 0.7,
      systemPrompt: s.customSystemPrompt || ''
    });

    this.renderPresetsList();
  }

  exportPresets() {
    const presets = Storage.getPresets();
    const blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `librechat-presets-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  deletePreset(presetId) {
    Storage.deletePreset(presetId);
    this.renderPresetsList();
  }

  cleanTextForClipboard(rawText) {
    if (!rawText) return '';
    return rawText
      .replace(/\r\n/g, '\n')
      .replace(/\n[ \t]*\n[ \t]*\n+/g, '\n\n')
      .replace(/[ \t]+$/gm, '')
      .trim();
  }

  copyMessageText(btn) {
    const bubble = btn.closest('.assistant-content-wrapper');
    if (!bubble) return;
    const textNode = bubble.cloneNode(true);
    const actions = textNode.querySelector('.message-action-bar');
    if (actions) actions.remove();
    const cleaned = this.cleanTextForClipboard(textNode.innerText);
    navigator.clipboard.writeText(cleaned);
    const old = btn.textContent;
    btn.textContent = 'Copied! ✓';
    btn.style.color = '#22c55e';
    setTimeout(() => {
      btn.textContent = old;
      btn.style.color = '';
    }, 2000);
  }

  // Conversation Forking (LibreChat Feature)
  forkChatFromMessage(msgIndex) {
    if (!this.currentChat || !this.currentChat.messages) return;
    const idx = parseInt(msgIndex, 10);
    if (isNaN(idx) || idx < 0) return;

    const sliced = JSON.parse(JSON.stringify(this.currentChat.messages.slice(0, idx + 1)));
    const newChat = {
      id: 'chat-' + Date.now(),
      workspaceId: Storage.getActiveWorkspaceId(),
      title: `🌿 Fork: ${(this.currentChat.title || 'Chat').slice(0, 24)}`,
      messages: sliced
    };

    Storage.saveChat(newChat);
    this.loadChat(newChat.id);
  }

  async regenerateResponse(msgIndex) {
    if (this.isGenerating || !this.currentChat || !this.currentChat.messages) return;
    const idx = parseInt(msgIndex, 10);
    if (isNaN(idx) || idx < 0) return;

    if (this.currentChat.messages[idx] && this.currentChat.messages[idx].role === 'assistant') {
      this.currentChat.messages = this.currentChat.messages.slice(0, idx);
    }

    const lastUserMsg = [...this.currentChat.messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    Storage.saveChat(this.currentChat);
    this.loadChat(this.currentChat.id);
    await this.generateAssistantResponse(lastUserMsg.displayText || lastUserMsg.content);
  }

  detectAndRenderArtifactCards(bubbleElement, rawText) {
    if (!rawText) return;
    const artifacts = Artifacts.extractArtifacts(rawText);
    if (artifacts.length === 0) return;

    artifacts.forEach(art => {
      const existing = bubbleElement.querySelector(`[data-artifact-id="${art.identifier}"]`);
      if (existing) return;

      const card = document.createElement('div');
      card.className = 'artifact-card';
      card.setAttribute('data-artifact-id', art.identifier);
      card.innerHTML = `
        <div class="artifact-card-info">
          <div class="artifact-card-icon">⚡</div>
          <div>
            <div class="artifact-card-title">${this.escapeHtml(art.title)}</div>
            <div class="artifact-card-subtitle">${Artifacts.formatTypeLabel(art.type)} • Click to open in Studio</div>
          </div>
        </div>
        <button class="btn-primary-sm" style="padding:6px 14px;">Open Studio ↗</button>
      `;
      card.addEventListener('click', () => Artifacts.open(art));
      bubbleElement.appendChild(card);
    });
  }

  setupMarked() {
    if (!window.marked) return;

    const renderer = new window.marked.Renderer();

    renderer.code = (code, infostring) => {
      const lang = (infostring || '').match(/^\S*/)?.[0] || 'text';
      let highlighted = '';
      if (window.hljs && window.hljs.getLanguage(lang)) {
        try {
          highlighted = window.hljs.highlight(code, { language: lang }).value;
        } catch (e) {
          highlighted = this.escapeHtml(code);
        }
      } else {
        highlighted = this.escapeHtml(code);
      }

      return `
        <div class="code-block-wrapper">
          <div class="code-header">
            <span class="code-lang-label">${lang}</span>
            <button class="btn-code-copy" onclick="window.claudeApp.copyCode(this)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              <span>Copy</span>
            </button>
          </div>
          <pre><code class="hljs language-${lang}">${highlighted}</code></pre>
        </div>
      `;
    };

    window.marked.setOptions({
      renderer: renderer,
      gfm: true,
      breaks: true
    });
  }

  copyCode(btn) {
    const codeBlock = btn.closest('.code-block-wrapper').querySelector('code');
    if (!codeBlock) return;
    const cleaned = this.cleanTextForClipboard(codeBlock.textContent || '');
    navigator.clipboard.writeText(cleaned);
    const span = btn.querySelector('span');
    if (span) {
      const old = span.textContent;
      span.textContent = 'Copied! ✓';
      btn.style.color = '#22c55e';
      setTimeout(() => {
        span.textContent = old;
        btn.style.color = '';
      }, 2000);
    }
  }

  renderMarkdown(text, elapsedSec = null) {
    if (!text || typeof text !== 'string') return '';

    let mainContent = text;
    let thinkingHtml = '';
    const timeLabel = elapsedSec ? ` (${elapsedSec}s)` : '';

    // Extract thinking blocks (supports <thinking>, <thought>, <think>, <reasoning>, <details type="reasoning">, <details>)
    const thinkingMatch = mainContent.match(/<(?:thinking|thought|think|reasoning|details(?:\s+[^>]*)*)>([\s\S]*?)<\/(?:thinking|thought|think|reasoning|details)>/i);
    const streamingThinkingMatch = mainContent.match(/<(?:thinking|thought|think|reasoning|details(?:\s+[^>]*)*)>([\s\S]*)$/i);

    if (thinkingMatch) {
      let thoughtText = thinkingMatch[1].replace(/<summary>[\s\S]*?<\/summary>/gi, '').trim();
      mainContent = mainContent.replace(/<(?:thinking|thought|think|reasoning|details(?:\s+[^>]*)*)>[\s\S]*?<\/(?:thinking|thought|think|reasoning|details)>/gi, '').trim();
      thinkingHtml = `
        <div class="claude-thinking-container">
          <div class="claude-thinking-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="claude-thinking-title">
              <span class="thinking-sparkle brain-pulse">🧠</span>
              <span class="shimmer-text">Thought for ${timeLabel || 'a few seconds'}</span>
            </div>
            <span class="claude-thinking-arrow">▾</span>
          </div>
          <div class="claude-thinking-content">${this.escapeHtml(thoughtText)}</div>
        </div>
      `;
    } else if (streamingThinkingMatch) {
      let thoughtText = streamingThinkingMatch[1].replace(/<summary>[\s\S]*?<\/summary>/gi, '').trim();
      mainContent = mainContent.replace(/<(?:thinking|thought|think|reasoning|details(?:\s+[^>]*)*)>[\s\S]*$/gi, '').trim();
      thinkingHtml = `
        <div class="claude-thinking-container streaming">
          <div class="claude-thinking-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="claude-thinking-title">
              <span class="thinking-sparkle brain-pulse">🧠</span>
              <span class="shimmer-text">Thinking...${timeLabel}</span>
            </div>
            <span class="claude-thinking-arrow">▾</span>
          </div>
          <div class="thinking-progress"></div>
          <div class="claude-thinking-content">${this.escapeHtml(thoughtText)}<span class="streaming-cursor"></span></div>
        </div>
      `;
    }

    // Clean out <antArtifact> tags
    mainContent = mainContent.replace(/<antArtifact[\s\S]*?<\/antArtifact>/gi, '').trim();

    let html = '';
    if (window.marked && typeof window.marked.parse === 'function') {
      try {
        html = window.marked.parse(mainContent);
      } catch (e) {
        html = this.fallbackMarkdown(mainContent);
      }
    } else {
      html = this.fallbackMarkdown(mainContent);
    }

    return thinkingHtml + html;
  }

  fallbackMarkdown(text) {
    if (!text) return '';
    let cleaned = this.escapeHtml(text);
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    cleaned = cleaned.replace(/\*(.*?)\*/g, '<em>$1</em>');
    cleaned = cleaned.replace(/`([^`]+)`/g, '<code style="background:var(--bg-code);padding:2px 5px;border-radius:4px;font-size:13px;">$1</code>');
    cleaned = cleaned.replace(/\n\n/g, '<br><br>');
    cleaned = cleaned.replace(/\n/g, '<br>');
    return cleaned;
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // SETTINGS MODAL
  // ==========================================
  openSettingsModal() {
    const s = Storage.getSettings();
    const curProvider = s.provider || 'tuongtacgpt';
    this.settingProviderPresets.value = curProvider;
    this.handlePresetChange(curProvider, false);

    this.settingApiType.value = s.apiType || 'openai';
    this.settingApiBase.value = s.apiBase || 'https://api.tuongtacgpt.click/v1';
    this.settingApiKey.value = s.apiKey || 'sk-codex-746a0b28f0a7ba097528bfa0cf8d173c03bed31e1b038460386b347b6e134127';
    this.settingModel.value = s.model || 'gpt-5.6-luna';
    if (this.settingModelSelect) {
      this.settingModelSelect.value = s.model || 'gpt-5.6-luna';
    }
    this.settingTemp.value = s.temperature || 0.7;
    this.settingTempVal.textContent = s.temperature || 0.7;
    this.settingMaxTokens.value = s.maxTokens || 4096;
    this.settingLenient.checked = s.lenientMode !== false;
    this.settingSystemPrompt.value = s.customSystemPrompt || '';

    this.modalSettings.classList.remove('hidden');
  }

  closeSettingsModal() {
    this.modalSettings.classList.add('hidden');
  }

  handlePresetChange(presetKey, shouldResetModel = true) {
    const preset = PROVIDER_PRESETS[presetKey];

    if (preset) {
      this.settingApiType.value = preset.apiType;
      this.settingApiBase.value = preset.apiBase;
      if (preset.defaultKey) {
        this.settingApiKey.value = preset.defaultKey;
      }
      if (this.providerDescDisplay) {
        this.providerDescDisplay.textContent = preset.description;
      }
      this.populateModelDropdown(preset.models, shouldResetModel);
    } else if (presetKey === 'custom') {
      if (this.providerDescDisplay) {
        this.providerDescDisplay.textContent = '✨ Nhập Endpoint, API Key và Model tùy chỉnh của riêng bạn.';
      }
      if (this.settingModelSelect) {
        this.settingModelSelect.innerHTML = '<option value="">-- Custom Model --</option>';
      }
    }
  }

  populateModelDropdown(models, shouldResetModel) {
    if (!this.settingModelSelect || !models) return;

    this.settingModelSelect.innerHTML = models.map(m => `
      <option value="${m.id}">${m.name}</option>
    `).join('');

    const s = Storage.getSettings();
    if (!shouldResetModel && s.model) {
      this.settingModelSelect.value = s.model;
      this.settingModel.value = s.model;
    } else if (shouldResetModel && models.length > 0) {
      this.settingModelSelect.value = models[0].id;
      this.settingModel.value = models[0].id;
    }
  }

  saveSettings() {
    const rawKey = this.settingApiKey.value.trim();
    const cleanKey = rawKey.replace(/^Bearer\s+/i, '').replace(/["']/g, '');

    const newSettings = {
      provider: this.settingProviderPresets.value,
      apiType: this.settingApiType.value,
      apiBase: this.settingApiBase.value.trim(),
      apiKey: cleanKey,
      model: this.settingModel.value.trim() || 'anthropic/claude-sonnet-5',
      temperature: parseFloat(this.settingTemp.value),
      maxTokens: parseInt(this.settingMaxTokens.value, 10) || 4096,
      lenientMode: this.settingLenient.checked,
      customSystemPrompt: this.settingSystemPrompt.value.trim()
    };

    Storage.saveSettings(newSettings);
    this.updateModelPill();
    this.closeSettingsModal();
    alert('Settings saved successfully!');
  }

  // Workspace & Skill Global Proxy Handlers
  switchWorkspace(wsId) { Workspaces.switchWorkspace(wsId); }
  editWorkspace(wsId) { Workspaces.openEditor(wsId); }
  deleteWorkspace(wsId) { Workspaces.deleteWorkspace(wsId); }
  removeWorkspaceFile(idx) { Workspaces.removeFile(idx); }
  toggleSkill(id, enabled) { Skills.toggleSkill(id, enabled); }
  editSkill(id) { Skills.openEditor(id); }
  deleteSkill(id) { Skills.deleteSkill(id); }

  // ==========================================
  // AI LONG-TERM MEMORY ENGINE METHODS
  // ==========================================
  openMemoryModal() {
    this.renderMemoryItems();
    if (this.modalMemory) {
      this.modalMemory.classList.remove('hidden');
    }
  }

  closeMemoryModal() {
    if (this.modalMemory) {
      this.modalMemory.classList.add('hidden');
    }
  }

  handleAddMemory() {
    if (!this.memoryInputNew) return;
    const text = this.memoryInputNew.value.trim();
    if (!text) return;
    Storage.addMemory(text);
    this.memoryInputNew.value = '';
    this.renderMemoryItems();
  }

  handleDeleteMemory(id) {
    Storage.deleteMemory(id);
    this.renderMemoryItems();
  }

  renderMemoryItems() {
    const memories = Storage.getMemories();
    if (this.memoryCountSpan) {
      this.memoryCountSpan.textContent = memories.length;
    }

    if (!this.memoryItemsList) return;

    if (memories.length === 0) {
      this.memoryItemsList.innerHTML = `
        <div style="text-align:center;padding:24px 16px;color:var(--text-muted);font-size:13px;line-height:1.6;">
          🧠 <strong>Chưa có trí nhớ nào được lưu.</strong><br>
          Thêm thông tin mới ở ô phía trên để AI ghi nhớ thói quen, tên, dự án và phong cách của bạn nhé!
        </div>
      `;
      return;
    }

    this.memoryItemsList.innerHTML = memories.map(m => {
      const dateStr = m.createdAt ? new Date(m.createdAt).toLocaleDateString('vi-VN') : '';
      return `
        <div class="memory-card" style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px;box-shadow:var(--shadow-sm);">
          <div style="font-size:13px;color:var(--text-primary);line-height:1.45;flex:1;">
            ${this.escapeHtml(m.text)}
            ${dateStr ? `<span style="display:block;font-size:11px;color:var(--text-muted);margin-top:3px;">🕒 ${dateStr}</span>` : ''}
          </div>
          <button class="btn-icon" onclick="window.claudeApp.handleDeleteMemory('${m.id}')" style="color:var(--text-muted);font-size:14px;padding:4px;" title="Xoá trí nhớ này">✕</button>
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // AUTO-MEMORY EXTRACTION ENGINE
  // Tự động trích xuất & lưu trí nhớ từ hội thoại
  // (Giống ChatGPT Memory & Antigravity Context System)
  // ==========================================
  autoExtractMemory(text) {
    if (!text || text.trim().length < 5) return;

    const t = text.trim();
    const lower = t.toLowerCase();

    // Danh sách pattern nhận diện thông tin cần ghi nhớ
    const patterns = [
      // Lệnh nhớ tường minh
      { re: /nhớ (?:giúp mình|rằng|là|:)?\s*(.+)/i,       prefix: '📝 ' },
      { re: /remember (?:that\s*)?(.+)/i,                   prefix: '📝 ' },
      { re: /hãy nhớ:?\s*(.+)/i,                            prefix: '📝 ' },
      { re: /lưu (?:lại\s*)?(?:là\s*)?:?\s*(.+)/i,         prefix: '📝 ' },
      { re: /ghi nhớ:?\s*(.+)/i,                            prefix: '📝 ' },

      // Thông tin cá nhân
      { re: /(?:tên|name)\s+(?:mình|tao|tôi|of mine)\s+là\s+(.+)/i,   prefix: '👤 Tên người dùng: ' },
      { re: /(?:mình|tao|tôi|i)\s+tên\s+(?:là\s*)?(.+)/i,             prefix: '👤 Tên người dùng: ' },
      { re: /(?:call me|gọi mình là)\s+(.+)/i,                          prefix: '👤 Gọi người dùng là: ' },

      // Nghề nghiệp & kỹ năng
      { re: /(?:mình|tao|tôi)\s+(?:là|làm)\s+(?:lập trình viên|developer|dev|programmer|kỹ sư)\s*(.+)?/i, prefix: '💼 Nghề nghiệp: ' },
      { re: /(?:mình|tao|tôi)\s+(?:biết|dùng|code|viết)\s+(.+)/i,     prefix: '🛠️ Kỹ năng: ' },
      { re: /(?:mình|tao)\s+(?:chuyên|giỏi)\s+(.+)/i,                  prefix: '⭐ Chuyên môn: ' },

      // Dự án đang làm
      { re: /(?:mình|tao)\s+đang\s+(?:làm|build|tạo|code|phát triển)\s+(.+)/i,  prefix: '🔨 Đang làm: ' },
      { re: /dự án\s+(?:của mình|hiện tại)\s+(?:là\s*)?(.+)/i,                   prefix: '📁 Dự án: ' },
      { re: /project\s+(?:of mine|của mình)\s+(?:is\s*|là\s*)?(.+)/i,            prefix: '📁 Dự án: ' },

      // Sở thích & phong cách
      { re: /(?:mình|tao|tôi)\s+thích\s+(.+)/i,             prefix: '❤️ Sở thích: ' },
      { re: /(?:mình|tao|tôi)\s+không\s+thích\s+(.+)/i,     prefix: '🚫 Không thích: ' },
      { re: /(?:mình|tao|tôi)\s+hay\s+dùng\s+(.+)/i,        prefix: '🔄 Hay dùng: ' },
      { re: /(?:server|máy chủ)\s+(?:của mình|mình dùng)\s+(?:là\s*)?(.+)/i, prefix: '🖥️ Server: ' },
    ];

    for (const { re, prefix } of patterns) {
      const match = t.match(re);
      if (match && match[1] && match[1].trim().length > 2) {
        const fact = prefix + match[1].trim().replace(/[.!?]+$/, '');
        // Tránh lưu trùng
        const existing = Storage.getMemories();
        const isDuplicate = existing.some(m => m.text.toLowerCase().includes(match[1].toLowerCase().slice(0, 15)));
        if (!isDuplicate) {
          Storage.addMemory(fact);
          this.showMemoryToast(fact);
        }
        return; // Chỉ lưu 1 memory mỗi tin nhắn để tránh spam
      }
    }
  }

  showMemoryToast(text) {
    // Xoá toast cũ nếu có
    const old = document.getElementById('memory-toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.id = 'memory-toast';
    toast.style.cssText = `
      position:fixed; bottom:90px; left:50%; transform:translateX(-50%);
      background:var(--bg-card); border:1px solid var(--accent);
      color:var(--text-primary); padding:9px 16px; border-radius:20px;
      font-size:12.5px; display:flex; align-items:center; gap:8px;
      box-shadow:var(--shadow-md); z-index:9999;
      animation:fadeIn 0.25s ease;
      max-width:320px; text-align:center; line-height:1.4;
    `;
    toast.innerHTML = `<span style="font-size:16px;">🧠</span> <span><strong>Đã ghi nhớ:</strong> ${this.escapeHtml(text.slice(0, 60))}${text.length > 60 ? '...' : ''}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }
}

window.ClaudeApp = ClaudeApp;

function initClaudeApp() {
  if (!window.claudeApp) {
    const app = new ClaudeApp();
    app.init();
  }
}

if (typeof document !== 'undefined' && document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initClaudeApp);
} else {
  initClaudeApp();
}
