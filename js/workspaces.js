/**
 * CLAUDE AI - WORKSPACE / PROJECTS MANAGER
 * Allows creating projects with custom system prompts and uploaded knowledge files
 */

const Workspaces = {
  currentModalWorkspaceId: null,

  init(onWorkspaceChanged) {
    if (typeof document === 'undefined') return;
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

    const btnFetchUrl = document.getElementById('btn-ws-fetch-url');
    const inputUrl = document.getElementById('ws-url-input');
    if (btnFetchUrl && inputUrl) {
      btnFetchUrl.addEventListener('click', () => {
        const url = inputUrl.value.trim();
        if (url) {
          this.addFileFromUrl(url);
          inputUrl.value = '';
        }
      });
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
        <span style="cursor:pointer;color:var(--text-primary);display:flex;align-items:center;gap:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" onclick="window.claudeApp.openFileInStudio(${idx})" title="Click to view in Studio">
          📄 <strong style="text-decoration:underline;">${f.name}</strong> 
          <span style="color:var(--text-muted);font-size:11px;">(${Math.round(f.content.length / 1024 * 10) / 10} KB)</span>
        </span>
        <div style="display:flex;gap:4px;">
          <button class="btn-secondary" onclick="window.claudeApp.openFileInStudio(${idx})" style="padding:2px 6px;font-size:11px;">View</button>
          <button class="btn-icon" onclick="window.claudeApp.removeWorkspaceFile(${idx})" style="padding:2px;">✕</button>
        </div>
      </div>
    `).join('');
  },

  isSourceFile(filename) {
    const fn = (filename || '').toLowerCase();
    if (fn.includes('.git/') || fn.includes('.idea/') || fn.includes('/target/') || fn.includes('/build/') || fn.includes('__macosx')) return false;
    if (fn.endsWith('.class') || fn.endsWith('.png') || fn.endsWith('.jpg') || fn.endsWith('.jpeg') || 
        fn.endsWith('.gif') || fn.endsWith('.ico') || fn.endsWith('.exe') || fn.endsWith('.dll') || 
        fn.endsWith('.so') || fn.endsWith('.dylib') || fn.endsWith('.pdf')) return false;
    return true;
  },

  syncActiveWorkspaceFiles() {
    this.currentFiles = this.currentFiles || [];
    this.renderFilesList(this.currentFiles);
    const list = Storage.getWorkspaces();
    const activeId = Storage.getActiveWorkspaceId();
    let active = list.find(w => w.id === activeId) || list[0];
    if (active) {
      active.files = this.currentFiles;
      Storage.saveWorkspaces(list);
      if (this.onWorkspaceChanged) this.onWorkspaceChanged();
    }
  },

  async handleFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    this.currentFiles = this.currentFiles || [];

    for (const file of files) {
      const fn = file.name.toLowerCase();
      if ((fn.endsWith('.zip') || fn.endsWith('.jar')) && window.JSZip) {
        try {
          const zip = await JSZip.loadAsync(file);
          const entries = Object.keys(zip.files).filter(n => !zip.files[n].dir);
          const textExts = ['.yml', '.yaml', '.json', '.xml', '.txt', '.md', '.properties', '.toml', '.conf', '.java', '.py', '.js', '.ts', '.kt', '.cs', '.gradle'];
          let addedCount = 0;
          for (const ePath of entries) {
            if (addedCount >= 40) break;
            if (this.isSourceFile(ePath) && textExts.some(ext => ePath.toLowerCase().endsWith(ext))) {
              try {
                const textContent = await zip.file(ePath).async('string');
                const baseName = ePath.split('/').pop();
                const existingIdx = this.currentFiles.findIndex(f => f.name === baseName);
                if (existingIdx >= 0) {
                  this.currentFiles[existingIdx].content = textContent;
                } else {
                  this.currentFiles.push({ name: baseName, content: textContent });
                  addedCount++;
                }
              } catch (e) {}
            }
          }
          alert(`✅ Đã giải nén tự động ${addedCount} file nguồn từ ${file.name} vào Workspace!`);
        } catch (e) {
          console.error('JSZip extraction error:', e);
        }
      } else {
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target.result;
            const existingIdx = this.currentFiles.findIndex(f => f.name === file.name);
            if (existingIdx >= 0) {
              this.currentFiles[existingIdx].content = content;
            } else {
              this.currentFiles.push({ name: file.name, content: content });
            }
            resolve();
          };
          reader.readAsText(file);
        });
      }
    }
    this.syncActiveWorkspaceFiles();
    event.target.value = '';
  },

  async addFileFromUrl(url) {
    if (!url) return;
    try {
      const cleanUrl = url.trim();
      const filename = cleanUrl.split('/').pop().split('?')[0] || 'remote_file.txt';
      let content = '';

      const res = await fetch(cleanUrl);
      if (res.ok) {
        content = await res.text();
      } else {
        const jinaRes = await fetch(`https://r.jina.ai/${cleanUrl}`);
        if (jinaRes.ok) {
          content = await jinaRes.text();
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      }

      this.currentFiles = this.currentFiles || [];
      const existingIdx = this.currentFiles.findIndex(f => f.name === filename);
      if (existingIdx >= 0) {
        this.currentFiles[existingIdx].content = content;
      } else {
        this.currentFiles.push({ name: filename, content: content });
      }
      this.syncActiveWorkspaceFiles();
      alert(`✅ Đã nạp thành công file [${filename}] từ URL vào Workspace!`);
    } catch (e) {
      alert(`❌ Không thể nạp file từ URL (${e.message}). Vui lòng tải file về máy và upload trực tiếp!`);
    }
  },

  removeFile(index) {
    if (this.currentFiles && this.currentFiles[index]) {
      this.currentFiles.splice(index, 1);
      this.syncActiveWorkspaceFiles();
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

window.Workspaces = Workspaces;
