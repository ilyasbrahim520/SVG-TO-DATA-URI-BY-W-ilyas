/**
 * SVG to Data URI Converter
 * Enhanced script with improved organization, features and error handling
 */
(function() {
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
    minify: true,                  // Minify SVG by default
    storage: {
      theme: 'dark-theme',         // Storage key for theme preference
      history: 'svg-conversion-history'  // Storage key for conversion history
    },
    notificationTimeout: 3000      // Notification display duration
  };

  // Track conversion history
  let conversionHistory = [];
  
  // Initialize the application
  function init() {
    attachEventListeners();
    loadSavedTheme();
    loadExampleSVG();
    loadConversionHistory();
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
  }

  /**
   * Handle file upload and processing
   * @param {Event} e - The change event from file input
   */
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    
    if (!file) {
      elements.fileNameDisplay.textContent = '-No file chosen-';
      return;
    }
    
    elements.fileNameDisplay.textContent = file.name;
    
    try {
      // Read the file asynchronously
      const svgContent = await readFileAsync(file);
      elements.svgInput.value = svgContent;
      updatePreview(svgContent);
    } catch (error) {
      showNotification(`Error reading file: ${error.message}`, 'error');
    }
  }

  /**
   * Read a file asynchronously using a Promise
   * @param {File} file - The file to read
   * @returns {Promise<string>} - The file contents
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
      // Validate SVG code
      validateSVG(svgCode);
      
      // Convert to Data URI
      const dataUri = svgToDataUri(svgCode);
      
      // Update UI with results
      elements.outputCode.textContent = dataUri;
      updatePreview(svgCode);
      
      // Save to history
      saveToHistory(svgCode, dataUri);
      
      // Show file size
      const byteSize = new Blob([dataUri]).size;
      const readableSize = formatBytes(byteSize);
      
      showNotification(`Conversion successful! Size: ${readableSize}`, 'success');
    } catch (error) {
      showNotification(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Validate SVG using DOM parser
   * @param {string} svg - SVG string to validate
   * @throws {Error} - If SVG is invalid
   */
  function validateSVG(svg) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
    const errorNode = svgDoc.querySelector('parsererror');
    
    if (errorNode) {
      throw new Error('Invalid SVG code');
    }
    
    // Additional validation can be added here
    if (!svg.includes('<svg')) {
      throw new Error('Missing SVG tag');
    }
  }

  /**
   * Convert SVG to Data URI with options for minification
   * @param {string} svg - The SVG code to convert
   * @returns {string} - Data URI string
   */
  function svgToDataUri(svg) {
    // Minify SVG if option is enabled
    let processedSvg = svg;
    
    if (settings.minify) {
      processedSvg = minifySvg(svg);
    }
    
    // URL encode the SVG
    const encoded = encodeURIComponent(processedSvg)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');
    
    // Create the data URI
    return `data:image/svg+xml;charset=utf-8,${encoded}`;
  }

  /**
   * Minify SVG by removing extra spaces, comments, and newlines
   * @param {string} svg - The SVG code to minify
   * @returns {string} - Minified SVG
   */
  function minifySvg(svg) {
    return svg
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/>\s+</g, '><')         // Remove whitespace between tags
      .replace(/\s{2,}/g, ' ')         // Replace multiple spaces with single space
      .replace(/[\r\n]/g, '')          // Remove newlines
      .trim();
  }

  /**
   * Format bytes to human-readable format
   * @param {number} bytes - Number of bytes
   * @returns {string} - Formatted string (e.g., "1.23 KB")
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
   * @param {string} svgCode - SVG code to preview
   */
  function updatePreview(svgCode) {
    if (!svgCode) {
      elements.svgPreview.innerHTML = '<p>Preview will appear here</p>';
      return;
    }
    
    try {
      // Create data URI for preview
      const dataUri = svgToDataUri(svgCode);
      
      // Display the image
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
   * @param {string} svg - Original SVG
   * @param {string} dataUri - Generated Data URI
   */
  function saveToHistory(svg, dataUri) {
    // Prepare history entry with timestamp
    const entry = {
      timestamp: new Date().toISOString(),
      svg: svg.length > 100 ? svg.substring(0, 100) + '...' : svg, // Store a preview for large SVGs
      dataUri: dataUri,
      size: new Blob([dataUri]).size
    };
    
    // Add to history array
    conversionHistory.unshift(entry); // Add to beginning
    
    // Limit history to 10 items
    if (conversionHistory.length > 10) {
      conversionHistory.pop();
    }
    
    // Save to localStorage
    localStorage.setItem(settings.storage.history, JSON.stringify(conversionHistory));
  }

  /**
   * Load conversion history from localStorage
   */
  function loadConversionHistory() {
    const saved = localStorage.getItem(settings.storage.history);
    if (saved) {
      try {
        conversionHistory = JSON.parse(saved);
      } catch (e) {
        conversionHistory = [];
      }
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
      showNotification('Failed to copy text: ' + err, 'error');
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
      a.download = 'svg-data-uri.txt';
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
    localStorage.setItem(settings.storage.theme, elements.themeToggle.checked);
  }

  /**
   * Load saved theme preference
   */
  function loadSavedTheme() {
    const darkTheme = localStorage.getItem(settings.storage.theme) === 'true';
    elements.themeToggle.checked = darkTheme;
    
    if (darkTheme) {
      document.body.classList.add('dark-theme');
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
   * @param {string} message - Notification message
   * @param {string} type - Notification type ('success' or 'error')
   */
  function showNotification(message, type) {
    elements.notification.textContent = message;
    elements.notification.className = `notification ${type}`;
    elements.notification.classList.add('show');
    
    setTimeout(() => {
      elements.notification.classList.remove('show');
    }, settings.notificationTimeout);
  }

  // Initialize the application when DOM is fully loaded
  document.addEventListener('DOMContentLoaded', init);
})();

// كود شاشة الانتظار
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('fade-out');
    }, 2000);
  }
});
