/**
 * CLAUDE AI - ARTIFACTS 2.0 STUDIO
 * Parses <antArtifact> tags, renders split-screen live preview & code views
 */

const Artifacts = {
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
    this.btnDownloadZip = document.getElementById('btn-download-project-zip');

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

    if (this.btnDownloadZip) {
      this.btnDownloadZip.addEventListener('click', async () => {
        if (!window.JSZip) return alert('JSZip library is loading, please try again.');
        const zip = new JSZip();
        const ws = (window.claudeApp && window.claudeApp.storage) ? window.claudeApp.storage.getActiveWorkspace() : null;
        
        // Add all files in workspace to zip
        if (ws && ws.files && ws.files.length > 0) {
          ws.files.forEach(f => {
            zip.file(f.name, f.content);
          });
        }
        
        // Also add current artifact if present
        if (this.currentArtifact) {
          const parsedFiles = this.parseMarkdownFiles(this.currentArtifact.content);
          if (parsedFiles.length > 0) {
            parsedFiles.forEach(pf => {
              zip.file(pf.path, pf.content);
              if (window.claudeApp && window.claudeApp.storage) {
                window.claudeApp.storage.addFileToActiveWorkspace(pf.path, pf.content);
              }
            });
            if (window.claudeApp) {
              window.claudeApp.updateTopWorkspaceDisplay();
            }
          } else {
            const ext = this.getFileExtension(this.currentArtifact.type);
            const fname = `${this.currentArtifact.title.replace(/\s+/g, '_')}.${ext}`;
            zip.file(fname, this.currentArtifact.content);
          }
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(ws ? ws.name : 'Project').replace(/\s+/g, '_')}-Clean.zip`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  },

  parseMarkdownFiles(content) {
    const files = [];
    if (!content) return files;
    const fileBlockRegex = /(?:#{1,6}\s*[`'"]?([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)[`'"]?|(?:File|Tập tin):\s*[`'"]?([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)[`'"]?)\s*\n+```[a-zA-Z0-9_-]*\n([\s\S]*?)```/gi;
    let match;
    const addedPaths = new Set();

    while ((match = fileBlockRegex.exec(content)) !== null) {
      const rawPath = (match[1] || match[2] || '').trim();
      const code = match[3];
      if (rawPath && code !== undefined) {
        const cleanPath = rawPath.replace(/^\.?\/+/, '');
        files.push({ path: cleanPath, content: code });
        addedPaths.add(cleanPath);
      }
    }

    if (files.length === 0) {
      const inlineCommentRegex = /```([a-zA-Z0-9_-]*)\n(?:\/\/|#)\s*(?:File:)?\s*([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)\n([\s\S]*?)```/gi;
      let inlineMatch;
      while ((inlineMatch = inlineCommentRegex.exec(content)) !== null) {
        const cleanPath = inlineMatch[2].trim().replace(/^\.?\/+/, '');
        if (!addedPaths.has(cleanPath)) {
          files.push({ path: cleanPath, content: inlineMatch[3] });
          addedPaths.add(cleanPath);
        }
      }
    }

    return files;
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
    if (!text) return [];
    const artifacts = [];

    // 1. Match full <antArtifact ...>...</antArtifact>
    const regex = /<antArtifact(?:\s+identifier="([^"]*)")?(?:\s+type="([^"]*)")?(?:\s+title="([^"]*)")?[^>]*>([\s\S]*?)<\/antArtifact>/gi;
    let match;

    while ((match = regex.exec(text)) !== null) {
      artifacts.push({
        identifier: match[1] || 'artifact-' + Date.now(),
        type: match[2] || 'application/vnd.ant.code',
        title: match[3] || 'Interactive Artifact',
        content: match[4].trim()
      });
    }

    // 2. Also match fallback artifact tags without quotes or partial
    if (artifacts.length === 0) {
      const fallbackRegex = /<antArtifact[^>]*>([\s\S]*?)<\/antArtifact>/gi;
      let fbMatch;
      while ((fbMatch = fallbackRegex.exec(text)) !== null) {
        artifacts.push({
          identifier: 'artifact-' + Date.now(),
          type: 'application/vnd.ant.code',
          title: 'Project Artifact',
          content: fbMatch[1].trim()
        });
      }
    }

    // 3. If user asked to decompile/build and AI emitted a large Java block, auto-detect as Artifact if no tag was emitted!
    if (artifacts.length === 0 && (text.includes('public class ') || text.includes('<project xmlns="http://maven.apache.org'))) {
      const codeBlockMatch = text.match(/```(?:java|xml|yml)?\n([\s\S]{300,})```/);
      if (codeBlockMatch) {
        artifacts.push({
          identifier: 'auto-code-' + Date.now(),
          type: 'application/vnd.ant.code',
          title: text.includes('<project') ? 'Maven pom.xml' : 'Rebuilt Source Code',
          content: codeBlockMatch[1].trim()
        });
      }
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

window.Artifacts = Artifacts;
