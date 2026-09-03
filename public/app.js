// public/app.js - P2P Connection Manager & Chunk Streaming Engine
const CHUNK_SIZE = 32 * 1024; // 32 KB binary slices
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

class P2PApp {
  constructor() {
    this.socket = io();
    this.peerConnection = null;
    this.dataChannel = null;

    // Room ID extraction
    const pathParts = window.location.pathname.split('/');
    const urlParams = new URLSearchParams(window.location.search);
    this.roomId = pathParts[2] || urlParams.get('room') || this.generateRoomId();
    this.isHost = !pathParts[2] && !urlParams.get('room');
    this.isHostControl = true;

    // Stream reassembly buffers
    this.incomingMetadata = null;
    this.incomingChunks = [];
    this.receivedBytes = 0;

    this.initUI();
    this.initSocket();
  }

  generateRoomId() {
    return 'zip-' + Math.random().toString(36).substring(2, 9);
  }

  initUI() {
    lucide.createIcons();

    // Update Role UI
    const roleBadge = document.getElementById('role-badge');
    roleBadge.textContent = this.isHost ? 'Host (Broadcaster)' : 'Peer (Viewer)';
    if (!this.isHost) {
      roleBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase';
    }

    // Render QR Code
    const roomUrl = `${window.location.origin}/room/${this.roomId}`;
    document.getElementById('room-link-input').value = roomUrl;

    new QRCode(document.getElementById('qrcode'), {
      text: roomUrl,
      width: 220,
      height: 220,
      colorDark: '#09090b',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });

    // Copy Share Link
    document.getElementById('copy-link-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(roomUrl);
      const btn = document.getElementById('copy-link-btn');
      btn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i> Copied!';
      lucide.createIcons();
      setTimeout(() => {
        btn.innerHTML = '<i data-lucide="copy" class="w-3.5 h-3.5"></i> Copy';
        lucide.createIcons();
      }, 2000);
    });

