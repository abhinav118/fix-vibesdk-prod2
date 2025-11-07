// TypeScript types from VibeSDK project

export interface CodeGenArgs {
  query: string;
  language?: string;
  frameworks?: string[];
  selectedTemplate?: string;
  agentMode?: 'deterministic' | 'smart';
  images?: ImageAttachment[];
}

export interface ImageAttachment {
  data: string; // base64
  mimeType: string;
  filename: string;
  size: number;
}

export interface AgentCreationResponse {
  message: string;
  agentId: string;
  websocketUrl: string;
  httpStatusUrl: string;
  template: {
    name: string;
    files: string[];
  };
}

export interface BlueprintChunk {
  chunk: string;
}

// WebSocket Message Types - Requests (Client → Server)
export type WebSocketRequest =
  | { type: 'generate_all' }
  | { type: 'user_suggestion'; message: string; images?: ImageAttachment[] }
  | { type: 'stop_generation' }
  | { type: 'resume_generation' }
  | { type: 'deploy' }
  | { type: 'preview' }
  | { type: 'capture_screenshot'; data: { url: string; viewport?: any } }
  | { type: 'get_conversation_state' }
  | { type: 'clear_conversation' }
  | { type: 'get_model_configs' };

// WebSocket Message Types - Responses (Server → Client)
export type WebSocketResponse =
  | AgentConnectedMessage
  | GenerationMessage
  | PhaseMessage
  | FileMessage
  | DeploymentMessage
  | CloudflareDeploymentMessage
  | ConversationMessage
  | ErrorMessage;

export interface AgentConnectedMessage {
  type: 'agent_connected';
  state: AgentState;
}

export interface GenerationMessage {
  type:
    | 'generation_started'
    | 'generation_complete'
    | 'generation_stopped'
    | 'generation_resumed';
  message: string;
  timestamp?: number;
}

export interface PhaseMessage {
  type:
    | 'phase_generating'
    | 'phase_generated'
    | 'phase_implementing'
    | 'phase_implemented'
    | 'phase_validating'
    | 'phase_validated'
    | 'phase_failed';
  message: string;
  phaseNumber?: number;
  phaseName?: string;
  phase?: any;
  phases?: any[];
  filesCount?: number;
  fixCount?: number;
  timestamp?: number;
}

export interface FileMessage {
  type: 'file_generating' | 'file_chunk_generated' | 'file_generated';
  filePath?: string;
  filePurpose?: string;
  chunk?: string;
  fileContents?: string;
  message?: string;
  size?: number;
  file?: {
    filePath: string;
    fileContents: string;
    filePurpose?: string;
  };
  mode?: 'append' | 'overwrite';
  timestamp?: number;
}

export interface DeploymentMessage {
  type: 'deployment_started' | 'deployment_completed' | 'deployment_failed';
  message?: string;
  previewURL?: string;
  previewUrl?: string;
  deployedUrl?: string;
  runId?: string;
  filesDeployed?: number;
  error?: string;
  subdomain?: string;
  timestamp?: number;
}

export interface CloudflareDeploymentMessage {
  type: 'cloudflare_deployment_started' | 'cloudflare_deployment_completed' | 'cloudflare_deployment_error';
  message: string;
  instanceId: string;
  deploymentUrl?: string;
  workersUrl?: string;
  error?: string;
  timestamp?: number;
}

export interface ConversationMessage {
  type: 'conversation_response' | 'conversation_state';
  message?: string;
  conversationId?: string;
  isStreaming?: boolean;
  tool?: {
    name: string;
    status: 'start' | 'success' | 'error';
    result?: string;
  };
  state?: {
    messages: ChatMessage[];
  };
  messages?: ChatMessage[];
}

export interface ErrorMessage {
  type: 'error' | 'rate_limit_error';
  error: string;
  message?: string;
  timestamp?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AgentState {
  blueprint?: any;
  projectName: string;
  originalQuery: string;
  templateName: string;
  generatedFilesMap: Record<string, FileOutput>;
  generatedPhases: any[];
  currentPhase: number;
  phasesCounter: number;
  currentDevState: string;
  shouldBeGenerating: boolean;
  mvpGenerated: boolean;
  sandboxInstanceId?: string;
  sessionId?: string;
  conversationMessages: ChatMessage[];
  agentMode: 'deterministic' | 'smart';
  hostname: string;
}

export interface FileOutput {
  filePath: string;
  fileContents: string;
  filePurpose?: string;
  hash?: string;
  lastModified?: Date;
  uncommittedChanges?: boolean;
}
