// public/pdf-viewer.js - Interactive Synchronized PDF.js Canvas Engine
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

class SynchronizedPDFViewer {
  constructor() {
    this.pdfDoc = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.zoomScale = 1.0;
    this.baseViewportWidth = null;
    this.renderTask = null;
    this.pageRendering = false;
    this.pageNumPending = null;
    this.isApplyingSync = false;

    // DOM Elements
    this.canvas = document.getElementById('pdf-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.container = document.getElementById('canvas-container');
    this.lobbyStage = document.getElementById('lobby-stage');
    this.viewerStage = document.getElementById('viewer-stage');

    this.prevBtn = document.getElementById('prev-page');
    this.nextBtn = document.getElementById('next-page');
    this.currentPageEl = document.getElementById('current-page');
    this.totalPagesEl = document.getElementById('total-pages');
    this.zoomInBtn = document.getElementById('zoom-in');
    this.zoomOutBtn = document.getElementById('zoom-out');
    this.zoomLevelEl = document.getElementById('zoom-level');

    this.initEventListeners();
  }

  initEventListeners() {
    // Navigation handlers
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        if (this.currentPage <= 1) return;
        this.currentPage--;
        this.queueRenderPage(this.currentPage);
        this.broadcastViewportState();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        if (this.currentPage >= this.totalPages) return;
        this.currentPage++;
        this.queueRenderPage(this.currentPage);
        this.broadcastViewportState();
      });
    }

    // Zoom Handlers
    if (this.zoomInBtn) {
      this.zoomInBtn.addEventListener('click', () => {
        if (this.zoomScale >= 3.0) return;
        this.zoomScale = Math.min(3.0, +(this.zoomScale + 0.25).toFixed(2));
        this.updateZoomDisplay();
        this.queueRenderPage(this.currentPage);
        this.broadcastViewportState();
      });
    }

    if (this.zoomOutBtn) {
      this.zoomOutBtn.addEventListener('click', () => {
        if (this.zoomScale <= 0.5) return;
        this.zoomScale = Math.max(0.5, +(this.zoomScale - 0.25).toFixed(2));
        this.updateZoomDisplay();
        this.queueRenderPage(this.currentPage);
        this.broadcastViewportState();
      });
    }

    // Scroll offset sync (debounced)
    let scrollTimeout = null;
    if (this.container) {
      this.container.addEventListener('scroll', () => {
        if (this.isApplyingSync) return;
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          this.broadcastViewportState();
        }, 80);
      }, { passive: true });
    }

    // Keyboard navigation (Arrow keys)
    window.addEventListener('keydown', (e) => {
      if (!this.pdfDoc) return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.queueRenderPage(this.currentPage);
          this.broadcastViewportState();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.queueRenderPage(this.currentPage);
          this.broadcastViewportState();
        }
      }
    });

    // Touch Pinch-to-Zoom Support for Mobile Devices
    let initialDistance = 0;
    let initialScale = 1.0;
    if (this.container) {
      this.container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          initialDistance = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
          );
          initialScale = this.zoomScale;
        }
      }, { passive: true });

      this.container.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && initialDistance > 0) {
          const currentDistance = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
          );
          const factor = currentDistance / initialDistance;
          const newScale = Math.min(3.0, Math.max(0.5, +(initialScale * factor).toFixed(2)));
          if (Math.abs(newScale - this.zoomScale) > 0.1) {
            this.zoomScale = newScale;
            this.updateZoomDisplay();
            this.queueRenderPage(this.currentPage);
            this.broadcastViewportState();
          }
        }
      }, { passive: true });

      this.container.addEventListener('touchend', () => {
        initialDistance = 0;
      }, { passive: true });
    }
  }

  updateZoomDisplay() {
    if (this.zoomLevelEl) {
      this.zoomLevelEl.textContent = `${Math.round(this.zoomScale * 100)}%`;
    }
  }

  updatePageButtons() {
    if (this.prevBtn) this.prevBtn.disabled = this.currentPage <= 1;
    if (this.nextBtn) this.nextBtn.disabled = this.currentPage >= this.totalPages;
    if (this.currentPageEl) this.currentPageEl.textContent = this.currentPage;
    if (this.totalPagesEl) this.totalPagesEl.textContent = this.totalPages;
  }

  /**
   * Loads a PDF Document from File, Blob, or ArrayBuffer
   */
  async loadDocument(fileOrBlob) {
    try {
      let arrayBuffer;
      if (fileOrBlob instanceof ArrayBuffer) {
        arrayBuffer = fileOrBlob;
      } else if (fileOrBlob instanceof Blob || fileOrBlob instanceof File) {
        arrayBuffer = await fileOrBlob.arrayBuffer();
      } else {
        throw new Error('Unsupported document format');
      }

      // Memory cleanup: destroy prior PDF document instance if active
      if (this.pdfDoc) {
        try {
          await this.pdfDoc.destroy();
        } catch (_) {}
        this.pdfDoc = null;
      }

      // Hide lobby, reveal synchronized viewer
      if (this.lobbyStage) this.lobbyStage.classList.add('hidden');
      if (this.viewerStage) this.viewerStage.classList.remove('hidden');

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
      });

      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.currentPage = 1;
      this.zoomScale = 1.0;
      this.updateZoomDisplay();
      this.updatePageButtons();

      await this.renderPage(this.currentPage);
      this.broadcastViewportState();
    } catch (err) {
      console.error('[PDFViewer] Failed to load document:', err);
    }
  }

  /**
   * Renders the specified PDF page with high-DPI crisp retina scaling
   */
  async renderPage(num) {
    if (!this.pdfDoc || !this.canvas || !this.ctx) return;
    this.pageRendering = true;

    try {
      // Cancel active in-flight rendering task if still busy
      if (this.renderTask) {
        await this.renderTask.cancel();
      }
    } catch (_) {}

    try {
      const page = await this.pdfDoc.getPage(num);

      // Determine viewport scale (incorporating devicePixelRatio for crisp text)
      const dpr = window.devicePixelRatio || 1;
      const baseViewport = page.getViewport({ scale: 1.0 });

      // Responsive auto-fit if on mobile or constrained container
      const containerWidth = this.container ? (this.container.clientWidth - 48) : 800;
      const fitScale = Math.min(1.5, Math.max(0.6, containerWidth / baseViewport.width));
      const effectiveScale = fitScale * this.zoomScale;

      const viewport = page.getViewport({ scale: effectiveScale });

      // Set canvas physical buffer dimensions multiplied by devicePixelRatio
      this.canvas.width = Math.floor(viewport.width * dpr);
      this.canvas.height = Math.floor(viewport.height * dpr);

      // Set CSS visual dimensions
      this.canvas.style.width = `${Math.floor(viewport.width)}px`;
      this.canvas.style.height = `${Math.floor(viewport.height)}px`;

      // Scale context to match retina ratio
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Render page
      const renderContext = {
        canvasContext: this.ctx,
        viewport: viewport,
        background: 'rgb(255, 255, 255)',
      };

      this.renderTask = page.render(renderContext);
      await this.renderTask.promise;
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.warn('[PDFViewer] Render error:', err);
      }
    } finally {
      this.pageRendering = false;
      this.updatePageButtons();

      // If page change was queued while busy, render pending page now
      if (this.pageNumPending !== null) {
        const nextNum = this.pageNumPending;
        this.pageNumPending = null;
        this.renderPage(nextNum);
      }
    }
  }

  queueRenderPage(num) {
    if (this.pageRendering) {
      this.pageNumPending = num;
    } else {
      this.renderPage(num);
    }
  }

  /**
   * Broadcasts current page, zoom, and scroll offsets to connected peers
   */
  broadcastViewportState() {
    if (!window.P2PAppInstance) return;

    // Only host broadcasts when Host Sync Mode is active
    if (window.P2PAppInstance.isHost || !window.P2PAppInstance.isHostControl) {
      const scrollRatio = this.container && this.container.scrollHeight > 0
        ? this.container.scrollTop / this.container.scrollHeight
        : 0;

      window.P2PAppInstance.broadcastSync({
        type: 'SYNC_STATE',
        page: this.currentPage,
        zoom: this.zoomScale,
        scrollRatio: scrollRatio,
      });
    }
  }

  /**
   * Applies viewport sync received from broadcaster
   */
  async applySyncState(state) {
    if (!state || !this.pdfDoc) return;
    this.isApplyingSync = true;

    try {
      let needsRerender = false;

      if (state.zoom && Math.abs(state.zoom - this.zoomScale) > 0.05) {
        this.zoomScale = state.zoom;
        this.updateZoomDisplay();
        needsRerender = true;
      }

      if (state.page && state.page !== this.currentPage && state.page >= 1 && state.page <= this.totalPages) {
        this.currentPage = state.page;
        needsRerender = true;
      }

      if (needsRerender) {
        await this.renderPage(this.currentPage);
      }

      // Synchronize scroll position smoothly
      if (this.container && typeof state.scrollRatio === 'number') {
        const targetScroll = state.scrollRatio * this.container.scrollHeight;
        this.container.scrollTo({
          top: targetScroll,
          behavior: 'smooth',
        });
      }
    } finally {
      setTimeout(() => {
        this.isApplyingSync = false;
      }, 150);
    }
  }
}

// Global Single Instance
window.addEventListener('DOMContentLoaded', () => {
  window.PDFViewerInstance = new SynchronizedPDFViewer();
});
