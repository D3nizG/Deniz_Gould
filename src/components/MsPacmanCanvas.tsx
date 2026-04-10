'use client';

import { startTransition, useEffect, useRef, useState } from 'react';
import { MsPacmanGame, MS_PACMAN_WORLD_SIZE, type GameState } from './MsPacmanGame';
import { TIMING } from '../ai/constants';

const SESSION_SCORE_STORAGE_KEY = 'ms-pacman-session-score';
const HIGH_SCORE_STORAGE_KEY = 'ms-pacman-high-score';

interface MsPacmanCanvasProps {
  mode: 'manual' | 'ai';
  onGameStateChange?: (state: GameState) => void;
}

function areGameStatesEqual(previous: GameState | null, next: GameState): boolean {
  if (!previous) {
    return false;
  }

  return (
    previous.score === next.score &&
    previous.lives === next.lives &&
    previous.pelletsLeft === next.pelletsLeft &&
    previous.mode === next.mode &&
    previous.gameOver === next.gameOver &&
    previous.paused === next.paused &&
    previous.level === next.level
  );
}

export default function MsPacmanCanvas({ mode, onGameStateChange }: MsPacmanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<MsPacmanGame | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastDecisionTime = useRef<number>(0);
  const lastCanvasSizeRef = useRef({ width: 0, height: 0 });
  const lastPublishedStateRef = useRef<GameState | null>(null);
  const lastRoundScoreRef = useRef(0);
  const sessionScoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const onGameStateChangeRef = useRef(onGameStateChange);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isManualSurfaceFocused, setIsManualSurfaceFocused] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    onGameStateChangeRef.current = onGameStateChange;
  }, [onGameStateChange]);

  useEffect(() => {
    sessionScoreRef.current = sessionScore;
  }, [sessionScore]);

  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  useEffect(() => {
    try {
      const savedSessionScore = window.sessionStorage.getItem(SESSION_SCORE_STORAGE_KEY);
      const savedHighScore = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY);

      if (savedSessionScore) {
        setSessionScore(Number.parseInt(savedSessionScore, 10) || 0);
      }

      if (savedHighScore) {
        setHighScore(Number.parseInt(savedHighScore, 10) || 0);
      }
    } catch (error) {
      console.warn('[MsPacmanCanvas] Unable to read saved scores:', error);
    }
  }, []);
  
  // Initialize worker
  useEffect(() => {
    const worker = new Worker(new URL('../ai/worker.ts', import.meta.url));
    workerRef.current = worker;
    
    // Handle worker messages
    worker.onmessage = (e) => {
      const { type, success, action, error } = e.data;
      
      switch (type) {
        case 'init':
          if (success) {
            console.log('[AI] Model initialized successfully');
          } else {
            console.error('[AI] Model initialization failed:', error);
          }
          break;
          
        case 'infer':
          if (action !== undefined && gameRef.current) {
            gameRef.current.handleAIAction(action);
          }
          break;
          
        case 'error':
          console.error('[AI] Worker error:', error);
          break;
      }
    };
    
    // Initialize model
    worker.postMessage({ type: 'init' });
    
    return () => {
      worker.terminate();
    };
  }, []);
  
  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface) return;

    const syncCanvasSize = (width: number, height: number) => {
      const nextWidth = Math.max(1, Math.round(width));
      const nextHeight = Math.max(1, Math.round(height));

      if (
        lastCanvasSizeRef.current.width === nextWidth &&
        lastCanvasSizeRef.current.height === nextHeight
      ) {
        return;
      }

      lastCanvasSizeRef.current = { width: nextWidth, height: nextHeight };

      if (!gameRef.current) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;

        const game = new MsPacmanGame(canvas);
        gameRef.current = game;

        const initialState = game.getState();
        lastPublishedStateRef.current = initialState;
        startTransition(() => setGameState(initialState));
        onGameStateChangeRef.current?.(initialState);
        game.render();
        return;
      }

      gameRef.current.resize(nextWidth, nextHeight);
      gameRef.current.render();
    };

    syncCanvasSize(surface.clientWidth, surface.clientHeight);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      syncCanvasSize(entry.contentRect.width, entry.contentRect.height);
    });

    resizeObserver.observe(surface);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Handle mode changes
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.setMode(mode);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'manual') {
      setIsManualSurfaceFocused(false);
      return;
    }

    const focusSurface = requestAnimationFrame(() => {
      surfaceRef.current?.focus();
    });

    return () => cancelAnimationFrame(focusSurface);
  }, [mode]);
  
  // Game loop
  useEffect(() => {
    let lastTime = performance.now();
    
    const gameLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      if (gameRef.current) {
        // Update game
        gameRef.current.update(deltaTime);
        
        // Render
        gameRef.current.render();
        
        // Update state
        const state = gameRef.current.getState();
        if (!areGameStatesEqual(lastPublishedStateRef.current, state)) {
          lastPublishedStateRef.current = state;
          startTransition(() => setGameState(state));
          onGameStateChangeRef.current?.(state);
        }
        
        // AI decision (if in AI mode)
        if (mode === 'ai' && currentTime - lastDecisionTime.current >= TIMING.MS_PER_DECISION) {
          lastDecisionTime.current = currentTime;
          
          if (workerRef.current && !state.gameOver && !state.paused) {
            const imageData = gameRef.current.getCanvasImageData();
            workerRef.current.postMessage({
              type: 'infer',
              imageData,
            }, [imageData.data.buffer]);
          }
        }
      }
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode]);

  useEffect(() => {
    if (!gameState) {
      return;
    }

    if (gameState.score < lastRoundScoreRef.current) {
      lastRoundScoreRef.current = gameState.score;
      return;
    }

    const scoreDelta = gameState.score - lastRoundScoreRef.current;

    if (scoreDelta <= 0) {
      return;
    }

    lastRoundScoreRef.current = gameState.score;

    const nextSessionScore = sessionScoreRef.current + scoreDelta;
    const nextHighScore = Math.max(highScoreRef.current, nextSessionScore);

    sessionScoreRef.current = nextSessionScore;
    highScoreRef.current = nextHighScore;

    setSessionScore(nextSessionScore);
    setHighScore(nextHighScore);

    try {
      window.sessionStorage.setItem(SESSION_SCORE_STORAGE_KEY, String(nextSessionScore));
    } catch (error) {
      console.warn('[MsPacmanCanvas] Unable to save session score:', error);
    }

    try {
      window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(nextHighScore));
    } catch (error) {
      console.warn('[MsPacmanCanvas] Unable to save high score:', error);
    }
  }, [gameState]);

  const handleSurfaceKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (mode !== 'manual' || !gameRef.current) {
      return;
    }

    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)
    ) {
      e.preventDefault();
      gameRef.current.handleKeyPress(e.key);
    }
  };

  const handleSurfacePointerDown = () => {
    if (mode === 'manual') {
      surfaceRef.current?.focus();
    }
  };

  const collectedFruit: string[] = [];
  const sessionScoreDisplay = sessionScore.toString().padStart(6, '0');
  const highScoreDisplay = highScore.toString().padStart(6, '0');
  
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start font-mono text-white">
        <div className="flex flex-1 justify-start">
          <div className="flex flex-col items-start text-left">
            <div className="animate-pulse text-[11px] uppercase tracking-[0.45em] text-red-400">
              1UP
            </div>
            <div className="mt-1 text-xl leading-none sm:text-2xl">{sessionScoreDisplay}</div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center text-center">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-white/70">
            <span className="h-px w-8 bg-white/20 sm:w-12" />
            <span>High Score</span>
            <span className="h-px w-8 bg-white/20 sm:w-12" />
          </div>
          <div className="mt-1 text-xl leading-none sm:text-2xl">{highScoreDisplay}</div>
        </div>

        <div aria-hidden className="flex-1" />
      </div>

      <div
        ref={surfaceRef}
        tabIndex={mode === 'manual' ? 0 : -1}
        aria-label={
          mode === 'manual'
            ? 'Ms. Pac-Man game surface. Use Arrow keys or WASD to move.'
            : 'Ms. Pac-Man AI game surface.'
        }
        className={`relative w-full overflow-hidden rounded-xl border border-accent-primary/20 bg-black outline-none transition-shadow ${
          mode === 'manual' ? 'cursor-pointer' : ''
        } ${
          isManualSurfaceFocused
            ? 'ring-2 ring-accent-primary/60 ring-offset-2 ring-offset-black'
            : ''
        }`}
        style={{ aspectRatio: `${MS_PACMAN_WORLD_SIZE.width} / ${MS_PACMAN_WORLD_SIZE.height}` }}
        onBlur={() => setIsManualSurfaceFocused(false)}
        onFocus={() => setIsManualSurfaceFocused(true)}
        onKeyDown={handleSurfaceKeyDown}
        onPointerDown={handleSurfacePointerDown}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          style={{ imageRendering: 'pixelated' }}
        />

        {gameState?.gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="px-6 text-center text-white">
              <h2 className="text-3xl font-bold sm:text-4xl">Game Over</h2>
              <p className="mt-3 text-lg">Final Score: {gameState.score}</p>
              <button
                className="mt-5 rounded bg-blue-600 px-6 py-2 font-medium hover:bg-blue-700"
                onClick={() => gameRef.current?.reset()}
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between font-mono text-white">
        <div className="flex min-h-6 items-center gap-2 text-lg leading-none">
          {Array.from({ length: gameState?.lives ?? 0 }, (_, index) => (
            <span key={index} className="text-yellow-300">
              ♥
            </span>
          ))}
        </div>

        <div className="flex min-h-6 flex-row-reverse items-center gap-2 text-lg leading-none text-orange-300">
          {collectedFruit.map((fruit, index) => (
            <span key={`${fruit}-${index}`}>{fruit}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
