# PixelTalk Sound Assets & Architecture

## Overview
PixelTalk uses an 8-bit voxel/chiptune procedural synthesis sound engine built with the Web Audio API (`frontend/lib/sound.js`). This delivers instant, zero-latency retro sound effects without network asset overhead or copyright concerns.

The sound system supports semantic events and file overrides. Custom audio assets placed in the designated subdirectories can override procedural synthesis.

## Sound Directory Structure
```
frontend/public/sounds/
├── ui/
│   ├── click
│   ├── open
│   ├── close
│   └── error
├── chat/
│   ├── message-send
│   ├── message-receive
│   └── mention
├── notification/
│   ├── notification
│   ├── private-message
│   ├── group-message
│   └── success
├── auth/
│   ├── otp-sent
│   ├── otp-success
│   ├── otp-error
│   └── welcome
└── room/
    ├── join
    ├── leave
    ├── member-added
    └── member-removed
```

## Semantic Event Mapping
| Event Name | Category | Synthesizer Recipe | Fallback / Purpose |
|------------|----------|--------------------|-------------------|
| `ui.click` | UI | Square 660Hz (35ms) | Button / interactive click |
| `ui.open` | UI | Triangle 440→660Hz (90ms) | Modal or drawer open |
| `ui.close` | UI | Triangle 660→440Hz (90ms) | Modal or drawer close |
| `ui.error` | UI | Sawtooth 220→185Hz (240ms) | Validation or network error |
| `chat.send` | Chat | Square 523→784Hz (105ms) | Message successfully sent |
| `chat.receive` | Chat | Square 392Hz + Triangle 523Hz (125ms) | Message received in active chat |
| `chat.mention` | Chat | Triangle 587Hz + Square 880Hz (130ms) | User mentioned in conversation |
| `notification.message` | Notification | Square 523→659→784Hz (200ms) | Direct message notification |
| `notification.privateMessage` | Notification | Triangle 440→554→659Hz (170ms) | Private room notification |
| `notification.groupMessage` | Notification | Square 440→554→659→880Hz (260ms) | Group room notification |
| `auth.otpSent` | Auth | Triangle 523→659Hz (140ms) | Verification code dispatched |
| `auth.otpSuccess` | Auth | Triangle 523→659→784→1046Hz (290ms) | OTP / authentication success |
| `auth.otpError` | Auth | Sawtooth 260→200Hz (210ms) | Invalid code or auth failure |
| `auth.welcome` | Auth | Square 392→523→659→784Hz (370ms) | Login / signup welcome chime |
| `room.join` | Room | Square 392→523→659Hz (240ms) | User joins room |
| `room.leave` | Room | Triangle 659→523→392Hz (220ms) | User leaves room |
| `room.memberAdded` | Room | Square 440→660Hz (120ms) | Member added to room |
| `room.memberRemoved` | Room | Triangle 660→440Hz (120ms) | Member removed from room |

## Licensing & Compliance
All procedural synthesizer waveforms are generated live via standard Web Audio oscillators. No copyrighted or third-party proprietary assets are distributed or executed without express developer authorization.