    // File Selection & Drag-and-Drop
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleLocalFile(e.target.files[0]));

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-blue-500', 'bg-blue-500/5');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-blue-500', 'bg-blue-500/5');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-blue-500', 'bg-blue-500/5');
      if (e.dataTransfer.files.length) {
        this.handleLocalFile(e.dataTransfer.files[0]);
      }
    });

    // Sync Mode Toggle
    document.getElementById('sync-mode-toggle').addEventListener('click', () => {
      this.isHostControl = !this.isHostControl;
      const label = document.getElementById('sync-mode-label');
      label.textContent = this.isHostControl ? 'Host Sync Mode (Active)' : 'Free Scroll Mode (Unlocked)';
    });
  }

  initSocket() {
    this.socket.emit('join-room', { roomId: this.roomId, isHost: this.isHost });

    this.socket.on('room-presence', ({ peerCount }) => {
      document.getElementById('peer-count').textContent = peerCount;
    });

    this.socket.on('peer-joined', async ({ peerId }) => {
      this.updateStatus('CONNECTING', 'Connecting direct P2P...');
      this.createPeerConnection(peerId);

      // Create DataChannel (Host)
      this.dataChannel = this.peerConnection.createDataChannel('p2p-stream', { ordered: true });
      this.setupDataChannel(this.dataChannel);

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.socket.emit('signal-offer', { targetPeerId: peerId, sdp: offer });
    });

    this.socket.on('signal-offer', async ({ senderId, sdp }) => {
      this.updateStatus('CONNECTING', 'Connecting direct P2P...');
      this.createPeerConnection(senderId);

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.socket.emit('signal-answer', { targetPeerId: senderId, sdp: answer });
    });

    this.socket.on('signal-answer', async ({ sdp }) => {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    this.socket.on('signal-ice', async ({ candidate }) => {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // Real-time viewport synchronization signal listener
    this.socket.on('sync-state', (event) => {
      if (!this.isHost || !this.isHostControl) {
        window.PDFViewerInstance?.applySyncState(event);
      }
    });

    // WebSocket fallback binary receiver
    this.socket.on('relay-chunk-fallback', ({ chunk, index, total, metadata }) => {
      if (index === 0) {
        this.incomingMetadata = metadata;
        this.incomingChunks = [];
        this.receivedBytes = 0;
        this.showProgress(metadata.fileName, 0);
      }

      this.incomingChunks.push(new Uint8Array(chunk));
      this.receivedBytes += chunk.byteLength;
      this.updateProgress(Math.min(100, Math.round((index / total) * 100)));

      if (index === total - 1) {
        const assembledBlob = new Blob(this.incomingChunks, { type: 'application/pdf' });
        this.hideProgress();
        window.PDFViewerInstance.loadDocument(assembledBlob);
      }
    });

    this.socket.on('peer-disconnected', () => {
      this.updateStatus('DISCONNECTED', 'Peer Disconnected');
    });
  }

  createPeerConnection(targetPeerId) {
    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('signal-ice', { targetPeerId, candidate: event.candidate });
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      if (state === 'connected') {
        this.updateStatus('CONNECTED', 'Direct P2P Encrypted');
      } else if (state === 'failed' || state === 'disconnected') {
        this.updateStatus('FALLBACK', 'Relaying via WebSocket Fallback');
      }
    };
  }

  setupDataChannel(channel) {
    channel.binaryType = 'arraybuffer';
    this.dataChannel = channel;

    channel.onopen = () => this.updateStatus('CONNECTED', 'Direct P2P Channel Active');
    channel.onclose = () => this.updateStatus('DISCONNECTED', 'P2P Channel Closed');

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data);
        if (msg.type === 'HEADER') {
          this.incomingMetadata = msg;
          this.incomingChunks = [];
          this.receivedBytes = 0;
          this.showProgress(msg.fileName, 0);
        } else if (msg.type === 'COMPLETE') {
          const assembledBlob = new Blob(this.incomingChunks, { type: 'application/pdf' });
          this.hideProgress();
          window.PDFViewerInstance.loadDocument(assembledBlob);
        }
      } else if (event.data instanceof ArrayBuffer) {
        this.incomingChunks.push(new Uint8Array(event.data));
        this.receivedBytes += event.data.byteLength;
        const pct = Math.min(100, Math.round((this.receivedBytes / this.incomingMetadata.fileSize) * 100));
        this.updateProgress(pct);
      }
    };
  }

  async handleLocalFile(file) {
    if (!file || file.type !== 'application/pdf') return;

    // Render immediately on host
    window.PDFViewerInstance.loadDocument(file);

    // Stream binary buffers
    const buffer = await file.arrayBuffer();
    this.showProgress(file.name, 0);

    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      // 1. Send Header
      this.dataChannel.send(JSON.stringify({
        type: 'HEADER',
        fileName: file.name,
        fileSize: file.size,
      }));

      // 2. Stream Binary Chunks with Backpressure Flow Control
      this.dataChannel.bufferedAmountLowThreshold = 64 * 1024;
      let offset = 0;

      const sendChunk = () => {
        while (offset < buffer.byteLength) {
          if (this.dataChannel.bufferedAmount > this.dataChannel.bufferedAmountLowThreshold) {
            this.dataChannel.onbufferedamountlow = () => {
              this.dataChannel.onbufferedamountlow = null;
              sendChunk();
            };
            return;
          }
          const slice = buffer.slice(offset, offset + CHUNK_SIZE);
          this.dataChannel.send(slice);
          offset += CHUNK_SIZE;
          this.updateProgress(Math.min(100, Math.round((offset / buffer.byteLength) * 100)));
        }
        this.dataChannel.send(JSON.stringify({ type: 'COMPLETE' }));
        this.hideProgress();
      };

      sendChunk();
    } else {
      // Fallback to WebSocket relay
      this.streamViaWebSocketFallback(file.name, buffer);
    }
  }

  streamViaWebSocketFallback(fileName, buffer) {
    let offset = 0;
    const totalChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE);

    const interval = setInterval(() => {
      if (offset >= buffer.byteLength) {
        clearInterval(interval);
        this.hideProgress();
        return;
      }
      const slice = buffer.slice(offset, offset + CHUNK_SIZE);
      this.socket.emit('relay-chunk-fallback', {
        roomId: this.roomId,
        chunk: slice,
        index: offset / CHUNK_SIZE,
        total: totalChunks,
        metadata: { fileName, fileSize: buffer.byteLength },
      });
      offset += CHUNK_SIZE;
      this.updateProgress(Math.min(100, Math.round((offset / buffer.byteLength) * 100)));
    }, 10);
  }

  broadcastSync(event) {
    this.socket.emit('sync-state', { roomId: this.roomId, event });
  }

  updateStatus(type, text) {
    const badge = document.getElementById('status-badge');
    const label = document.getElementById('status-text');
    label.textContent = text;

    if (type === 'CONNECTED') {
      badge.className = 'flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      badge.firstElementChild.className = 'w-2 h-2 rounded-full bg-emerald-400';
    } else if (type === 'CONNECTING') {
      badge.className = 'flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20';
      badge.firstElementChild.className = 'w-2 h-2 rounded-full bg-blue-400 animate-ping';
    }
  }

  showProgress(fileName, pct) {
    document.getElementById('progress-container').classList.remove('hidden');
    document.getElementById('transfer-file-name').textContent = fileName;
    this.updateProgress(pct);
  }

  updateProgress(pct) {
    document.getElementById('progress-bar').style.width = `${pct}%`;
    document.getElementById('transfer-percentage').textContent = `${pct}%`;
  }

  hideProgress() {
    setTimeout(() => {
      document.getElementById('progress-container').classList.add('hidden');
    }, 500);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.P2PAppInstance = new P2PApp();
});
