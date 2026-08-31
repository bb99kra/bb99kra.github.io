/**
 * CLAUDE AI - SKILLS & EXTENSIONS SYSTEM
 * Manage built-in and custom skills that inject specialized tools and prompts
 */

const Skills = {
  currentEditSkillId: null,

  init(onSkillsChanged) {
    if (typeof document === 'undefined') return;
    this.onSkillsChanged = onSkillsChanged;
    this.btnNav = document.getElementById('nav-skills');
    this.modal = document.getElementById('modal-skills');
    this.listContainer = document.getElementById('skills-list');
    this.btnCreate = document.getElementById('btn-create-skill');
    this.btnClose = document.getElementById('btn-close-skills');
    this.btnSave = document.getElementById('btn-save-skill');

    // Skill Editor Inputs
    this.inputName = document.getElementById('skill-input-name');
    this.inputIcon = document.getElementById('skill-input-icon');
    this.inputDesc = document.getElementById('skill-input-desc');
    this.inputInstructions = document.getElementById('skill-input-instructions');

    if (this.btnNav) {
      this.btnNav.addEventListener('click', () => this.openModal());
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
  },

  openModal() {
    this.renderSkillsList();
    this.modal.classList.remove('hidden');
  },

  closeModal() {
    this.modal.classList.add('hidden');
    this.resetEditor();
  },

  renderSkillsList() {
    const list = Storage.getSkills();

    this.listContainer.innerHTML = list.map(skill => `
      <div class="skill-card-item" data-id="${skill.id}">
        <div class="skill-info">
          <span class="skill-icon">${skill.icon || '⚡'}</span>
          <div>
            <div class="skill-name">
              ${skill.name}
              ${skill.builtin ? '<span style="font-size:10px;background:var(--accent-light);color:var(--accent);padding:1px 6px;border-radius:8px;margin-left:6px;">BUILTIN</span>' : ''}
            </div>
            <div class="skill-desc">${skill.description || 'Custom Claude tool capability'}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          ${!skill.builtin ? `
            <button class="btn-icon" title="Edit" onclick="window.claudeApp.editSkill('${skill.id}')">✏️</button>
            <button class="btn-icon" title="Delete" onclick="window.claudeApp.deleteSkill('${skill.id}')">🗑️</button>
          ` : ''}
          <label class="switch">
            <input type="checkbox" ${skill.enabled ? 'checked' : ''} onchange="window.claudeApp.toggleSkill('${skill.id}', this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `).join('');
  },

  openEditor(skillId) {
    this.currentEditSkillId = skillId;
    const editorSec = document.getElementById('skill-editor-section');
    editorSec.style.display = 'block';

    if (skillId) {
      const list = Storage.getSkills();
      const skill = list.find(s => s.id === skillId);
      if (skill) {
        this.inputName.value = skill.name;
        this.inputIcon.value = skill.icon || '⚡';
        this.inputDesc.value = skill.description || '';
        this.inputInstructions.value = skill.instructions || '';
      }
    } else {
      this.inputName.value = 'New Custom Skill';
      this.inputIcon.value = '⚡';
      this.inputDesc.value = '';
      this.inputInstructions.value = '';
    }
  },

  resetEditor() {
    const editorSec = document.getElementById('skill-editor-section');
    if (editorSec) editorSec.style.display = 'none';
    this.currentEditSkillId = null;
  },

  saveCurrentEditor() {
    const name = this.inputName.value.trim();
    if (!name) return alert('Please provide a skill name!');

    const list = Storage.getSkills();
    const skillData = {
      id: this.currentEditSkillId || 'skill-' + Date.now(),
      name: name,
      icon: this.inputIcon.value.trim() || '⚡',
      description: this.inputDesc.value.trim(),
      instructions: this.inputInstructions.value.trim(),
      enabled: true,
      builtin: false
    };

    if (this.currentEditSkillId) {
      const idx = list.findIndex(s => s.id === this.currentEditSkillId);
      if (idx >= 0) list[idx] = { ...list[idx], ...skillData };
    } else {
      list.push(skillData);
    }

    Storage.saveSkills(list);
    this.resetEditor();
    this.renderSkillsList();
    if (this.onSkillsChanged) this.onSkillsChanged();
  },

  toggleSkill(skillId, enabled) {
    const list = Storage.getSkills();
    const skill = list.find(s => s.id === skillId);
    if (skill) {
      skill.enabled = enabled;
      Storage.saveSkills(list);
      if (this.onSkillsChanged) this.onSkillsChanged();
    }
  },

  deleteSkill(skillId) {
    if (!confirm('Are you sure you want to delete this custom skill?')) return;
    let list = Storage.getSkills().filter(s => s.id !== skillId);
    Storage.saveSkills(list);
    this.renderSkillsList();
    if (this.onSkillsChanged) this.onSkillsChanged();
  }
};

window.Skills = Skills;
