/**
 * CLAUDE AI - CORE APPLICATION CONTROLLER
 * Full 2026 Generation (Claude 5, GPT-5.6, DeepSeek V4, Gemini 3.7)
 */

import { Storage, PROVIDER_PRESETS } from './storage.js';
import { Api } from './api.js';
import { Artifacts } from './artifacts.js';
import { Workspaces } from './workspaces.js';
import { Skills } from './skills.js';
import { JavaClassDisassembler } from './decompiler.js';

class ClaudeApp {
  constructor() {
    this.currentChat = null;
    this.isGenerating = false;
    this.abortController = null;
    this.webSearchActive = false;
    this.pendingAttachments = [];
    this.activePickerProvider = 'openrouter';
  }

  init() {
    // 1. Initialize Sub-modules
    Artifacts.init();
    Workspaces.init(() => this.onWorkspaceChanged());
    Skills.init(() => this.updateSkillsBadge());

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

    // 5. Bind Global Handlers
    this.bindEvents();

    // 6. Apply Theme
    this.applyTheme(Storage.getTheme());

    // 7. Load Chats & Active Chat
    this.renderChatHistory();
    const activeChatId = Storage.getActiveChatId();
    if (activeChatId) {
      this.loadChat(activeChatId);
    } else {
      this.showWelcome();
    }

    // 8. Update Model Pill & Workspace Name
    this.updateModelPill();
    this.updateSkillsBadge();
    this.updateTopWorkspaceDisplay();
  }

