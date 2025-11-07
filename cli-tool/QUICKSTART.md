# Quick Start Guide

## 1. Start the VibeSDK Worker

In a separate terminal, start the worker:

```bash
cd /Users/abhi/Downloads/fix-vibesdk-prod2/worker
bun run dev
```

Wait for it to show:
```
⎔ Ready on http://localhost:8787
```

## 2. Run the CLI Tool

In another terminal:

```bash
cd /Users/abhi/Downloads/fix-vibesdk-prod2/cli-tool
bun run start
```

## 3. Create Your First App

When prompted:

```
? What would you like to build?
> Build a todo app with React and TypeScript

? Agent mode:
> Deterministic (recommended)
```

## 4. Use Commands

Once connected, try:

```bash
> /generate        # Start generating code
> /preview         # Deploy to sandbox preview
> /chat add a dark mode toggle
> /exit            # Exit when done
```

## Files Output

Check `./output/{agentId}/` for all generated files!

## Common Issues

**Port already in use:**
```bash
# Kill any process on port 8787
lsof -ti:8787 | xargs kill -9
```

**Dependencies missing:**
```bash
bun install
```

**Permission denied:**
```bash
chmod +x src/index.ts
```

That's it! You're ready to generate apps! 🚀
