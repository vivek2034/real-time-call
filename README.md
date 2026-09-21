# Audio Call

A modern, lightweight, browser-based real-time audio calling application. Designed for seamless, account-free communication across any desktop or mobile device. Just enter a name, see who is online, and tap to call.

---

## Features

- **No Registration Required**: Instant access without accounts, passwords, or emails. Choose a display name and start calling immediately.
- **Peer-to-Peer Voice (WebRTC)**: Ultra-low latency, crystal-clear audio powered by native browser WebRTC (`RTCPeerConnection`).
- **Real-Time Presence & Signaling**: Custom WebSocket signaling server handles user presence, live status updates (available, ringing, in call), and call negotiations.
- **Robust NAT & Firewall Traversal**: Preconfigured with multi-vendor STUN servers (Google, Cloudflare, Mozilla) and TURN relay fallback (`openrelay.metered.ca`) for seamless connectivity across mobile cellular networks (CGNAT) and strict corporate firewalls.
- **Synthesized Audio Effects**: Built-in ringtones, dial tones, and notification chimes generated purely via the Web Audio API—no external audio files or downloads required.
- **Live Audio Level Meter**: Visual voice activity indicator for both local and remote audio streams.
- **Interactive In-Call Controls**: Mute/unmute microphone, toggle ringtone audio, and view real-time call duration timer.
- **Microphone Test & Diagnostics**: Built-in mic tester to verify microphone permissions and input levels prior to placing calls.
- **Automatic Recovery**: Automated ICE restart renegotiation if network conditions temporarily degrade or switch.

---

## Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), [Motion](https://motion.dev/), [Lucide React](https://lucide.dev/)
- **Signaling Server**: [Express](https://expressjs.com/), [ws (WebSocket)](https://github.com/websockets/ws), [tsx](https://github.com/privatenumber/tsx)
- **Bundler & Build Tool**: [Vite](https://vitejs.dev/), [esbuild](https://esbuild.github.io/)
- **Protocol**: WebRTC (Opus audio codec, STUN/TURN ICE negotiation)

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- A working microphone and a modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. Clone or download the repository:
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally (Development)

Start the unified Express server and Vite development middleware:

```bash
npm run dev
```

The application will be accessible at:
```
http://localhost:3000
```

> **Testing Tip**: To test a voice call locally on the same machine, open two different browser windows or tabs (e.g., one standard window and one incognito/private window), enter two distinct names, and click **Call**.

---

## Production Build

To build the client assets and bundle the backend server:

```bash
npm run build
```

This compiles:
- The React application into static assets in `dist/`
- The backend server into a single bundled Node file at `dist/server.cjs`

To start the production server:

```bash
npm start
```

### Deploying to Render / Railway / Cloud

When configuring a Web Service on platforms like **Render**:
- **Build Command**: `npm install && npm run build` (or `bun install && bun run build`)
- **Start Command**: `npm start` (or `bun run start`)

> *Note: If the platform defaults the build step to just `bun install` / `npm install`, the `start` script will automatically detect the missing `dist/server.cjs` and run the build step on the fly.*

---

## How It Works

```
  ┌──────────────┐                               ┌──────────────┐
  │   User A     │◄─────── WebSocket ───────────►│   User B     │
  │  (Browser)   │        Signaling Server       │  (Browser)   │
  └──────┬───────┘       (Presence & SDP)        └───────┬──────┘
         │                                               │
         │                                               │
         └────────────── Direct P2P Audio ───────────────┘
                     (WebRTC Encrypted Stream)
```

1. **Presence**: When a user enters their name, the browser opens a WebSocket connection to register with the server and receives the list of online users.
2. **Call Initiation**: User A clicks "Call" on User B. The server routes an `incoming_call` message to User B with ringing chimes.
3. **Acceptance & SDP Offer**: When User B accepts, User A automatically generates an SDP offer via `RTCPeerConnection.createOffer()`.
4. **SDP Answer**: User B sets User A's offer as remote description and responds with an SDP answer.
5. **ICE Candidate Exchange**: Both peers exchange ICE network candidates through the signaling server to determine the best direct or relayed routing path.
6. **Encrypted Audio Stream**: Once connected, audio streams directly peer-to-peer via SRTP using high-fidelity Opus encoding.

---

## Browser Permissions

- **Microphone Access**: Modern browsers require HTTPS (or `localhost`) to grant microphone access via `navigator.mediaDevices.getUserMedia`.
- On mobile devices (iOS Safari & Android Chrome), grant microphone permissions when prompted to enable audio transmission.

---

## Scripts Reference

| Command | Description |
|---|---|
| `npm run dev` | Runs the full-stack app with hot reload on port 3000 |
| `npm run build` | Compiles Vite frontend & bundles Express server with esbuild |
| `npm start` | Runs the compiled production server (`node dist/server.cjs`) |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run clean` | Cleans up the `dist/` build directory |

---

## License

MIT License. Feel free to use, modify, and distribute.
