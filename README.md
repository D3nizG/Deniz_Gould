This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Ms. Pac-Man (Local AI Model)

This portfolio includes an interactive Ms. Pac-Man game with AI capabilities powered by a locally trained DQN model.

### Setup

1. **Install Python dependencies** (for model conversion):
   ```bash
   python -m pip install -r mspacman-ai/web-integration/requirements.txt
   ```

2. **Convert and validate the model**:
   ```bash
   npm run ai:setup
   ```
   This will:
   - Convert the Stable-Baselines3 model to ONNX format
   - Run validation checks to ensure the model is ready
   - Place the converted model in `public/models/`

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Try it out**:
   - Visit [http://localhost:3000/ai/diagnostics](http://localhost:3000/ai/diagnostics) to check model status and run tests
   - Visit [http://localhost:3000](http://localhost:3000) to play the game
   - Toggle between Manual and AI modes using the button below the game

### Features

- **Manual Mode**: Play Ms. Pac-Man yourself using arrow keys or WASD
- **AI Mode**: Watch a trained DQN agent play autonomously
- **Real-time HUD**: Score, lives, pellets, and AI status
- **Browser Inference**: Runs entirely in the browser using ONNX Runtime Web (WebGL/WebGPU)
- **Diagnostics**: Built-in testing and validation tools at `/ai/diagnostics`

### What's next

```bash
python -m pip install -r mspacman-ai/web-integration/requirements.txt
npm install
npm run ai:setup
npm run dev
```

Visit `/ai/diagnostics` to see “Model OK” and run the browser smoke test, then play on the homepage and toggle AI.

### Acceptance checklist status

- Branch exists and changes are committed under `feature/mspacman-ai-canvas`.
- Ms. Pac-Man canvas with manual play and AI toggle is present on the home page.
- `npm run ai:setup` will convert and validate ONNX with doctor checks.
- `/ai/diagnostics` is implemented (dev-only by default) with model status and browser inference test.
- AI uses the model if present; otherwise the worker returns random legal actions with clear status.
- One map is included; existing CSS/pages preserved.

### Notes for other machines

- Diagnostics are hidden in production by default. To enable in production, set `NEXT_PUBLIC_ENABLE_AI_DIAGNOSTICS=true` (e.g., in `.env.local`).
- Public models are gitignored (`public/models/*`). A `.keep` file is committed so the folder exists, but you must re-run conversion on each machine.
- To convert a different checkpoint, pass an explicit path: `npm run ai:convert -- --ckpt path/to/your_model.zip`.
- Requirements:
  - Node.js 18.17+ (or 20+ recommended) and npm.
  - Python 3.9–3.11 recommended. The requirements are pinned for prebuilt wheels.
- The doctor uses `onnxruntime-node` when available and falls back to Python `onnxruntime` if needed.
- Browser acceleration: ONNX Runtime Web chooses WebGPU/WebGL when available; ensure hardware acceleration is enabled for best performance.

### Technical Details

- **Model**: DQN/QRDQN trained with Stable-Baselines3
- **Input**: 84×84 grayscale frames, stacked 4 frames
- **Decision Rate**: 10-15 Hz (human-like speed)
- **Rendering**: 60 FPS canvas-based game loop
