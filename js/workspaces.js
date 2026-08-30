/**
 * CLAUDE AI - WORKSPACE / PROJECTS MANAGER
 * Allows creating projects with custom system prompts and uploaded knowledge files
 */

import { Storage } from './storage.js';

export const Workspaces = {
  currentModalWorkspaceId: null,

  init(onWorkspaceChanged) {
    this.onWorkspaceChanged = onWorkspaceChanged;
    this.badgeBtn = document.getElementById('btn-workspace-badge');
    this.modal = document.getElementById('modal-workspaces');
    this.listContainer = document.getElementById('workspaces-list');
    this.btnCreate = document.getElementById('btn-create-workspace');
    this.btnClose = document.getElementById('btn-close-workspaces');
    this.btnSave = document.getElementById('btn-save-workspace');

    // Workspace Editor inputs
    this.inputName = document.getElementById('ws-input-name');
    this.inputIcon = document.getElementById('ws-input-icon');
    this.inputDesc = document.getElementById('ws-input-desc');
    this.inputInstructions = document.getElementById('ws-input-instructions');
    this.filesListContainer = document.getElementById('ws-files-list');
    this.fileUploadInput = document.getElementById('ws-file-upload');

    if (this.badgeBtn) {
      this.badgeBtn.addEventListener('click', () => this.openModal());
    }

    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.closeModal());
    }

    if (this.btnCreate) {
      this.btnCreate.addEventListener('click', () => this.openEditor(null));
    }

    if (this.btnSave) {
      this.btnSave.addEventListener('click', () => this.saveCurrentEditor());
    }

    if (this.fileUploadInput) {
      this.fileUploadInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    this.updateBadge();
  },

  updateBadge() {
    const active = Storage.getActiveWorkspace();
    if (this.badgeBtn && active) {
      this.badgeBtn.innerHTML = `
        <span style="display:flex;align-items:center;gap:6px;">
          <span>${active.icon || '📁'}</span>
          <span style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${active.name}</span>
        </span>
        <span style="font-size:10px;opacity:0.7;">SWITCH ▾</span>
      `;
    }
  },

  openModal() {
    this.renderWorkspacesList();
    this.modal.classList.remove('hidden');
  },

  closeModal() {
    this.modal.classList.add('hidden');
    this.resetEditor();
  },

  renderWorkspacesList() {
    const list = Storage.getWorkspaces();
    const activeId = Storage.getActiveWorkspaceId();

    this.listContainer.innerHTML = list.map(ws => `
      <div class="skill-card-item ${ws.id === activeId ? 'active' : ''}" style="cursor:pointer;" data-id="${ws.id}">
        <div class="skill-info" onclick="window.claudeApp.switchWorkspace('${ws.id}')">
          <span class="skill-icon">${ws.icon || '📁'}</span>
          <div>
            <div class="skill-name">${ws.name} ${ws.id === activeId ? '<span style="font-size:11px;color:var(--accent);font-weight:normal;">(Active)</span>' : ''}</div>
            <div class="skill-desc">${ws.description || 'No description'} • ${ws.files ? ws.files.length : 0} files</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn-icon" title="Edit Workspace" onclick="window.claudeApp.editWorkspace('${ws.id}')">✏️</button>
          ${ws.id !== 'ws-default' ? `<button class="btn-icon" title="Delete" onclick="window.claudeApp.deleteWorkspace('${ws.id}')">🗑️</button>` : ''}
        </div>
      </div>
    `).join('');
  },

  openEditor(wsId) {
    this.currentModalWorkspaceId = wsId;
    const editorSec = document.getElementById('ws-editor-section');
    editorSec.style.display = 'block';

    if (wsId) {
      const list = Storage.getWorkspaces();
      const ws = list.find(w => w.id === wsId);
      if (ws) {
        this.inputName.value = ws.name;
        this.inputIcon.value = ws.icon || '📁';
        this.inputDesc.value = ws.description || '';
        this.inputInstructions.value = ws.instructions || '';
        this.renderFilesList(ws.files || []);
      }
    } else {
      this.inputName.value = 'New Project';
      this.inputIcon.value = '📁';
      this.inputDesc.value = '';
      this.inputInstructions.value = '';
      this.renderFilesList([]);
    }
  },

  resetEditor() {
    const editorSec = document.getElementById('ws-editor-section');
    if (editorSec) editorSec.style.display = 'none';
    this.currentModalWorkspaceId = null;
  },

  renderFilesList(files) {
    this.currentFiles = [...files];
    if (this.currentFiles.length === 0) {
      this.filesListContainer.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:6px 0;">No knowledge files uploaded yet.</div>';
      return;
    }

    this.filesListContainer.innerHTML = this.currentFiles.map((f, idx) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--bg-main);border-radius:6px;margin-bottom:4px;font-size:12.5px;">
        <span>📄 ${f.name} <span style="color:var(--text-muted);font-size:11px;">(${Math.round(f.content.length / 1024 * 10) / 10} KB)</span></span>
        <button class="btn-icon" onclick="window.claudeApp.removeWorkspaceFile(${idx})" style="padding:2px;">✕</button>
      </div>
    `).join('');
  },

  handleFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        this.currentFiles.push({
          name: file.name,
          content: content
        });
        this.renderFilesList(this.currentFiles);
      };
      reader.readAsText(file);
    }
  },

  removeFile(index) {
    if (this.currentFiles && this.currentFiles[index]) {
      this.currentFiles.splice(index, 1);
      this.renderFilesList(this.currentFiles);
    }
  },

  saveCurrentEditor() {
    const name = this.inputName.value.trim();
    if (!name) return alert('Please enter a workspace name!');

    const list = Storage.getWorkspaces();
    const wsData = {
      id: this.currentModalWorkspaceId || 'ws-' + Date.now(),
      name: name,
      icon: this.inputIcon.value.trim() || '📁',
      description: this.inputDesc.value.trim(),
      instructions: this.inputInstructions.value.trim(),
      files: this.currentFiles || []
    };

    if (this.currentModalWorkspaceId) {
      const idx = list.findIndex(w => w.id === this.currentModalWorkspaceId);
      if (idx >= 0) list[idx] = wsData;
    } else {
      list.push(wsData);
      Storage.setActiveWorkspaceId(wsData.id);
    }

    Storage.saveWorkspaces(list);
    this.resetEditor();
    this.renderWorkspacesList();
    this.updateBadge();
    if (this.onWorkspaceChanged) this.onWorkspaceChanged();
  },

  deleteWorkspace(wsId) {
    if (wsId === 'ws-default') return alert('Cannot delete default workspace!');
    if (!confirm('Are you sure you want to delete this workspace?')) return;

    let list = Storage.getWorkspaces().filter(w => w.id !== wsId);
    Storage.saveWorkspaces(list);

    if (Storage.getActiveWorkspaceId() === wsId) {
      Storage.setActiveWorkspaceId('ws-default');
    }

    this.renderWorkspacesList();
    this.updateBadge();
    if (this.onWorkspaceChanged) this.onWorkspaceChanged();
  },

  switchWorkspace(wsId) {
    Storage.setActiveWorkspaceId(wsId);
    this.updateBadge();
    this.closeModal();
    if (this.onWorkspaceChanged) this.onWorkspaceChanged();
  }
};