  bindEvents() {
    // New Chat
    this.btnNewChat.addEventListener('click', () => this.startNewChat());

    // Textarea input & Auto-resize
    this.textarea.addEventListener('input', () => {
      this.textarea.style.height = 'auto';
      this.textarea.style.height = Math.min(this.textarea.scrollHeight, 200) + 'px';
      this.btnSend.disabled = !this.textarea.value.trim() && this.pendingAttachments.length === 0;
    });

    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!this.btnSend.disabled && !this.isGenerating) {
          this.handleSendMessage();
        }
      }
    });

    // Send Button
    this.btnSend.addEventListener('click', () => {
      if (this.isGenerating) {
        this.stopGeneration();
      } else {
        this.handleSendMessage();
      }
    });

    // Web Search Toggle Button
    this.btnWebSearch.addEventListener('click', () => {
      this.webSearchActive = !this.webSearchActive;
      this.btnWebSearch.classList.toggle('active', this.webSearchActive);
      this.btnWebSearch.innerHTML = this.webSearchActive 
        ? '<span>🌐 Search: ON</span>' 
        : '<span>🌐 Search</span>';
    });

    // Sidebar Toggle
    if (this.btnToggleSidebar) {
      this.btnToggleSidebar.addEventListener('click', () => {
        this.sidebar.classList.toggle('collapsed');
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

    // Top Model Pill Click -> Opens Interactive Model Picker Modal!
    this.btnModelPill.addEventListener('click', () => {
      this.openModelPickerModal();
    });

    // Close Model Picker Modal
    if (this.btnCloseModelPicker) {
      this.btnCloseModelPicker.addEventListener('click', () => this.closeModelPickerModal());
    }

    // Apply Custom Model from Picker
    if (this.pickerBtnApplyCustom) {
      this.pickerBtnApplyCustom.addEventListener('click', () => {
        const val = this.pickerCustomInput.value.trim();
        if (val) {
          this.selectModel(val);
        } else {
          alert('Vui lòng nhập Model ID!');
        }
      });
    }

    // Settings Modal
    this.btnSettings.addEventListener('click', () => this.openSettingsModal());
    this.btnCloseSettings.addEventListener('click', () => this.closeSettingsModal());
    this.btnSaveSettings.addEventListener('click', () => this.saveSettings());

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

    // 1-Click Fast Setup Kiro 9AWS (Claude 5)
    const btnKiroSetup = document.getElementById('btn-quick-setup-kiro');
    if (btnKiroSetup) {
      btnKiroSetup.addEventListener('click', () => {
        const kiroSettings = {
          provider: 'kiro',
          apiType: 'openai',
          apiBase: 'https://api.9aws.net/v1',
          apiKey: 'sk-dea3df6c5ec71a59120fe17480c2660624b2672fb220c6614531b1843fc26a6e',
          model: 'claude-sonnet-5',
          temperature: 0.7,
          maxTokens: 4096,
          lenientMode: true,
          customSystemPrompt: ''
        };
        Storage.saveSettings(kiroSettings);
        this.openSettingsModal();
        this.updateModelPill();
        alert('Đã thiết lập thành công Kiro-Go 9AWS với Model Claude Sonnet 5 (1000 Credits)! Bạn có thể đóng cài đặt và bắt đầu chat!');
      });
    }

    // Check Credit Button
    const btnCheckCredit = document.getElementById('btn-check-credit');
    if (btnCheckCredit) {
      btnCheckCredit.addEventListener('click', async () => {
        const s = Storage.getSettings();
        const key = s.apiKey || 'sk-dea3df6c5ec71a59120fe17480c2660624b2672fb220c6614531b1843fc26a6e';
        btnCheckCredit.textContent = '⏳...';
        try {
          const res = await fetch('https://api.9aws.net/v1/key/info', {
            headers: { 'Authorization': `Bearer ${key}` }
          });
          if (res.ok) {
            const data = await res.json();
            const remain = (data.creditLimit - (data.creditsUsed || 0)).toFixed(1);
            const dateStr = data.expiresAt ? new Date(data.expiresAt * 1000).toLocaleString('vi-VN') : '31/08/2026';
            alert(
              `📊 THÔNG TIN TÀI KHOẢN KIRO 9AWS:\n\n` +
              `• Trạng thái Key: ${data.valid ? '✅ Hợp lệ (Active)' : '❌ Không hợp lệ'}\n` +
              `• Số Credits Còn Lại: ${remain} / ${data.creditLimit} Credits\n` +
              `• Tổng Tokens Đã Dùng: ${Number(data.tokensUsed || 0).toLocaleString()}\n` +
              `• Số Yêu Cầu Đã Gửi: ${data.requestsCount || 0} lượt\n` +
              `• Hạn Sử Dụng: ${dateStr}\n\n` +
              `💡 Lưu ý: Nếu pool báo "No available accounts", hệ thống đang nạp tài khoản upstream (mất ~10 phút) và không bị trừ credit!`
            );
          } else {
            window.open('https://api.9aws.net/check', '_blank');
          }
        } catch (e) {
          window.open('https://api.9aws.net/check', '_blank');
        } finally {
          btnCheckCredit.textContent = '📊 Check';
        }
      });
    }

    // Auto-detect provider when typing or pasting API Key
    if (this.settingApiKey) {
      this.settingApiKey.addEventListener('input', (e) => {
        const val = e.target.value.trim().replace(/^Bearer\s+/i, '');
        if (val.startsWith('sk-dea') && this.settingProviderPresets.value !== 'kiro') {
          this.settingProviderPresets.value = 'kiro';
          this.handlePresetChange('kiro', true);
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
    this.activePickerProvider = providerKey || s.provider || 'openrouter';
    this.renderPickerTabs();
    this.renderPickerModels();
    this.pickerCustomInput.value = s.model || 'anthropic/claude-sonnet-5';
    this.modalModelPicker.classList.remove('hidden');
  }

  closeModelPickerModal() {
    if (this.modalModelPicker) {
      this.modalModelPicker.classList.add('hidden');
    }
  }

  renderPickerTabs() {
    const providers = [
      { key: 'kiro', name: '🔥 Kiro 9AWS (Claude 5)' },
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

    // Alert toast notification
    const modelShort = modelId.split('/').pop();
    console.log(`Đã chuyển sang model: ${modelId}`);
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
    this.welcomeContainer.style.display = 'block';
  }

  hideWelcome() {
    this.welcomeContainer.style.display = 'none';
  }

  loadChat(chatId) {
    const chat = Storage.getChat(chatId);
    if (!chat) return this.startNewChat();

    this.currentChat = chat;
    Storage.setActiveChatId(chat.id);
    this.hideWelcome();
    this.messagesContainer.innerHTML = '';

    (chat.messages || []).forEach(msg => {
      this.appendMessageElement(msg.role, msg.displayText || msg.content, false, msg.searchResults, msg.attachments);
    });

    this.renderChatHistory();
    this.scrollToBottom();
  }

  renderChatHistory() {
    const chats = Storage.getChats();
    const activeWs = Storage.getActiveWorkspaceId();
    const activeChatId = Storage.getActiveChatId();

    const wsChats = chats.filter(c => !c.workspaceId || c.workspaceId === activeWs);

    if (wsChats.length === 0) {
      this.historyContainer.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:12px 10px;">No chats in this workspace yet.</div>';
      return;
    }

    this.historyContainer.innerHTML = wsChats.map(c => `
      <div class="history-item ${c.id === activeChatId ? 'active' : ''}" onclick="window.claudeApp.loadChat('${c.id}')">
        <span class="history-title">${this.escapeHtml(c.title || 'New Conversation')}</span>
        <div class="history-actions" onclick="event.stopPropagation()">
          <button class="btn-icon" title="Delete" onclick="window.claudeApp.deleteChat('${c.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  deleteChat(chatId) {
    Storage.deleteChat(chatId);
    if (this.currentChat && this.currentChat.id === chatId) {
      this.startNewChat();
    } else {
      this.renderChatHistory();
    }
  }

  async handleAttachmentUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      const fileName = file.name;
      const lowerName = fileName.toLowerCase();

      // Check if file is a .jar or .zip archive (Minecraft plugin / zip)
      if (lowerName.endsWith('.jar') || lowerName.endsWith('.zip')) {
        try {
          if (window.JSZip) {
            const zip = await JSZip.loadAsync(file);
            const entryNames = Object.keys(zip.files);

            // Extract plugin.yml if present (Spigot / Paper / Bungee)
            let pluginYml = '';
            const pluginFile = zip.file(/^(plugin|bungee|velocity-plugin)\.(yml|json)$/i)[0];
            if (pluginFile) {
              pluginYml = await pluginFile.async('string');
            }

            // Extract config.yml or messages.yml if present
            let configYml = '';
            const configFile = zip.file(/^(config|messages|settings)\.yml$/i)[0];
            if (configFile) {
              configYml = await configFile.async('string');
            }

            // Filter class files (skip anonymous inner classes for cleaner decompile)
            const classFiles = entryNames.filter(n => n.endsWith('.class') && !n.includes('$'));
            const resourceFiles = entryNames.filter(n => !n.endsWith('.class') && !n.endsWith('/'));

            // Decompile top key classes using JavaClassDisassembler
            const decompiledClasses = [];
            let mainClassPath = '';
            if (pluginYml) {
              const mainMatch = pluginYml.match(/main:\s*([a-zA-Z0-9_.]+)/);
              if (mainMatch) {
                mainClassPath = mainMatch[1].replace(/\./g, '/') + '.class';
              }
            }

            const priorityClasses = classFiles.sort((a, b) => {
              if (a === mainClassPath) return -1;
              if (b === mainClassPath) return 1;
              const aIsKey = a.toLowerCase().includes('listener') || a.toLowerCase().includes('command') || a.toLowerCase().includes('main');
              const bIsKey = b.toLowerCase().includes('listener') || b.toLowerCase().includes('command') || b.toLowerCase().includes('main');
              if (aIsKey && !bIsKey) return -1;
              if (!aIsKey && bIsKey) return 1;
              return 0;
            }).slice(0, 15);

            for (const classPath of priorityClasses) {
              try {
                const classData = await zip.file(classPath).async('arraybuffer');
                const parsed = JavaClassDisassembler.parse(classData);
                if (parsed) {
                  const javaSource = JavaClassDisassembler.toJavaSource(parsed);
                  const simpleName = classPath.split('/').pop().replace('.class', '');
                  decompiledClasses.push({
                    path: classPath,
                    source: javaSource
                  });
                  // Save decompiled Java file directly into active Workspace
                  Storage.addFileToActiveWorkspace(`${fileName}/${simpleName}.java`, javaSource);
                }
              } catch (errClass) {
                console.warn('Decompile error for', classPath, errClass);
              }
            }

            let jarSummary = `[Minecraft Plugin / Java Archive: ${fileName} - Dung lượng: ${(file.size / 1024).toFixed(1)} KB]\n`;
            if (pluginYml) {
              jarSummary += `\n--- plugin.yml ---\n${pluginYml.slice(0, 3000)}\n--- End of plugin.yml ---\n`;
              Storage.addFileToActiveWorkspace(`${fileName}/plugin.yml`, pluginYml);
            }
            if (configYml) {
              jarSummary += `\n--- config.yml Preview ---\n${configYml.slice(0, 2000)}\n--- End of config.yml ---\n`;
              Storage.addFileToActiveWorkspace(`${fileName}/config.yml`, configYml);
            }

            if (decompiledClasses.length > 0) {
              jarSummary += `\n--- MÃ NGUỒN JAVA ĐÃ DỊCH NGƯỢC (${decompiledClasses.length} class cốt lõi đã nạp vào Workspace) ---\n`;
              decompiledClasses.forEach(dc => {
                jarSummary += `\n// File: ${dc.path}\n${dc.source}\n`;
              });
              jarSummary += `\n--- HẾT MÃ NGUỒN DỊCH NGƯỢC ---\n`;
            }

            jarSummary += `\n--- Danh sách Classes trong JAR (${classFiles.length} file .class) ---\n${classFiles.slice(0, 40).join('\n')}`;
            if (classFiles.length > 40) {
              jarSummary += `\n... và ${classFiles.length - 40} class khác.`;
            }

            this.updateTopWorkspaceDisplay();

            this.pendingAttachments.push({
              name: fileName,
              size: file.size,
              sizeStr: (file.size / 1024).toFixed(1) + ' KB',
              type: 'jar',
              content: jarSummary
            });
          } else {
            this.pendingAttachments.push({
              name: fileName,
              size: file.size,
              sizeStr: (file.size / 1024).toFixed(1) + ' KB',
              type: 'jar',
              content: `[File .jar: ${fileName} - ${(file.size / 1024).toFixed(1)} KB]`
            });
          }
        } catch (err) {
          console.error('Error parsing jar:', err);
          this.pendingAttachments.push({
            name: fileName,
            size: file.size,
            sizeStr: (file.size / 1024).toFixed(1) + ' KB',
            type: 'jar',
            content: `[File .jar: ${fileName} - ${(file.size / 1024).toFixed(1)} KB (Parse error: ${err.message})]`
          });
        }
      } else {
        // Regular text file (.java, .yml, .json, .txt, .xml, .md, .log, etc.)
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.pendingAttachments.push({
              name: fileName,
              size: file.size,
              sizeStr: (file.size / 1024).toFixed(1) + ' KB',
              type: 'text',
              content: event.target.result
            });
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
    this.attachmentsPreview.innerHTML = this.pendingAttachments.map((att, idx) => `
      <div style="display:flex;align-items:center;gap:6px;background:var(--bg-main);border:1px solid var(--border-subtle);padding:4px 8px;border-radius:8px;font-size:12px;">
        <span>📄 ${att.name}</span>
        <button style="border:none;background:transparent;cursor:color:var(--text-muted);" onclick="window.claudeApp.removeAttachment(${idx})">✕</button>
      </div>
    `).join('');
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
      const attachBlock = attachmentsCopy.map(a => `\n[Attached File: ${a.name}]\n${a.content}\n[End of ${a.name}]`).join('\n');
      fullUserContent = fullUserContent ? `${fullUserContent}\n\n${attachBlock}` : attachBlock;
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
    this.btnSend.disabled = true;

    await this.generateAssistantResponse(text);
  }

  async generateAssistantResponse(userPrompt) {
    this.isGenerating = true;
    this.btnSend.disabled = false;
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

    // 1. Immediately show live Thinking accordion upon send like Claude.ai
    bubble.innerHTML = `
      <div class="claude-thinking-container">
        <div class="claude-thinking-header" onclick="this.parentElement.classList.toggle('collapsed')">
          <div class="claude-thinking-title">
            <span class="thinking-sparkle">💭</span>
            <span>Thinking...</span>
          </div>
          <span class="claude-thinking-arrow">▾</span>
        </div>
        <div class="claude-thinking-content">Đang phân tích dữ liệu, bóc tách cấu trúc và lập luận...<span class="streaming-cursor"></span></div>
      </div>
    `;

    let fullAssistantText = '';

    await Api.streamChat(
      this.currentChat.messages,
      settings,
      workspace,
      skills,
      searchResults,
      (chunk, accumulated) => {
        fullAssistantText = accumulated;
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

        if (accumulated.includes('<thinking>')) {
          bubble.innerHTML = this.renderMarkdown(accumulated, elapsedSec);
        } else {
          const thinkingBox = `
            <div class="claude-thinking-container collapsed">
              <div class="claude-thinking-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <div class="claude-thinking-title">
                  <span class="thinking-sparkle" style="animation:none;opacity:0.8;">💭</span>
                  <span>Thought for ${elapsedSec}s</span>
                </div>
                <span class="claude-thinking-arrow">▾</span>
              </div>
              <div class="claude-thinking-content">✓ Đã phân tích kiến trúc, đối chiếu tập tin dự án và hoàn tất xử lý logic trong ${elapsedSec} giây.</div>
            </div>
          `;
          bubble.innerHTML = thinkingBox + this.renderMarkdown(accumulated, elapsedSec);
        }
        this.detectAndRenderArtifactCards(bubble, accumulated);
        this.scrollToBottom();
      },
      (finalText) => {
        this.isGenerating = false;
        this.btnSend.innerHTML = '<span>↑</span>';
        this.btnSend.disabled = false;

        const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);
        let storedText = finalText;
        if (!finalText.includes('<thinking>')) {
          storedText = `<thinking>\n✓ Đã phân tích cấu trúc, đối chiếu dữ liệu dự án và hoàn tất xử lý trong ${totalSec}s.\n</thinking>\n\n` + finalText;
        }

        bubble.innerHTML = this.renderMarkdown(storedText, totalSec);

        this.currentChat.messages.push({
          role: 'assistant',
          content: storedText,
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
        this.btnSend.disabled = false;
        bubble.innerHTML += `<div style="color:#d9534f;margin-top:8px;font-size:13.5px;padding:8px 12px;background:rgba(217,83,79,0.1);border-radius:8px;">⚠️ ${this.escapeHtml(error.message)}</div>`;
        this.scrollToBottom();
      }
    );
  }

  stopGeneration() {
    this.isGenerating = false;
    this.btnSend.innerHTML = '<span>↑</span>';
  }

  createSearchStatusElement(query) {
    const el = document.createElement('div');
    el.className = 'message-row';
    el.style.padding = '6px 24px';
    el.innerHTML = `
      <div class="search-badge">
        <span class="brand-star">✳</span>
        <span>Searching live web for: <strong>${this.escapeHtml(query.slice(0, 50))}</strong>...</span>
      </div>
    `;
    return el;
  }

  createAssistantMessageRow() {
    const row = document.createElement('div');
    row.className = 'message-row assistant';

    const avatar = document.createElement('div');
    avatar.className = 'assistant-avatar';
    avatar.innerHTML = `<span style="font-size:18px;line-height:1;">✳</span>`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble markdown-body';
    bubble.innerHTML = '<span style="opacity:0.5;">Claude is thinking...</span>';

    row.appendChild(avatar);
    row.appendChild(bubble);
    return { row, bubble };
  }

  appendMessageElement(role, content, shouldScroll = true, hadSearch = false, attachments = null) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;

    if (role === 'user') {
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';

      let displayContent = content || '';
      let fileChips = attachments ? [...attachments] : [];

      // If loaded from history without explicit attachments array, extract attached file names
      if (fileChips.length === 0 && displayContent.includes('[Attached File:')) {
        const matches = [...displayContent.matchAll(/\[Attached File:\s*([^\]]+)\]/g)];
        if (matches.length > 0) {
          fileChips = matches.map(m => {
            const fname = m[1].trim();
            return {
              name: fname,
              sizeStr: fname.endsWith('.jar') ? 'Java Archive (Decompiled)' : 'Document',
              type: fname.endsWith('.jar') ? 'jar' : 'text'
            };
          });
          displayContent = displayContent.replace(/\[Attached File:\s*[^\]]+\][\s\S]*?\[End of [^\]]+\]/g, '').trim();
        }
      }

      // Render sleek attachment chips like Claude.ai
      if (fileChips.length > 0) {
        const container = document.createElement('div');
        container.className = 'user-attachment-container';
        container.innerHTML = fileChips.map(f => {
          const icon = f.name.endsWith('.jar') ? '📦' : f.name.endsWith('.zip') ? '🗂️' : '📄';
          const badge = f.name.endsWith('.jar') ? '<span class="user-attachment-badge">Decompiled</span>' : '';
          return `
            <div class="user-attachment-card">
              <div class="user-attachment-icon">${icon}</div>
              <div class="user-attachment-info">
                <div class="user-attachment-name" title="${f.name}">${this.escapeHtml(f.name)}</div>
                <div class="user-attachment-meta">
                  <span>${f.sizeStr || 'File'}</span>
                  ${badge}
                </div>
              </div>
            </div>
          `;
        }).join('');
        bubble.appendChild(container);
      }

      // Render the prompt text
      if (displayContent) {
        const textNode = document.createElement('div');
        textNode.style.whiteSpace = 'pre-wrap';
        textNode.textContent = displayContent;
        bubble.appendChild(textNode);
      }

      row.appendChild(bubble);
    } else {
      const avatar = document.createElement('div');
      avatar.className = 'assistant-avatar';
      avatar.innerHTML = `<span style="font-size:18px;line-height:1;">✳</span>`;

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble markdown-body';
      bubble.innerHTML = this.renderMarkdown(content);
      this.detectAndRenderArtifactCards(bubble, content);

      row.appendChild(avatar);
      row.appendChild(bubble);
    }

    this.messagesContainer.appendChild(row);
    if (shouldScroll) this.scrollToBottom();
  }

  detectAndRenderArtifactCards(bubbleElement, rawText) {
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
        <button class="btn-primary" style="padding:6px 12px;font-size:12px;">Open Studio ↗</button>
      `;
      card.addEventListener('click', () => Artifacts.open(art));
      bubbleElement.appendChild(card);
    });
  }

  renderMarkdown(text, elapsedSec = null) {
    let cleaned = text.replace(/<antArtifact[\s\S]*?<\/antArtifact>/gi, '');

    const timeLabel = elapsedSec ? ` (${elapsedSec}s)` : '';

    // Claude Thinking Accordion Container (Closed tag - collapsed by default like Claude.ai)
    cleaned = cleaned.replace(/<thinking>([\s\S]*?)<\/thinking>/gi, (match, thought) => {
      return `
        <div class="claude-thinking-container collapsed">
          <div class="claude-thinking-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="claude-thinking-title">
              <span class="thinking-sparkle" style="animation:none;opacity:0.8;">💭</span>
              <span>Thinking Process${timeLabel}</span>
            </div>
            <span class="claude-thinking-arrow">▾</span>
          </div>
          <div class="claude-thinking-content">${this.escapeHtml(thought.trim())}</div>
        </div>
      `;
    });

    // Claude Thinking while actively streaming (Unclosed tag - open while streaming)
    cleaned = cleaned.replace(/<thinking>([\s\S]*)$/gi, (match, thought) => {
      return `
        <div class="claude-thinking-container">
          <div class="claude-thinking-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="claude-thinking-title">
              <span class="thinking-sparkle">💭</span>
              <span>Thinking...${timeLabel}</span>
            </div>
            <span class="claude-thinking-arrow">▾</span>
          </div>
          <div class="claude-thinking-content">${this.escapeHtml(thought.trim())}<span class="streaming-cursor"></span></div>
        </div>
      `;
    });

    // Also support <thought>...</thought>
    cleaned = cleaned.replace(/<thought>([\s\S]*?)<\/thought>/gi, (match, thought) => {
      return `
        <div class="claude-thinking-container collapsed">
          <div class="claude-thinking-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="claude-thinking-title">
              <span class="thinking-sparkle" style="animation:none;opacity:0.8;">💭</span>
              <span>Thought${timeLabel}</span>
            </div>
            <span class="claude-thinking-arrow">▾</span>
          </div>
          <div class="claude-thinking-content">${this.escapeHtml(thought.trim())}</div>
        </div>
      `;
    });

    // Code blocks with syntax copy button
    cleaned = cleaned.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const safeCode = this.escapeHtml(code.trim());
      const safeLang = lang || 'code';
      return `
        <pre><div class="code-header"><span>${safeLang}</span><button class="btn-code-copy" onclick="navigator.clipboard.writeText(this.closest('pre').querySelector('code').textContent)">Copy</button></div><code>${safeCode}</code></pre>
      `;
    });

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
}

// Instantiate and attach to window
window.addEventListener('DOMContentLoaded', () => {
  window.claudeApp = new ClaudeApp();
  window.claudeApp.init();
});
