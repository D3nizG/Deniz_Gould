'use client';

import { useEffect, useRef, useState } from 'react';
import { MsPacmanGame, type GameState } from './MsPacmanGame';
import { TIMING } from '../ai/constants';

interface MsPacmanCanvasProps {
  mode: 'manual' | 'ai';
  onGameStateChange?: (state: GameState) => void;
}

export default function MsPacmanCanvas({ mode, onGameStateChange }: MsPacmanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<MsPacmanGame | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastDecisionTime = useRef<number>(0);
  
  const [modelStatus, setModelStatus] = useState<{
    loaded: boolean;
    steps?: number;
    error?: string;
  }>({ loaded: false });
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentAction, setCurrentAction] = useState<string>('NOOP');
  
  // Initialize worker
  useEffect(() => {
    const worker = new Worker(new URL('../ai/worker.ts', import.meta.url));
    workerRef.current = worker;
    
    // Handle worker messages
    worker.onmessage = (e) => {
      const { type, success, action, actionName, status, error } = e.data;
      
      switch (type) {
        case 'init':
          if (success) {
            console.log('[AI] Model initialized successfully');
            // Get status after init
            worker.postMessage({ type: 'status' });
          } else {
            console.error('[AI] Model initialization failed:', error);
            setModelStatus({ loaded: false, error });
          }
          break;
          
        case 'status':
          setModelStatus({
            loaded: status.loaded,
            steps: status.metadata?.steps,
          });
          break;
          
        case 'infer':
          if (action !== undefined && gameRef.current) {
            gameRef.current.handleAIAction(action);
            setCurrentAction(actionName || 'UNKNOWN');
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
    if (!canvas) return;
    
    // Set canvas size
    const container = canvas.parentElement;
    if (container) {
      const size = Math.min(container.clientWidth, container.clientHeight);
      canvas.width = size;
      canvas.height = size;
    }
    
    // Create game instance
    const game = new MsPacmanGame(canvas);
    gameRef.current = game;
    
    // Initial render
    game.render();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  // Handle mode changes
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.setMode(mode);
    }
  }, [mode]);
  
  // Keyboard input for manual mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'manual' && gameRef.current) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
          e.preventDefault();
          gameRef.current.handleKeyPress(e.key);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        setGameState(state);
        onGameStateChange?.(state);
        
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
  }, [mode, onGameStateChange]);
  
  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start text-white font-mono text-sm pointer-events-none">
        <div className="bg-black/70 px-3 py-2 rounded backdrop-blur-sm">
          <div>Score: {gameState?.score ?? 0}</div>
          <div>Lives: {'♥'.repeat(gameState?.lives ?? 0)}</div>
          <div>Pellets: {gameState?.pelletsLeft ?? 0}</div>
        </div>
        
        <div className="bg-black/70 px-3 py-2 rounded backdrop-blur-sm text-right">
          <div>Mode: {mode.toUpperCase()}</div>
          {mode === 'ai' && (
            <>
              <div className={modelStatus.loaded ? 'text-green-400' : 'text-red-400'}>
                Model: {modelStatus.loaded ? 'Loaded' : 'Not Loaded'}
              </div>
              {modelStatus.steps && (
                <div className="text-xs text-gray-400">
                  Steps: {modelStatus.steps.toLocaleString()}
                </div>
              )}
              {modelStatus.loaded && (
                <div className="text-xs text-blue-400">
                  Action: {currentAction}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Game Over */}
      {gameState?.gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4">Game Over</h2>
            <p className="text-xl mb-2">Final Score: {gameState.score}</p>
            <button
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium pointer-events-auto"
              onClick={() => gameRef.current?.reset()}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
      
      {/* Controls hint */}
      {mode === 'manual' && !gameState?.gameOver && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded backdrop-blur-sm text-white text-xs pointer-events-none">
          Use Arrow Keys or WASD to move
        </div>
      )}
    </div>
  );
}

