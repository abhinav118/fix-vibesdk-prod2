#!/usr/bin/env bun
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import WebSocket from 'ws';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import type {
  CodeGenArgs,
  AgentCreationResponse,
  BlueprintChunk,
  WebSocketResponse,
  WebSocketRequest,
  FileMessage,
  DeploymentMessage,
  CloudflareDeploymentMessage,
  PhaseMessage,
  ConversationMessage,
  ErrorMessage,
  AgentConnectedMessage,
} from './types';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8787';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';

// Global state
let agentId: string | null = null;
let websocketUrl: string | null = null;
let ws: WebSocket | null = null;
let filesMap: Map<string, string> = new Map();
let lastDeploymentUrl: string | null = null;

// Utility: Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Utility: Save file to disk
async function saveFile(filePath: string, contents: string): Promise<void> {
  if (!agentId) return;

  const outputPath = join(OUTPUT_DIR, agentId, filePath);
  const dir = dirname(outputPath);

  await mkdir(dir, { recursive: true });
  await writeFile(outputPath, contents, 'utf-8');

  filesMap.set(filePath, contents);
}

// Step 1: Create Agent via POST /api/agent
async function createAgent(query: string, agentMode: 'deterministic' | 'smart' = 'deterministic'): Promise<void> {
  console.log(chalk.blue('🚀 Starting VibeSDK CLI...\n'));
  console.log(chalk.cyan('📡 Creating agent...'));

  const body: CodeGenArgs = {
    query,
    agentMode,
    language: 'typescript',
    frameworks: ['react', 'vite'],
    selectedTemplate: 'auto',
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/agent`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    // Parse NDJSON stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        if (line === 'terminate') {
          console.log(chalk.dim('Stream terminated\n'));
          break;
        }

        try {
          const data = JSON.parse(line);

          if (data.agentId && data.websocketUrl) {
            // First message with agent info
            const agentData = data as AgentCreationResponse;
            agentId = agentData.agentId;
            websocketUrl = agentData.websocketUrl;

            console.log(chalk.green(`✅ Agent created: ${agentId}`));
            console.log(chalk.blue(`🔗 WebSocket: ${websocketUrl}`));
            console.log(chalk.dim(`📋 Template: ${agentData.template.name}\n`));
          } else if (data.chunk) {
            // Blueprint chunk
            const chunkData = data as BlueprintChunk;
            process.stdout.write(chalk.gray(chunkData.chunk));
          }
        } catch (err) {
          console.error(chalk.red('Failed to parse JSON line:'), line);
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to create agent:'), error);
    throw error;
  }
}

// Step 2: Connect to WebSocket
async function connectWebSocket(): Promise<void> {
  if (!websocketUrl) {
    throw new Error('WebSocket URL not available');
  }

  return new Promise((resolve, reject) => {
    console.log(chalk.cyan('🔌 Connecting to WebSocket...\n'));

    // Add auth token to WebSocket URL if available
    let wsUrl = websocketUrl!;
    if (AUTH_TOKEN) {
      const url = new URL(wsUrl);
      url.searchParams.set('token', AUTH_TOKEN);
      wsUrl = url.toString();
    }

    ws = new WebSocket(wsUrl, {
      headers: {
        'Origin': API_BASE_URL
      }
    });

    ws.on('open', () => {
      console.log(chalk.green('✅ WebSocket connected!\n'));
      console.log(chalk.yellow('Available commands:'));
      console.log(chalk.dim('  /generate    - Start code generation'));
      console.log(chalk.dim('  /preview     - Deploy to preview sandbox'));
      console.log(chalk.dim('  /deploy      - Deploy to Cloudflare Workers (production)'));
      console.log(chalk.dim('  /url         - Show last deployment URL'));
      console.log(chalk.dim('  /stop        - Stop generation'));
      console.log(chalk.dim('  /state       - Get conversation state'));
      console.log(chalk.dim('  /clear       - Clear conversation'));
      console.log(chalk.dim('  /chat <msg>  - Send chat message'));
      console.log(chalk.dim('  /exit        - Exit CLI\n'));
      resolve();
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketResponse;
        handleWebSocketMessage(message);
      } catch (err) {
        console.error(chalk.red('Failed to parse WebSocket message:'), err);
      }
    });

    ws.on('error', (error) => {
      console.error(chalk.red('❌ WebSocket error:'), error);
      reject(error);
    });

    ws.on('close', () => {
      console.log(chalk.yellow('\n🔌 WebSocket disconnected'));
      ws = null;
    });
  });
}

// Step 3: Handle WebSocket Messages
async function handleWebSocketMessage(message: WebSocketResponse): Promise<void> {
  const timestamp = new Date().toLocaleTimeString();

  switch (message.type) {
    case 'agent_connected': {
      const msg = message as AgentConnectedMessage;
      console.log(chalk.blue(`[${timestamp}] [AGENT_CONNECTED]`));
      console.log(chalk.dim(`  State restored: ${Object.keys(msg.state.generatedFilesMap).length} files`));
      console.log(chalk.dim(`  Project: ${msg.state.projectName}`));
      console.log(chalk.dim(`  Template: ${msg.state.templateName}`));
      console.log(chalk.dim(`  Phase: ${msg.state.currentPhase}/${msg.state.phasesCounter}\n`));

      // Save existing files
      for (const [path, file] of Object.entries(msg.state.generatedFilesMap)) {
        await saveFile(path, file.fileContents);
      }
      break;
    }

    case 'generation_started':
    case 'generation_complete':
    case 'generation_stopped':
    case 'generation_resumed':
      console.log(chalk.magenta(`[${timestamp}] [${message.type.toUpperCase()}] ${message.message}\n`));
      break;

    case 'phase_generating':
    case 'phase_implementing':
    case 'phase_validating': {
      const msg = message as PhaseMessage;
      console.log(chalk.cyan(`[${timestamp}] [${message.type.toUpperCase()}] ${msg.message}`));
      break;
    }

    case 'phase_generated':
    case 'phase_implemented':
    case 'phase_validated': {
      const msg = message as PhaseMessage;
      console.log(chalk.green(`[${timestamp}] [${message.type.toUpperCase()}] ${msg.message}`));
      if (msg.filesCount) {
        console.log(chalk.dim(`  Files: ${msg.filesCount}`));
      }
      if (msg.fixCount) {
        console.log(chalk.dim(`  Fixes applied: ${msg.fixCount}`));
      }
      console.log();
      break;
    }

    case 'phase_failed': {
      const msg = message as PhaseMessage;
      console.log(chalk.red(`[${timestamp}] [PHASE_FAILED] ${msg.message}\n`));
      break;
    }

    case 'file_generating': {
      const msg = message as FileMessage;
      console.log(chalk.yellow(`[${timestamp}] [FILE_GENERATING] ${msg.filePath}`));
      if (msg.filePurpose) {
        console.log(chalk.dim(`  Purpose: ${msg.filePurpose}`));
      }
      break;
    }

    case 'file_chunk_generated': {
      // Optional: display chunks (can be noisy)
      // const msg = message as FileMessage;
      // process.stdout.write(chalk.dim('.'));
      break;
    }

    case 'file_generated': {
      const msg = message as FileMessage;
      const file = msg.file || {
        filePath: msg.filePath!,
        fileContents: msg.fileContents!,
        filePurpose: msg.filePurpose,
      };

      await saveFile(file.filePath, file.fileContents);

      const size = msg.size || file.fileContents.length;
      console.log(chalk.green(`[${timestamp}] [FILE_GENERATED] ✓ ${file.filePath} (${formatFileSize(size)})\n`));
      break;
    }

    case 'deployment_started': {
      const msg = message as DeploymentMessage;
      const deployType = msg.subdomain ? '🌍 Production' : '👁️  Preview';
      console.log(chalk.cyan(`[${timestamp}] [DEPLOYMENT_STARTED] ${deployType} - ${msg.message || 'Starting deployment...'}`));
      if (msg.subdomain) {
        console.log(chalk.dim(`  Subdomain: ${msg.subdomain}`));
      }
      break;
    }

    case 'deployment_completed': {
      const msg = message as DeploymentMessage;
      const url = msg.deployedUrl || msg.previewURL || msg.previewUrl;
      const isProduction = url?.includes('workers.dev') || url?.includes('anex6site.com');
      const icon = isProduction ? '🌍' : '👁️';
      const label = isProduction ? 'PRODUCTION DEPLOYED' : 'PREVIEW DEPLOYED';

      // Store the deployment URL
      lastDeploymentUrl = url || null;

      console.log(chalk.green(`\n${'='.repeat(80)}`));
      console.log(chalk.green(`[${timestamp}] [DEPLOYMENT_COMPLETED] ${icon} ${label}`));
      console.log(chalk.green('='.repeat(80)));
      console.log(chalk.bold.cyan(`\n  🌐 Live URL: ${url}\n`));
      if (msg.filesDeployed) {
        console.log(chalk.dim(`  📦 Files deployed: ${msg.filesDeployed}`));
      }
      if (msg.runId) {
        console.log(chalk.dim(`  🆔 Run ID: ${msg.runId}`));
      }
      if (isProduction) {
        console.log(chalk.yellow(`\n  ✨ Your app is now live and accessible to anyone!`));
        console.log(chalk.dim(`  💡 Tip: Copy the URL above to share with users`));
      } else {
        console.log(chalk.yellow(`\n  ⚡ Preview is ready for testing`));
        console.log(chalk.dim(`  💡 Use /deploy for permanent production deployment`));
      }
      console.log(chalk.green(`\n${'='.repeat(80)}\n`));
      break;
    }

    case 'deployment_failed': {
      const msg = message as DeploymentMessage;
      console.log(chalk.red(`[${timestamp}] [DEPLOYMENT_FAILED] ❌ ${msg.error || msg.message}`));
      console.log(chalk.dim(`  Please check the worker logs for more details\n`));
      break;
    }

    case 'cloudflare_deployment_started': {
      const msg = message as CloudflareDeploymentMessage;
      console.log(chalk.cyan(`[${timestamp}] [CLOUDFLARE_DEPLOYMENT_STARTED] 🌍 Production - ${msg.message}`));
      console.log(chalk.dim(`  Instance ID: ${msg.instanceId}`));
      break;
    }

    case 'cloudflare_deployment_completed': {
      const msg = message as CloudflareDeploymentMessage;
      const url = msg.deploymentUrl || msg.workersUrl;

      // Store the deployment URL
      lastDeploymentUrl = url || null;

      console.log(chalk.green(`\n${'='.repeat(80)}`));
      console.log(chalk.green(`[${timestamp}] [CLOUDFLARE_DEPLOYMENT_COMPLETED] 🌍 PRODUCTION DEPLOYED`));
      console.log(chalk.green('='.repeat(80)));
      console.log(chalk.bold.cyan(`\n  🌐 Live URL: ${url}\n`));
      console.log(chalk.dim(`  🆔 Instance ID: ${msg.instanceId}`));
      console.log(chalk.yellow(`\n  ✨ Your app is now live and accessible to anyone!`));
      console.log(chalk.dim(`  💡 Tip: Copy the URL above to share with users`));
      console.log(chalk.green(`\n${'='.repeat(80)}\n`));
      break;
    }

    case 'cloudflare_deployment_error': {
      const msg = message as CloudflareDeploymentMessage;
      console.log(chalk.red(`[${timestamp}] [CLOUDFLARE_DEPLOYMENT_ERROR] ❌ ${msg.error || msg.message}`));
      console.log(chalk.dim(`  Instance ID: ${msg.instanceId}`));
      console.log(chalk.dim(`  Please check the worker logs for more details\n`));
      break;
    }

    case 'conversation_response': {
      const msg = message as ConversationMessage;
      console.log(chalk.blue(`[${timestamp}] [AI_RESPONSE]`));
      console.log(chalk.white(msg.message || ''));
      if (msg.tool) {
        console.log(chalk.dim(`  Tool: ${msg.tool.name} - ${msg.tool.status}`));
      }
      console.log();
      break;
    }

    case 'conversation_state': {
      const msg = message as ConversationMessage;
      const messages = msg.messages || msg.state?.messages || [];
      console.log(chalk.blue(`[${timestamp}] [CONVERSATION_STATE] ${messages.length} messages`));
      messages.slice(-3).forEach((m) => {
        console.log(chalk.dim(`  [${m.role}] ${m.content.substring(0, 80)}...`));
      });
      console.log();
      break;
    }

    case 'error':
    case 'rate_limit_error': {
      const msg = message as ErrorMessage;
      console.log(chalk.red(`[${timestamp}] [ERROR] ${msg.error || msg.message}\n`));
      break;
    }

    default:
      // Log unknown message types
      console.log(chalk.gray(`[${timestamp}] [${(message as any).type}] ${JSON.stringify(message).substring(0, 100)}...\n`));
  }
}

// Send WebSocket message
function sendMessage(message: WebSocketRequest): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error(chalk.red('❌ WebSocket not connected'));
    return;
  }

  ws.send(JSON.stringify(message));
}

// Interactive command loop
async function commandLoop(): Promise<void> {
  while (true) {
    try {
      const command = await input({
        message: '>',
      });

      const trimmed = command.trim();

      if (!trimmed) continue;

      if (trimmed === '/exit') {
        console.log(chalk.yellow('👋 Closing connection...'));
        ws?.close();
        process.exit(0);
      } else if (trimmed === '/generate') {
        console.log(chalk.cyan('🚀 Starting generation...\n'));
        sendMessage({ type: 'generate_all' });
      } else if (trimmed === '/preview') {
        console.log(chalk.cyan('🚀 Deploying to preview sandbox...\n'));
        sendMessage({ type: 'preview' });
      } else if (trimmed === '/deploy') {
        console.log(chalk.cyan('🌍 Deploying to Cloudflare Workers (production)...\n'));
        sendMessage({ type: 'deploy' });
      } else if (trimmed === '/url') {
        if (lastDeploymentUrl) {
          console.log(chalk.cyan(`\n🌐 Last Deployment URL: ${lastDeploymentUrl}\n`));
        } else {
          console.log(chalk.yellow('\n⚠️  No deployment URL available yet. Deploy with /preview or /deploy first.\n'));
        }
      } else if (trimmed === '/stop') {
        console.log(chalk.yellow('⏸️  Stopping generation...\n'));
        sendMessage({ type: 'stop_generation' });
      } else if (trimmed === '/state') {
        console.log(chalk.cyan('📊 Fetching conversation state...\n'));
        sendMessage({ type: 'get_conversation_state' });
      } else if (trimmed === '/clear') {
        console.log(chalk.yellow('🗑️  Clearing conversation...\n'));
        sendMessage({ type: 'clear_conversation' });
      } else if (trimmed.startsWith('/chat ')) {
        const message = trimmed.substring(6).trim();
        if (message) {
          console.log(chalk.blue(`💬 Sending: ${message}\n`));
          sendMessage({ type: 'user_suggestion', message });
        }
      } else {
        console.log(chalk.red('Unknown command. Available commands:'));
        console.log(chalk.dim('  /generate, /preview, /deploy, /url, /stop, /state, /clear, /chat <msg>, /exit'));
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('User force closed')) {
        console.log(chalk.yellow('\n👋 Exiting...'));
        ws?.close();
        process.exit(0);
      }
      console.error(chalk.red('Error:'), error);
    }
  }
}

// Main execution
async function main() {
  try {
    // Prompt for query
    const query = await input({
      message: 'What would you like to build?',
      default: 'Build a todo app with React and TypeScript',
    });

    const agentMode = await select({
      message: 'Agent mode:',
      choices: [
        { name: 'Deterministic (recommended)', value: 'deterministic' },
        { name: 'Smart', value: 'smart' },
      ],
      default: 'deterministic',
    });

    // Create agent
    await createAgent(query, agentMode as 'deterministic' | 'smart');

    if (!agentId || !websocketUrl) {
      throw new Error('Failed to get agent ID or WebSocket URL');
    }

    // Connect WebSocket
    await connectWebSocket();

    // Start command loop
    await commandLoop();
  } catch (error) {
    console.error(chalk.red('❌ Fatal error:'), error);
    process.exit(1);
  }
}

// Run
main();
