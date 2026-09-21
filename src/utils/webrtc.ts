// WebRTC manager for cross-device browser audio calls

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

export class WebRTCClient {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  public onRemoteStream?: (stream: MediaStream) => void;
  public onIceCandidate?: (candidate: RTCIceCandidate) => void;
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;

  /**
   * Request microphone stream with clean echo cancellation & noise suppression
   */
  public async getLocalAudioStream(): Promise<MediaStream> {
    if (this.localStream && this.localStream.active) {
      return this.localStream;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    this.localStream = stream;
    return stream;
  }

  /**
   * Close only the RTCPeerConnection without stopping the microphone
   */
  public closePeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      try {
        this.peerConnection.close();
      } catch (e) {}
      this.peerConnection = null;
    }
    this.remoteStream = null;
  }

  /**
   * Flush any ICE candidates received before remoteDescription was set
   */
  private async flushPendingCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    const candidates = [...this.pendingCandidates];
    this.pendingCandidates = [];
    for (const cand of candidates) {
      if (!cand || !cand.candidate || cand.candidate.trim() === '') continue;
      try {
        await this.peerConnection.addIceCandidate(cand);
      } catch (err) {
        console.warn('Error applying queued ICE candidate:', err);
      }
    }
  }

  /**
   * Initialize Peer Connection and attach local stream tracks
   */
  public async initConnection(): Promise<RTCPeerConnection> {
    this.closePeerConnection();

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnection = pc;

    // Attach listeners immediately so no events are dropped
    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.onConnectionStateChange && this.peerConnection) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };

    // Handle remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStream) {
          this.onRemoteStream(event.streams[0]);
        }
      } else if (event.track) {
        const inboundStream = new MediaStream([event.track]);
        this.remoteStream = inboundStream;
        if (this.onRemoteStream) {
          this.onRemoteStream(inboundStream);
        }
      }
    };

    // Get or reuse microphone stream
    const stream = await this.getLocalAudioStream();
    stream.getAudioTracks().forEach((track) => {
      try {
        pc.addTrack(track, stream);
      } catch (e) {
        console.warn('Error adding track to PC:', e);
      }
    });

    return pc;
  }

  /**
   * Create SDP offer (called by the caller when the call is accepted)
   */
  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    const pc = await this.initConnection();
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * Handle incoming offer and create SDP answer
   */
  public async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = await this.initConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await this.flushPendingCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * Handle incoming answer
   */
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      await this.flushPendingCandidates();
    }
  }

  /**
   * Add ICE candidate
   */
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!candidate || !candidate.candidate || candidate.candidate.trim() === '') {
      return;
    }

    if (this.peerConnection && this.peerConnection.remoteDescription) {
      try {
        await this.peerConnection.addIceCandidate(candidate);
      } catch (err) {
        console.warn('Failed to add ICE candidate:', err);
      }
    } else {
      this.pendingCandidates.push(candidate);
    }
  }

  /**
   * Attempt an ICE restart if connection failed
   */
  public async restartIce(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.peerConnection) return null;
    try {
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (e) {
      console.warn('Failed to restart ICE:', e);
      return null;
    }
  }

  /**
   * Toggle microphone mute
   */
  public setMuted(muted: boolean): boolean {
    if (!this.localStream) return false;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    return muted;
  }

  /**
   * Clean up all peer connections and media streams
   */
  public close() {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    this.remoteStream = null;
    this.pendingCandidates = [];
  }
}
