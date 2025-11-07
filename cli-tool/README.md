# VibeSDK CLI Tool

A simple command-line interface for interacting with the VibeSDK API to generate full-stack applications.

## Features

- ✨ Create AI-powered apps via simple prompts
- 🔌 Real-time WebSocket updates
- 💾 Automatic file saving to disk
- 💬 Interactive chat with AI agent
- 🎨 Color-coded terminal output
- 🚀 Preview deployment support

## Prerequisites

- [Bun](https://bun.sh) installed
- VibeSDK worker running (default: `http://localhost:8787`)

## Installation

```bash
cd cli-tool
bun install
```

## Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# VibeSDK API Configuration
API_BASE_URL=http://localhost:8787
AUTH_TOKEN=

# Output directory for generated files
OUTPUT_DIR=./output
```

**Note:** According to the project setup, authentication is currently disabled, so `AUTH_TOKEN` can be left empty.

## Usage

### Start the CLI

```bash
bun run start
```

You'll be prompted for:

1. **What would you like to build?** - Describe your app
   - Example: "Build a todo app with React and TypeScript"
   - Example: "Create a restaurant website with menu and contact form"

2. **Agent mode** - Choose generation mode:
   - `deterministic` (recommended) - Consistent, predictable generation
   - `smart` - More creative but potentially slower

### Interactive Commands

Once connected to the WebSocket, you can use these commands:

| Command | Description |
|---------|-------------|
| `/generate` | Start code generation |
| `/preview` | Deploy to preview sandbox (temporary, for testing) |
| `/deploy` | Deploy to Cloudflare Workers (production, permanent) |
| `/stop` | Stop current generation |
| `/state` | Get conversation state/history |
| `/clear` | Clear conversation history |
| `/chat <message>` | Send a chat message to the agent |
| `/exit` | Exit the CLI |

### Example Session

```bash
$ bun run start

🚀 Starting VibeSDK CLI...

? What would you like to build? Build a todo app with React and TypeScript
? Agent mode: Deterministic (recommended)

📡 Creating agent...
✅ Agent created: 01JGXYZ123ABC
🔗 WebSocket: ws://localhost:8787/api/agent/01JGXYZ123ABC/ws
📋 Template: react-vite

🔌 Connecting to WebSocket...

✅ WebSocket connected!

Available commands:
  /generate    - Start code generation
  /preview     - Deploy to preview sandbox
  /deploy      - Deploy to Cloudflare Workers (production)
  /stop        - Stop generation
  /state       - Get conversation state
  /clear       - Clear conversation
  /chat <msg>  - Send chat message
  /exit        - Exit CLI

[10:30:15] [AGENT_CONNECTED]
  State restored: 0 files
  Project: todo-app
  Template: react-vite
  Phase: 0/0

> /generate
🚀 Starting generation...

[10:30:20] [GENERATION_STARTED] Starting code generation...
[10:30:25] [PHASE_GENERATING] Generating phase 1...
[10:30:30] [PHASE_GENERATED] Phase 1 generated
  Files: 8
[10:30:32] [FILE_GENERATING] src/App.tsx
  Purpose: Main application component
[10:30:35] [FILE_GENERATED] ✓ src/App.tsx (2.5 KB)
...
[10:31:00] [DEPLOYMENT_COMPLETED] 🌐 https://preview-abc123.domain.com
  Files deployed: 15

> /chat add dark mode toggle
💬 Sending: add dark mode toggle

[10:31:05] [AI_RESPONSE]
I'll add a dark mode toggle component to your app...

[10:31:10] [FILE_GENERATING] src/components/DarkModeToggle.tsx
[10:31:12] [FILE_GENERATED] ✓ src/components/DarkModeToggle.tsx (1.8 KB)

> /exit
👋 Closing connection...
```

## Output Structure

Generated files are saved to:

```
cli-tool/
└── output/
    └── {agentId}/
        ├── package.json
        ├── index.html
        ├── tsconfig.json
        ├── vite.config.ts
        └── src/
            ├── App.tsx
            ├── main.tsx
            ├── components/
            └── ...
```

Each agent session creates a separate directory under `output/`.

## WebSocket Message Types

The CLI displays and handles all WebSocket message types:

### Generation Lifecycle
- `generation_started` - Generation begins
- `generation_complete` - Generation finishes
- `generation_stopped` - User stopped generation

### Phase Progress
- `phase_generating` - AI generating phase plan
- `phase_generated` - Phase plan ready
- `phase_implementing` - Implementing phase files
- `phase_implemented` - Phase files complete
- `phase_validating` - Validating code
- `phase_validated` - Validation complete

### File Operations
- `file_generating` - Starting file generation
- `file_chunk_generated` - Streaming file content
- `file_generated` - File complete and saved

### Deployment
- `deployment_started` - Deploying (preview sandbox)
- `deployment_completed` - Deployment URL available (preview)
- `deployment_failed` - Deployment error (preview)
- `cloudflare_deployment_started` - Cloudflare Workers deployment starting
- `cloudflare_deployment_completed` - Cloudflare Workers deployment complete with URL
- `cloudflare_deployment_error` - Cloudflare Workers deployment error

### Conversation
- `conversation_response` - AI response to chat
- `conversation_state` - Chat history

### Errors
- `error` - General error
- `rate_limit_error` - Rate limit exceeded

## Troubleshooting

### Connection Failed

Make sure the VibeSDK worker is running:

```bash
cd ../worker
bun run dev
```

### WebSocket Disconnects

The CLI will log disconnection. You can reconnect by running the CLI again with the same agent ID (feature to be added).

### Files Not Saving

Check that the output directory exists and has write permissions:

```bash
mkdir -p ./output
chmod 755 ./output
```

## Development

Run in development mode with auto-reload:

```bash
bun run dev
```

## Deployment

The CLI supports two types of deployment:

### 1. Preview Deployment (`/preview`)

Temporary deployment to a sandbox environment for testing:

```bash
> /preview
🚀 Deploying to preview sandbox...

[10:32:00] [DEPLOYMENT_STARTED] 👁️  Preview - Starting deployment...
[10:32:10] [DEPLOYMENT_COMPLETED] 👁️  PREVIEW DEPLOYED
  🌐 https://preview-abc123.sandbox.yourdomain.com
  📦 Files deployed: 15
```

**Characteristics:**
- ✅ Fast deployment (~5-10 seconds)
- ✅ Instant updates
- ✅ Hot reload
- ⚠️ Temporary (may expire after inactivity)
- ⚠️ Development/testing only

### 2. Production Deployment (`/deploy`)

Permanent deployment to Cloudflare Workers for Platforms:

```bash
> /deploy
🌍 Deploying to Cloudflare Workers (production)...

[10:35:00] [DEPLOYMENT_STARTED] 🌍 Production - Starting deployment...
  Subdomain: todo-app-xyz789
[10:35:30] [DEPLOYMENT_COMPLETED] 🌍 PRODUCTION DEPLOYED
  🌐 https://todo-app-xyz789.yourdomain.com
  📦 Files deployed: 15
  🆔 Run ID: vibesdk-enhanced-abc123
```

**Characteristics:**
- ✅ Production-ready
- ✅ Permanent URL
- ✅ Auto-scaling
- ✅ Global CDN
- ✅ Custom subdomain
- ⚠️ Slower deployment (~30-60 seconds)

**Workflow:**
1. Generate your app with `/generate`
2. Test with `/preview` to see it running
3. Make changes with `/chat <message>`
4. Deploy to production with `/deploy`
5. Share the production URL with users!

## API Endpoints Used

- `POST /api/agent` - Create new agent (returns NDJSON stream)
- `GET /api/agent/:agentId/ws` - WebSocket connection
- WebSocket messages:
  - `generate_all` - Start code generation
  - `preview` - Deploy to preview sandbox
  - `deploy` - Deploy to Cloudflare Workers (production)
  - `user_suggestion` - Send chat message
  - `stop_generation` - Stop generation

## Project Structure

```
cli-tool/
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── .env.example          # Environment template
├── src/
│   ├── index.ts          # Main CLI logic
│   └── types.ts          # TypeScript types
├── output/               # Generated files
└── README.md             # This file
```

## License

Same as VibeSDK project.

## Support

For issues with the VibeSDK API, refer to the main project documentation at `/Users/abhi/Downloads/fix-vibesdk-prod2/docs/llm.md`.
