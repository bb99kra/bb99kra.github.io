/**
 * CLAUDE AI - ARTIFACTS 2.0 STUDIO
 * Parses <antArtifact> tags, renders split-screen live preview & code views
 */

export const Artifacts = {
  currentArtifact: null,

  init() {
    this.panel = document.getElementById('artifact-panel');
    this.titleEl = document.getElementById('artifact-title');
    this.typeEl = document.getElementById('artifact-type');
    this.iframe = document.getElementById('artifact-iframe');
    this.codeView = document.getElementById('artifact-code-view');
    this.tabPreview = document.getElementById('tab-preview');
    this.tabCode = document.getElementById('tab-code');
    this.btnClose = document.getElementById('btn-close-artifact');
    this.btnCopy = document.getElementById('btn-copy-artifact');
    this.btnDownload = document.getElementById('btn-download-artifact');

    if (!this.panel) return;

    this.tabPreview.addEventListener('click', () => this.switchTab('preview'));
    this.tabCode.addEventListener('click', () => this.switchTab('code'));
    this.btnClose.addEventListener('click', () => this.close());
    
    if (this.btnCopy) {
      this.btnCopy.addEventListener('click', () => {
        if (this.currentArtifact) {
          navigator.clipboard.writeText(this.currentArtifact.content);
          this.btnCopy.innerHTML = '<span>✓ Copied</span>';
          setTimeout(() => {
            this.btnCopy.innerHTML = '<span>Copy</span>';
          }, 2000);
        }
      });
    }

    if (this.btnDownload) {
      this.btnDownload.addEventListener('click', () => {
        if (!this.currentArtifact) return;
        const blob = new Blob([this.currentArtifact.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = this.getFileExtension(this.currentArtifact.type);
        a.download = `${this.currentArtifact.title.replace(/\s+/g, '_').toLowerCase()}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  },

  getFileExtension(type) {
    if (type.includes('html')) return 'html';
    if (type.includes('svg')) return 'svg';
    if (type.includes('javascript') || type.includes('react')) return 'js';
    if (type.includes('python')) return 'py';
    if (type.includes('markdown')) return 'md';
    return 'txt';
  },

  /**
   * Parse text for <antArtifact> tags or markdown code blocks
   */
  extractArtifacts(text) {
    const artifacts = [];
    const regex = /<antArtifact\s+identifier="([^"]*)"\s+type="([^"]*)"\s+title="([^"]*)"[^>]*>([\s\S]*?)<\/antArtifact>/gi;
    let match;

    while ((match = regex.exec(text)) !== null) {
      artifacts.push({
        identifier: match[1] || 'artifact-' + Date.now(),
        type: match[2] || 'application/vnd.ant.code',
        title: match[3] || 'Interactive Artifact',
        content: match[4].trim()
      });
    }

    return artifacts;
  },

  /**
   * Open Artifact in Studio Panel
   */
  open(artifact) {
    this.currentArtifact = artifact;
    this.titleEl.textContent = artifact.title || 'Interactive Artifact';
    this.typeEl.textContent = this.formatTypeLabel(artifact.type);
    this.codeView.textContent = artifact.content;

    // Determine default tab based on whether it is executable/renderable
    const canRender = artifact.type.includes('html') || 
                      artifact.type.includes('svg') || 
                      artifact.content.includes('<html') || 
                      artifact.content.includes('<svg') ||
                      artifact.content.includes('<!DOCTYPE');

    if (canRender) {
      this.renderIframe(artifact.content);
      this.switchTab('preview');
      this.tabPreview.style.display = 'inline-block';
    } else {
      this.switchTab('code');
      this.tabPreview.style.display = 'none';
    }

    this.panel.classList.remove('hidden');
  },

  formatTypeLabel(type) {
    if (type.includes('html')) return 'HTML Preview';
    if (type.includes('svg')) return 'SVG Vector';
    if (type.includes('react')) return 'React';
    if (type.includes('code')) return 'Code';
    return 'Document';
  },

  renderIframe(content) {
    let fullHtml = content;
    if (!content.includes('<!DOCTYPE') && !content.includes('<html')) {
      // Wrap snippet in basic responsive canvas
      fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #1f1e1d; }
          </style>
        </head>
        <body>
          ${content}
        </body>
        </html>
      `;
    }

    const doc = this.iframe.contentWindow.document;
    doc.open();
    doc.write(fullHtml);
    doc.close();
  },

  switchTab(tab) {
    if (tab === 'preview') {
      this.tabPreview.classList.add('active');
      this.tabCode.classList.remove('active');
      this.iframe.style.display = 'block';
      this.codeView.style.display = 'none';
    } else {
      this.tabCode.classList.add('active');
      this.tabPreview.classList.remove('active');
      this.iframe.style.display = 'none';
      this.codeView.style.display = 'block';
    }
  },

  close() {
    this.panel.classList.add('hidden');
    this.currentArtifact = null;
  }
};
