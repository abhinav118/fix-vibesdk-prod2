# VibeSDK CLI - Changelog

## [1.2.0] - 2025-11-05

### Added
- **Cloudflare Workers Deployment Support**: Full support for production deployments
  - Added handlers for `cloudflare_deployment_started` message type
  - Added handlers for `cloudflare_deployment_completed` message type with `deploymentUrl` field
  - Added handlers for `cloudflare_deployment_error` message type
  - Automatically displays deployment URL when `/deploy` completes successfully
  - URL is immediately available without needing to call `/url` command

### Enhanced
- **Deployment URL Extraction**: Now properly extracts URLs from both deployment types:
  - Preview deployments: Uses `previewURL`, `previewUrl`, or `deployedUrl` fields
  - Cloudflare deployments: Uses `deploymentUrl` or `workersUrl` fields
  - Both types automatically store URL in `lastDeploymentUrl` for `/url` command

### Fixed
- **`/deploy` command now returns URL**: Previously, the `/deploy` command would complete but not show the deployment URL because it was only listening for `deployment_completed` messages instead of `cloudflare_deployment_completed`

## [1.1.0] - 2025-11-05

### Added
- **`/url` command**: Display the last deployment URL without re-deploying
  - Shows the most recent preview or production deployment URL
  - Provides helpful message if no deployment has been made yet
  - Useful for quickly sharing deployment URLs

### Enhanced
- **Deployment URL Display**: Enhanced the deployment completion message with:
  - Prominent banner display with 80-character borders
  - Clear distinction between Preview and Production deployments
  - Bold, cyan URL display for easy visibility
  - Deployment metadata (files deployed, run ID)
  - Helpful tips for next steps
  - Production deployments now show success message and sharing tips

### Fixed
- **TypeScript Error**: Fixed "Property 'type' does not exist on type 'never'" error in default switch case by adding type assertion

### Usage Examples

```bash
# Deploy to production
> /deploy
🌍 Deploying to Cloudflare Workers (production)...

================================================================================
[DEPLOYMENT_COMPLETED] 🌍 PRODUCTION DEPLOYED
================================================================================

  🌐 Live URL: https://todo-app-xyz789.yourdomain.com

  📦 Files deployed: 15
  🆔 Run ID: vibesdk-enhanced-abc123

  ✨ Your app is now live and accessible to anyone!
  💡 Tip: Copy the URL above to share with users

================================================================================

# Retrieve URL later
> /url
🌐 Last Deployment URL: https://todo-app-xyz789.yourdomain.com
```

## [1.0.0] - 2025-11-05

### Initial Release
- Agent creation via POST /api/agent with NDJSON stream parsing
- WebSocket connection with real-time updates
- File saving to `./output/{agentId}/`
- Interactive command loop with 8 commands:
  - `/generate` - Start code generation
  - `/preview` - Deploy to preview sandbox
  - `/deploy` - Deploy to Cloudflare Workers (production)
  - `/stop` - Stop generation
  - `/state` - Get conversation state
  - `/clear` - Clear conversation
  - `/chat <msg>` - Send chat message to AI
  - `/exit` - Exit CLI
- Support for 28+ WebSocket message types
- Color-coded terminal output with Chalk
- Proper WebSocket security with Origin header

### Documentation
- Complete README with usage examples
- Integration guide in FRONTEND_INTEGRATION_GUIDE.md
- Quick start guide in INTEGRATION_COMPLETE.md
