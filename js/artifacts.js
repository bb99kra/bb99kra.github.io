/**
 * CLAUDE AI - ARTIFACTS 2.0 STUDIO
 * Parses <antArtifact> tags, renders split-screen live preview & code views
 */

const Artifacts = {
  currentArtifact: null,

  init() {
    if (typeof document === 'undefined') return;
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
          const cleaned = (this.currentArtifact.content || '')
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]+$/gm, '')
            .trim();
          navigator.clipboard.writeText(cleaned);
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

  async downloadProjectAsJar(customName = null) {
    if (!window.JSZip) return alert('JSZip library is loading, please try again.');
    const zip = new JSZip();
    const storageObj = window.Storage || (window.claudeApp ? window.claudeApp.storage : null);
    const ws = storageObj ? storageObj.getActiveWorkspace() : null;
    let jarName = customName || ((ws ? ws.name : 'PurePlugin') + '-1.0.0.jar').replace(/\s+/g, '_');
    if (!jarName.endsWith('.jar')) jarName += '.jar';

    const packedFiles = new Map(); // path -> content

    // 1. Collect files from Active Workspace
    if (ws && ws.files && ws.files.length > 0) {
      ws.files.forEach(f => {
        if (f.name && f.content) {
          packedFiles.set(f.name, f.content);
        }
      });
    }

    // 2. Collect files from Current Active Artifact
    if (this.currentArtifact && this.currentArtifact.content) {
      const artFiles = this.parseMarkdownFiles(this.currentArtifact.content);
      artFiles.forEach(af => packedFiles.set(af.path, af.content));
    }

    // 3. Scan Current Chat Messages for all Java code, XML, YAML blocks emitted by AI
    if (window.claudeApp && window.claudeApp.currentChat && window.claudeApp.currentChat.messages) {
      window.claudeApp.currentChat.messages.forEach(msg => {
        if (msg.role === 'assistant' && msg.content) {
          const raw = msg.content;
          
          // Match all code blocks: ```java ... ```, ```xml ... ```, ```yaml ... ```, ```yml ... ```
          const codeBlockRegex = /```(?:([a-zA-Z0-9_-]+)(?::([^\n\r]+))?)?\n([\s\S]*?)```/g;
          let cbMatch;
          while ((cbMatch = codeBlockRegex.exec(raw)) !== null) {
            const lang = (cbMatch[1] || '').toLowerCase();
            const tagPath = (cbMatch[2] || '').trim();
            const code = cbMatch[3].trim();

            if (lang === 'java' || (!lang && code.includes('public class '))) {
              // Extract package and class name
              const pkgMatch = code.match(/package\s+([a-zA-Z0-9_.]+);/);
              const clsMatch = code.match(/public\s+(?:class|interface|enum)\s+([a-zA-Z0-9_]+)/);
              const pkg = pkgMatch ? pkgMatch[1].replace(/\./g, '/') : '';
              const cls = clsMatch ? clsMatch[1] : ('Class_' + (packedFiles.size + 1));
              const filePath = tagPath || (pkg ? `${pkg}/${cls}.java` : `${cls}.java`);
              packedFiles.set(filePath, code);
              packedFiles.set(`src/main/java/${filePath}`, code);
            } else if (lang === 'xml' || code.includes('<project xmlns="http://maven.apache.org')) {
              packedFiles.set(tagPath || 'pom.xml', code);
            } else if (lang === 'yml' || lang === 'yaml' || code.includes('main:') || code.includes('version:')) {
              const fileName = tagPath || (code.includes('main:') && code.includes('version:') ? 'plugin.yml' : 'config.yml');
              packedFiles.set(fileName, code);
              packedFiles.set(`src/main/resources/${fileName}`, code);
            }
          }
        }
      });
    }

    // 4. Ensure plugin.yml exists
    let hasPluginYml = false;
    for (const path of packedFiles.keys()) {
      if (path.toLowerCase().endsWith('plugin.yml')) {
        hasPluginYml = true;
        break;
      }
    }

    if (!hasPluginYml) {
      const defaultPluginYml = `name: PurePlugin\nversion: 1.0.0\nmain: vn.nguyendz.purespeed.PureSpeedPlugin\napi-version: '1.20'\nauthor: Nguyendzvn\ndescription: Standalone Offline Ready Plugin`;
      packedFiles.set('plugin.yml', defaultPluginYml);
      packedFiles.set('src/main/resources/plugin.yml', defaultPluginYml);
    }

    // 5. Add all files to the ZIP/JAR archive
    packedFiles.forEach((content, filePath) => {
      zip.file(filePath, content);
      // Also sync back to workspace so it stays preserved
      if (storageObj) {
        storageObj.addFileToActiveWorkspace(filePath, content);
      }
    });

    if (window.claudeApp) {
      window.claudeApp.updateTopWorkspaceDisplay();
    }

    // 6. Generate and trigger download
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = jarName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },

  async uploadAndGetDirectLink(customName = null) {
    if (!window.JSZip) return alert('JSZip is loading, please try again.');
    const ws = (window.claudeApp && window.claudeApp.storage) ? window.claudeApp.storage.getActiveWorkspace() : (window.Storage ? window.Storage.getActiveWorkspace() : null);
    let jarName = customName || ((ws ? ws.name : 'PurePlugin') + '-1.0.0.jar').replace(/\s+/g, '_');
    if (!jarName.endsWith('.jar')) jarName += '.jar';

    const zip = new JSZip();
    let hasPluginYml = false;
    if (ws && ws.files && ws.files.length > 0) {
      ws.files.forEach(f => {
        if (f.name.endsWith('plugin.yml')) hasPluginYml = true;
        zip.file(f.name.replace(/^src\/main\/resources\//, ''), f.content);
      });
    }

    if (!hasPluginYml) {
      zip.file('plugin.yml', `name: PurePlugin\nversion: 1.0.0\nmain: vn.nguyendz.purespeed.PureSpeedPlugin\napi-version: '1.20'\nauthor: Nguyendzvn\ndescription: Standalone Offline Ready Plugin`);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const formData = new FormData();
    formData.append('file', blob, jarName);

    try {
      const res = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data && data.data && data.data.url) {
        const directUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        prompt('🔗 Link tải trực tiếp file .jar từ internet (Bấm Copy):', directUrl);
        return directUrl;
      }
    } catch (e) {
      alert('Không thể tạo link public, tải file qua trình duyệt!');
      this.downloadProjectAsJar(customName);
    }
  },

  async uploadAndGetPublicUrl(customName = null) {
    const storageObj = window.Storage || (window.claudeApp ? window.claudeApp.storage : (typeof Storage !== 'undefined' ? Storage : null));
    const ws = storageObj ? storageObj.getActiveWorkspace() : null;

    // 1. Try real Linux Cloud VM Maven Build with OpenJDK 17
    if (window.CloudVM && ws && ws.files && ws.files.length > 0 && ws.files.some(f => f.name.endsWith('pom.xml') || f.name.endsWith('.java'))) {
      try {
        console.log('⚡ Triggering Real Linux Maven Build on Cloud VM...');
        const vmUrl = await window.CloudVM.buildAndUploadJar(ws.files);
        if (vmUrl) return vmUrl;
      } catch (vmErr) {
        console.warn('Cloud VM build fallback to local packager:', vmErr);
      }
    }

    // 2. Fallback to in-browser packager
    const JSZipClass = window.JSZip || (typeof JSZip !== 'undefined' ? JSZip : null);
    if (!JSZipClass) {
      console.warn('JSZip library not available!');
      return null;
    }
    try {
      let jarName = customName || ((ws ? ws.name : 'PurePlugin') + '-1.0.0.jar').replace(/\s+/g, '_');
      if (!jarName.endsWith('.jar')) jarName += '.jar';

      const zip = new JSZipClass();
      let hasPluginYml = false;
      if (ws && ws.files && ws.files.length > 0) {
        ws.files.forEach(f => {
          if (f.name.endsWith('plugin.yml')) hasPluginYml = true;
          zip.file(f.name.replace(/^src\/main\/resources\//, ''), f.content);
        });
      }

      if (!hasPluginYml) {
        zip.file('plugin.yml', `name: PurePlugin\nversion: 1.0.0\nmain: vn.nguyendz.purespeed.PureSpeedPlugin\napi-version: '1.20'\nauthor: Nguyendzvn\ndescription: Standalone Offline Ready Plugin`);
      }

      const uint8 = await zip.generateAsync({ type: 'uint8array' });
      const BlobClass = window.Blob || (typeof Blob !== 'undefined' ? Blob : globalThis.Blob);
      const FormDataClass = window.FormData || (typeof FormData !== 'undefined' ? FormData : globalThis.FormData);
      const fetchFn = window.fetch || (typeof fetch !== 'undefined' ? fetch : globalThis.fetch);

      const blob = new BlobClass([uint8], { type: 'application/java-archive' });
      const formData = new FormDataClass();
      formData.append('file', blob, jarName);

      const res = await fetchFn('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data && data.data && data.data.url) {
        return data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      }
    } catch (e) {
      console.error('uploadAndGetPublicUrl error:', e);
    }
    return null;
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
