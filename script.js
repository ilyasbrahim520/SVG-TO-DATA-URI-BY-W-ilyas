/**
 * SVG to Data URI Converter
 * Enhanced script with PWA features and offline support
 */
(function() {
  // PWA Installation variables
  let deferredPrompt;
  let installButton;

  // DOM Elements
  const elements = {
    svgFileInput: document.getElementById('svg-file'),
    fileNameDisplay: document.getElementById('file-name-display'),
    svgInput: document.getElementById('svg-input'),
    convertBtn: document.getElementById('convert-btn'),
    clearBtn: document.getElementById('clear-btn'),
    svgPreview: document.getElementById('svg-preview'),
    outputCode: document.getElementById('output-code'),
    copyBtn: document.getElementById('copy-btn'),
    downloadBtn: document.getElementById('download-btn'),
    notification: document.getElementById('notification'),
    themeToggle: document.getElementById('theme-toggle')
  };

  // Settings - can be extended for preferences
  const settings = {
    minify: true,
    storage: {
      theme: 'dark-theme',
      history: 'svg-conversion-history',
      installPrompted: 'pwa-install-prompted'
    },
    notificationTimeout: 3000
  };

  // Track conversion history
  let conversionHistory = [];
  
  // Initialize the application
  function init() {
    attachEventListeners();
    loadSavedTheme();
    loadExampleSVG();
    loadConversionHistory();
    initializePWA();
    checkOnlineStatus();
  }

  /**
   * Initialize PWA features
   */
  function initializePWA() {
    // Create install button
    createInstallButton();
    
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA: Install prompt available');
      e.preventDefault();
      deferredPrompt = e;
      showInstallButton();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', (evt) => {
      console.log('PWA: App installed successfully');
      hideInstallButton();
      showNotification('App installed successfully!', 'success');
      localStorage.setItem(settings.storage.installPrompted, 'true');
    });

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('PWA: Running in standalone mode');
      hideInstallButton();
    }
  }

  /**
   * Create install button
   */
  function createInstallButton() {
    installButton = document.createElement('button');
    installButton.id = 'install-btn';
    installButton.innerHTML = '📱 Install App';
    installButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
      background: linear-gradient(45deg, #2ECC48, #27ae60);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(46, 204, 72, 0.3);
      display: none;
      transition: all 0.3s ease;
    `;
    
    installButton.addEventListener('mouseover', () => {
      installButton.style.transform = 'translateY(-2px)';
      installButton.style.boxShadow = '0 6px 20px rgba(46, 204, 72, 0.4)';
    });
    
    installButton.addEventListener('mouseout', () => {
      installButton.style.transform = 'translateY(0)';
      installButton.style.boxShadow = '0 4px 15px rgba(46, 204, 72, 0.3)';
    });

    installButton.addEventListener('click', installApp);
    document.body.appendChild(installButton);
  }

  /**
   * Show install button
   */
  function showInstallButton() {
    const alreadyPrompted = localStorage.getItem(settings.storage.installPrompted);
    if (!alreadyPrompted && installButton) {
      installButton.style.display = 'block';
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        if (installButton.style.display === 'block') {
          hideInstallButton();
        }
      }, 10000);
    }
  }

  /**
   * Hide install button
   */
  function hideInstallButton() {
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  /**
   * Install the PWA
   */
  async function installApp() {
    if (!deferredPrompt) {
      showNotification('Install not available', 'error');
      return;
    }

    try {
      const result = await deferredPrompt.prompt();
      console.log('PWA: Install prompt result:', result.outcome);
      
      if (result.outcome === 'accepted') {
        showNotification('Installing app...', 'success');
      } else {
        showNotification('Installation cancelled', 'error');
      }
      
      deferredPrompt = null;
      hideInstallButton();
      localStorage.setItem(settings.storage.installPrompted, 'true');
    } catch (error) {
      console.error('PWA: Install error:', error);
      showNotification('Installation failed', 'error');
    }
  }

  /**
   * Check online/offline status
   */
  function checkOnlineStatus() {
    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        showNotification('Back online!', 'success');
      } else {
        showNotification('Working offline', 'error');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    if (!navigator.onLine) {
      setTimeout(() => {
        showNotification('App ready for offline use', 'success');
      }, 1000);
    }
  }

  /**
   * Attach all event listeners for interactive elements
   */
  function attachEventListeners() {
    // File upload handler
    elements.svgFileInput.addEventListener('change', handleFileUpload);
    
    // Button click handlers
    elements.convertBtn.addEventListener('click', handleConversion);
    elements.clearBtn.addEventListener('click', clearAll);
    elements.copyBtn.addEventListener('click', copyToClipboard);
    elements.downloadBtn.addEventListener('click', downloadAsFile);
    
    // Theme toggle
    elements.themeToggle.addEventListener('change', toggleTheme);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
  }

  /**
   * Handle keyboard shortcuts
   */
  function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + Enter to convert
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleConversion();
    }
    
    // Ctrl/Cmd + L to clear
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      clearAll();
    }
    
    // Ctrl/Cmd + C to copy (when output is focused)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && document.activeElement === elements.outputCode) {
      e.preventDefault();
      copyToClipboard();
    }
  }

  /**
   * Handle file upload and processing
   */
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    
    if (!file) {
      elements.fileNameDisplay.textContent = '-No file chosen-';
      return;
    }
    
    elements.fileNameDisplay.textContent = file.name;
    
    try {
      const svgContent = await readFileAsync(file);
      elements.svgInput.value = svgContent;
      updatePreview(svgContent);
    } catch (error) {
      showNotification(`Error reading file: ${error.message}`, 'error');
    }
  }

  /**
   * Read a file asynchronously using a Promise
   */
  function readFileAsync(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = event => resolve(event.target.result);
      reader.onerror = error => reject(error);
      
      reader.readAsText(file);
    });
  }

  /**
   * Handle SVG conversion process
   */
  function handleConversion() {
    const svgCode = elements.svgInput.value.trim();
    
    if (!svgCode) {
      showNotification('Please enter SVG code', 'error');
      return;
    }
    
    try {
      validateSVG(svgCode);
      const dataUri = svgToDataUri(svgCode);
      
      elements.outputCode.textContent = dataUri;
      updatePreview(svgCode);
      saveToHistory(svgCode, dataUri);
      
      const byteSize = new Blob([dataUri]).size;
      const readableSize = formatBytes(byteSize);
      
      showNotification(`Conversion successful! Size: ${readableSize}`, 'success');
    } catch (error) {
      showNotification(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Validate SVG using DOM parser
   */
  function validateSVG(svg) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
    const errorNode = svgDoc.querySelector('parsererror');
    
    if (errorNode) {
      throw new Error('Invalid SVG code');
    }
    
    if (!svg.includes('<svg')) {
      throw new Error('Missing SVG tag');
    }
  }

  /**
   * Convert SVG to Data URI with minification
   */
  function svgToDataUri(svg) {
    let processedSvg = svg;
    
    if (settings.minify) {
      processedSvg = minifySvg(svg);
    }
    
    const encoded = encodeURIComponent(processedSvg)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');
    
    return `data:image/svg+xml;charset=utf-8,${encoded}`;
  }

  /**
   * Minify SVG by removing extra spaces, comments, and newlines
   */
  function minifySvg(svg) {
    return svg
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ')
      .replace(/[\r\n]/g, '')
      .trim();
  }

  /**
   * Format bytes to human-readable format
   */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Update SVG preview
   */
  function updatePreview(svgCode) {
    if (!svgCode) {
      elements.svgPreview.innerHTML = '<p>Preview will appear here</p>';
      return;
    }
    
    try {
      const dataUri = svgToDataUri(svgCode);
      
      elements.svgPreview.innerHTML = '';
      const img = document.createElement('img');
      img.src = dataUri;
      img.alt = 'SVG Preview';
      elements.svgPreview.appendChild(img);
    } catch (error) {
      elements.svgPreview.innerHTML = `<p>Error displaying preview: ${error.message}</p>`;
    }
  }

  /**
   * Save conversion to history
   */
  function saveToHistory(svg, dataUri) {
    const entry = {
      timestamp: new Date().toISOString(),
      svg: svg.length > 100 ? svg.substring(0, 100) + '...' : svg,
      dataUri: dataUri,
      size: new Blob([dataUri]).size
    };
    
    conversionHistory.unshift(entry);
    
    if (conversionHistory.length > 10) {
      conversionHistory.pop();
    }
    
    // Store offline using localStorage
    try {
      localStorage.setItem(settings.storage.history, JSON.stringify(conversionHistory));
    } catch (e) {
      console.warn('LocalStorage quota exceeded, clearing old history');
      conversionHistory = conversionHistory.slice(0, 5);
      localStorage.setItem(settings.storage.history, JSON.stringify(conversionHistory));
    }
  }

  /**
   * Load conversion history from localStorage
   */
  function loadConversionHistory() {
    try {
      const saved = localStorage.getItem(settings.storage.history);
      if (saved) {
        conversionHistory = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error loading history:', e);
      conversionHistory = [];
    }
  }

  /**
   * Clear all inputs and outputs
   */
  function clearAll() {
    elements.svgInput.value = '';
    elements.outputCode.textContent = 'Output will appear here after conversion';
    elements.svgPreview.innerHTML = '<p>Preview will appear here</p>';
    elements.fileNameDisplay.textContent = '-No file chosen-';
    elements.svgFileInput.value = '';
    
    showNotification('All fields cleared', 'success');
  }

  /**
   * Copy output to clipboard
   */
  async function copyToClipboard() {
    const output = elements.outputCode.textContent;
    
    if (output === 'Output will appear here after conversion') {
      showNotification('No content to copy', 'error');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(output);
      showNotification('Data URI copied to clipboard', 'success');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = output;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showNotification('Data URI copied to clipboard', 'success');
    }
  }

  /**
   * Download output as text file
   */
  function downloadAsFile() {
    const output = elements.outputCode.textContent;
    
    if (output === 'Output will appear here after conversion') {
      showNotification('No content to download', 'error');
      return;
    }
    
    try {
      const blob = new Blob([output], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      a.href = url;
      a.download = `svg-data-uri-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      showNotification('Text file downloaded', 'success');
    } catch (error) {
      showNotification('Download failed: ' + error.message, 'error');
    }
  }

  /**
   * Toggle dark/light theme
   */
  function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    try {
      localStorage.setItem(settings.storage.theme, elements.themeToggle.checked);
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }
  }

  /**
   * Load saved theme preference
   */
  function loadSavedTheme() {
    try {
      const darkTheme = localStorage.getItem(settings.storage.theme) === 'true';
      elements.themeToggle.checked = darkTheme;
      
      if (darkTheme) {
        document.body.classList.add('dark-theme');
      }
    } catch (e) {
      console.warn('Could not load theme preference:', e);
    }
  }

  /**
   * Load example SVG from placeholder for initial preview
   */
  function loadExampleSVG() {
    const exampleSvg = elements.svgInput.placeholder;
    if (exampleSvg.includes('<svg')) {
      updatePreview(exampleSvg);
    }
  }

  /**
   * Show notification
   */
  function showNotification(message, type) {
    elements.notification.textContent = message;
    elements.notification.className = `notification ${type}`;
    elements.notification.classList.add('show');
    
    setTimeout(() => {
      elements.notification.classList.remove('show');
    }, settings.notificationTimeout);
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', init);

  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(registration => {
          console.log('SW registered: ', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showNotification('App updated! Refresh to see changes.', 'success');
              }
            });
          });
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }

})();

// Preloader handling
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('fade-out');
    }, 2000);
  }
});
