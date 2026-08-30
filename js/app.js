/**
 * CLAUDE AI - CORE APPLICATION CONTROLLER
 */

import { Storage } from './storage.js';
import { Api } from './api.js';
import { Artifacts } from './artifacts.js';
import { Workspaces } from './workspaces.js';
import { Skills } from './skills.js';

class ClaudeApp {
  constructor() {
    this.currentChat = null;
    this.isGenerating = false;
    this.abortController = null;
    this.webSearchActive = false;
    this.pendingAttachments = [];
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
    this.settingTemp = document.getElementById('setting-temperature');
    this.settingTempVal = document.getElementById('temp-value-display');
    this.settingMaxTokens = document.getElementById('setting-max-tokens');
    this.settingLenient = document.getElementById('setting-lenient-mode');
    this.settingSystemPrompt = document.getElementById('setting-system-prompt');
    this.settingProviderPresets = document.getElementById('setting-provider-presets');

    // 4. Bind Global Handlers
    this.bindEvents();

    // 5. Apply Theme
    this.applyTheme(Storage.getTheme());

    // 6. Load Chats & Active Chat
    this.renderChatHistory();
    const activeChatId = Storage.getActiveChatId();
    if (activeChatId) {
      this.loadChat(activeChatId);
    } else {
      this.showWelcome();
    }

    // 7. Update Model Pill
    this.updateModelPill();
    this.updateSkillsBadge();

    // 8. Auto-prompt for API Key if empty
    const settings = Storage.getSettings();
    if (!settings.apiKey) {
      setTimeout(() => this.openSettingsModal(), 600);
    }
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

    // Model Pill Click -> Opens Settings
    this.btnModelPill.addEventListener('click', () => this.openSettingsModal());

    // Settings Modal
    this.btnSettings.addEventListener('click', () => this.openSettingsModal());
    this.btnCloseSettings.addEventListener('click', () => this.closeSettingsModal());
    this.btnSaveSettings.addEventListener('click', () => this.saveSettings());

    // Settings Provider Preset Change
    this.settingProviderPresets.addEventListener('change', (e) => this.handlePresetChange(e.target.value));

    // Temperature Display Sync
    this.settingTemp.addEventListener('input', () => {
      this.settingTempVal.textContent = this.settingTemp.value;
    });

    // File Attachments
    if (this.btnAttach && this.attachmentInput) {
      this.btnAttach.addEventListener('click', () => this.attachmentInput.click());
      this.attachmentInput.addEventListener('change', (e) => this.handleAttachmentUpload(e));
    }

    // Suggestion Cards on Welcome Screen
    document.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        if (prompt) {
          this.textarea.value = prompt;
          this.textarea.dispatchEvent(new Event('input'));
          this.textarea.focus();
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
    const modelName = s.model ? s.model.split('/').pop() : 'Claude 3.7';
    document.getElementById('current-model-name').textContent = modelName;
  }

  updateSkillsBadge() {
    const skills = Storage.getSkills();
    const enabledCount = skills.filter(s => s.enabled).length;
    const badge = document.getElementById('skills-count-badge');
    if (badge) badge.textContent = `${enabledCount} active`;
  }

  onWorkspaceChanged() {
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
      this.appendMessageElement(msg.role, msg.content, false, msg.searchResults);
    });

