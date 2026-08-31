/**
 * CLAUDE AI - FREESTYLE LINUX CLOUD VM SANDBOX ENGINE
 * Executes real Linux commands, writes files to disk, runs OpenJDK 17 + Maven compilation,
 * and acts as an automatic HTTPS-to-HTTP Proxy Relay to bypass browser Mixed Content restrictions.
 */

const CloudVM = {
  apiKey: '2xkJA1qbZjQnfgdxi6aHe4-9NGHmnP27XE92z5xBH61ehQ9WJijtx165xBU5CyLKc7w',
  vmId: 'vm-cc195078c93f4bf3837d49a8c0447126',
  apiBase: 'https://beta-api.freestyle.sh/v5',

  /**
   * Execute bash command on real Ubuntu Linux Cloud VM
   */
  async exec(command) {
    try {
      const res = await fetch(`${this.apiBase}/vms/${this.vmId}/exec-await`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command })
      });
      return await res.json();
    } catch (err) {
      console.error('CloudVM exec error:', err);
      return { stdout: '', stderr: err.message, statusCode: -1 };
    }
  },

  /**
   * Proxy HTTP API request through Cloud VM to bypass Browser Mixed Content blocking
   */
  async proxyHttpRequest(url, method, headers, body) {
    const headerFlags = Object.entries(headers || {})
      .map(([k, v]) => `-H "${k}: ${String(v).replace(/"/g, '\\"')}"`)
      .join(' ');
    
    const safeBody = body ? body.replace(/\\/g, '\\\\').replace(/\$/g, '\\$').replace(/'/g, "'\\''") : '';
    const bodyFlag = body ? `-d '${safeBody}'` : '';
    const curlCmd = `curl -s -X ${method || 'POST'} "${url}" ${headerFlags} ${bodyFlag}`;
    
    const res = await this.exec(curlCmd);
    if (res.statusCode !== 0 && !res.stdout) {
      throw new Error(`Cloud VM Relay error: ${res.stderr || 'Connection failed'}`);
    }
    return res.stdout;
  },

  /**
   * Sync all workspace files to /home/ubuntu/workspace on Linux VM
   */
  async syncWorkspaceFiles(files) {
    if (!Array.isArray(files) || files.length === 0) return;
    
    // Clear workspace directory
    await this.exec('rm -rf /home/ubuntu/workspace && mkdir -p /home/ubuntu/workspace/src/main/resources /home/ubuntu/workspace/src/main/java');

    for (const f of files) {
      const relPath = f.name.replace(/^\/+/, '');
      const dirPath = relPath.includes('/') ? relPath.substring(0, relPath.lastIndexOf('/')) : '';
      if (dirPath) {
        await this.exec(`mkdir -p "/home/ubuntu/workspace/${dirPath}"`);
      }
      
      // Escape content for bash heredoc
      const safeContent = f.content.replace(/\\/g, '\\\\').replace(/\$/g, '\\$').replace(/`/g, '\\`');
      await this.exec(`cat << 'EOF' > "/home/ubuntu/workspace/${relPath}"\n${safeContent}\nEOF`);
    }
  },

  /**
   * Run real Maven build on Cloud VM and upload compiled .jar to public server
   */
  async buildAndUploadJar(files, onLog = null) {
    if (onLog) onLog('⚡ Đang đồng bộ mã nguồn lên máy ảo Linux Ubuntu (4 vCPU, 8GB RAM)...');
    await this.syncWorkspaceFiles(files);

    if (onLog) onLog('🔨 Đang thực thi "mvn clean package" bằng OpenJDK 17 trên Linux...');
    const buildRes = await this.exec('cd /home/ubuntu/workspace && mvn clean package -B -DskipTests');
    
    if (onLog && buildRes.stdout) {
      const lines = buildRes.stdout.split('\n');
      const tail = lines.slice(-15).join('\n');
      onLog(`📋 Log biên dịch từ máy ảo:\n${tail}`);
    }

    // Check if target has .jar
    const checkJar = await this.exec('ls /home/ubuntu/workspace/target/*.jar 2>/dev/null | grep -v "original" | head -n 1');
    const jarPath = (checkJar.stdout || '').trim();

    if (!jarPath) {
      if (onLog) onLog('⚠️ Không tìm thấy file .jar trong target. Đang đóng gói dự phòng bằng JSZip...');
      return null;
    }

    if (onLog) onLog(`📦 Đã biên dịch thành công: ${jarPath.split('/').pop()}! Đang tải lên server lưu trữ...`);
    const uploadRes = await this.exec(`curl -s -F "file=@${jarPath}" https://tmpfiles.org/api/v1/upload`);
    
    try {
      const uploadData = JSON.parse(uploadRes.stdout);
      if (uploadData && uploadData.data && uploadData.data.url) {
        const directUrl = uploadData.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        if (onLog) onLog(`✅ Hoàn tất! Đường link tải trực tiếp file .jar: ${directUrl}`);
        return directUrl;
      }
    } catch (e) {
      console.warn('VM upload parse error:', e);
    }
    return null;
  }
};

window.CloudVM = CloudVM;