    this.renderChatHistory();
    this.scrollToBottom();
  }

  renderChatHistory() {
    const chats = Storage.getChats();
    const activeWs = Storage.getActiveWorkspaceId();
    const activeChatId = Storage.getActiveChatId();

    // Filter chats by active workspace
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

  handleAttachmentUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (event) => {
        this.pendingAttachments.push({
          name: file.name,
          content: event.target.result
        });
        this.renderAttachmentPreviews();
        this.btnSend.disabled = false;
      };
      reader.readAsText(file);
    }
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
        <button style="border:none;background:transparent;cursor:pointer;color:var(--text-muted);" onclick="window.claudeApp.removeAttachment(${idx})">✕</button>
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

    // Combine attachments into prompt if present
    let fullUserContent = text;
    if (this.pendingAttachments.length > 0) {
      const attachBlock = this.pendingAttachments.map(a => `\n[Attached File: ${a.name}]\n${a.content}\n[End of ${a.name}]`).join('\n');
      fullUserContent = fullUserContent ? `${fullUserContent}\n\n${attachBlock}` : attachBlock;
    }

    this.hideWelcome();

    // Create chat if doesn't exist
    if (!this.currentChat) {
      this.currentChat = {
        id: 'chat-' + Date.now(),
        workspaceId: Storage.getActiveWorkspaceId(),
        title: text.slice(0, 32) || 'Code Discussion',
        messages: []
      };
    }

    // Append User Message to UI
    this.appendMessageElement('user', fullUserContent, true);

    // Save to currentChat
    this.currentChat.messages.push({
      role: 'user',
      content: fullUserContent,
      timestamp: Date.now()
    });
    Storage.saveChat(this.currentChat);
    Storage.setActiveChatId(this.currentChat.id);
    this.renderChatHistory();

    // Reset Composer
    this.textarea.value = '';
    this.textarea.style.height = 'auto';
    this.pendingAttachments = [];
    this.renderAttachmentPreviews();
    this.btnSend.disabled = true;

    // Start Assistant Streaming Response
    await this.generateAssistantResponse(text);
  }

  async generateAssistantResponse(userPrompt) {
    this.isGenerating = true;
    this.btnSend.disabled = false;
    this.btnSend.innerHTML = '<span>■</span>'; // Stop icon

    const settings = Storage.getSettings();
    const workspace = Storage.getActiveWorkspace();
    const skills = Storage.getSkills();

    // 1. Live Web Search Step (if toggled on)
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

    // 2. Create Assistant Placeholder Row
    const { row, bubble } = this.createAssistantMessageRow();
    this.messagesContainer.appendChild(row);
    this.scrollToBottom();

    let fullAssistantText = '';

    await Api.streamChat(
      this.currentChat.messages,
      settings,
      workspace,
      skills,
      searchResults,
      (chunk, accumulated) => {
        fullAssistantText = accumulated;
        bubble.innerHTML = this.renderMarkdown(accumulated);
        this.detectAndRenderArtifactCards(bubble, accumulated);
        this.scrollToBottom();
      },
      (finalText) => {
        this.isGenerating = false;
        this.btnSend.innerHTML = '<span>↑</span>';
        this.btnSend.disabled = false;

        // Save assistant message to chat
        this.currentChat.messages.push({
          role: 'assistant',
          content: finalText,
          searchResults: searchResults ? true : false,
          timestamp: Date.now()
        });
        Storage.saveChat(this.currentChat);

        // Check if there are any artifacts and auto open the first one
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

  appendMessageElement(role, content, shouldScroll = true, hadSearch = false) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;

    if (role === 'user') {
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.textContent = content;
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
      // Check if artifact card already exists
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

  renderMarkdown(text) {
    // Hide raw <antArtifact> tags in the chat stream display
    let cleaned = text.replace(/<antArtifact[\s\S]*?<\/antArtifact>/gi, '');

    // Convert markdown code blocks
    cleaned = cleaned.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const safeCode = this.escapeHtml(code.trim());
      const safeLang = lang || 'code';
      return `
        <pre><div class="code-header"><span>${safeLang}</span><button class="btn-code-copy" onclick="navigator.clipboard.writeText(this.closest('pre').querySelector('code').textContent)">Copy</button></div><code>${safeCode}</code></pre>
      `;
    });

    // Inline formatting
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
    this.settingApiType.value = s.apiType || 'openai';
    this.settingApiBase.value = s.apiBase || 'https://openrouter.ai/api/v1';
    this.settingApiKey.value = s.apiKey || '';
    this.settingModel.value = s.model || 'anthropic/claude-3.7-sonnet';
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

  handlePresetChange(preset) {
    switch (preset) {
      case 'anthropic':
        this.settingApiType.value = 'anthropic';
        this.settingApiBase.value = 'https://api.anthropic.com/v1/messages';
        this.settingModel.value = 'claude-3-7-sonnet-20250219';
        break;
      case 'openrouter':
        this.settingApiType.value = 'openai';
        this.settingApiBase.value = 'https://openrouter.ai/api/v1';
        this.settingModel.value = 'anthropic/claude-3.7-sonnet';
        break;
      case 'deepseek':
        this.settingApiType.value = 'openai';
        this.settingApiBase.value = 'https://api.deepseek.com/v1';
        this.settingModel.value = 'deepseek-chat';
        break;
      case 'groq':
        this.settingApiType.value = 'openai';
        this.settingApiBase.value = 'https://api.groq.com/openai/v1';
        this.settingModel.value = 'llama-3.3-70b-versatile';
        break;
      case 'openai':
        this.settingApiType.value = 'openai';
        this.settingApiBase.value = 'https://api.openai.com/v1';
        this.settingModel.value = 'gpt-4o';
        break;
      case 'ollama':
        this.settingApiType.value = 'openai';
        this.settingApiBase.value = 'http://localhost:11434/v1';
        this.settingModel.value = 'llama3.2';
        break;
    }
  }

  saveSettings() {
    const newSettings = {
      apiType: this.settingApiType.value,
      apiBase: this.settingApiBase.value.trim(),
      apiKey: this.settingApiKey.value.trim(),
      model: this.settingModel.value.trim(),
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
