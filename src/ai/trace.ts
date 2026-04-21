// Ms. Pac-Man runtime trace — rolling ring buffer for diagnostic replay.
//
// Usage from the browser console:
//   __msPacmanEnableTrace()          // enable capture (no console spam)
//   __msPacmanEnableTrace(true)      // enable + mirror every entry to console
//   __msPacmanDisableTrace()
//   __msPacmanDumpTrace()            // download the current ring buffer as JSON
//   __msPacmanGetTrace()             // return a snapshot array
//
// Also auto-enables (with console mirror) when the page URL contains
// `?debug=mspacman`.

export type Direction = { dx: number; dy: number };
export type CardinalName = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Outcome =
  | 'committed'       // primary intent applied, direction changed
  | 'no-change'       // primary applied but same as current direction (same-axis)
  | 'fell-back'       // secondary intent applied (primary rejected)
  | 'buffered'        // no intent applied this frame; list kept for next frame
  | 'rejected';       // empty or unknown action

export interface PacSnapshot {
  x: number;          // tile-space X (float)
  y: number;          // tile-space Y (float)
  tileX: number;      // Math.round(x)
  tileY: number;      // Math.round(y)
  offX: number;       // x - tileX, sub-tile offset
  offY: number;       // y - tileY
  dir: Direction;
}

export interface DecisionEntry {
  kind: 'decision';
  t: number;
  frame: number;
  pac: PacSnapshot;
  action: number;
  actionName: string;
  qValues?: number[];
  intents: Direction[];
  pendingBefore: Direction[];
  legalNow: CardinalName[];
}

export interface ApplyEntry {
  kind: 'apply';
  t: number;
  frame: number;
  pac: PacSnapshot;
  tried: Direction[];
  committedIdx: number | null;   // index into `tried` that was applied, null if buffered
  outcome: Outcome;
  resultDir: Direction;
  pendingAfter: Direction[];
}

export interface EventEntry {
  kind: 'event';
  t: number;
  frame: number;
  pac: PacSnapshot;
  event:
    | 'hit_wall'
    | 'snap_center'
    | 'direction_changed'
    | 'lost_life'
    | 'stuck'
    | 'pellet'
    | 'power'
    | 'ghost_eaten';
  detail?: Record<string, unknown>;
}

export type TraceEntry = DecisionEntry | ApplyEntry | EventEntry;

const MAX_ENTRIES = 1000;
const buffer: TraceEntry[] = [];
let enabled = false;
let consoleMirror = false;

export function isTraceEnabled(): boolean {
  return enabled;
}

export function pushTrace(entry: TraceEntry): void {
  if (!enabled) return;
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  if (consoleMirror) {
    // eslint-disable-next-line no-console
    console.debug('[mspacman]', entry);
  }
}

export function clearTrace(): void {
  buffer.length = 0;
}

function downloadTrace(): string {
  const json = JSON.stringify(buffer, null, 2);
  if (typeof window === 'undefined') return json;

  if (buffer.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      '[mspacman] trace buffer is empty — enable tracing first ' +
        '(open page with ?debug=mspacman, or call __msPacmanEnableTrace())',
    );
    return json;
  }

  const filename = `mspacman-trace-${Date.now()}.json`;
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // eslint-disable-next-line no-console
    console.log(`[mspacman] dumped ${buffer.length} entries to ${filename}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[mspacman] download failed; JSON returned from this call:', err);
  }
  return json;
}

if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug') === 'mspacman') {
    enabled = true;
    consoleMirror = true;
  }
  const w = window as unknown as Record<string, unknown>;
  w.__msPacmanEnableTrace = (mirror = false) => {
    enabled = true;
    consoleMirror = mirror;
  };
  w.__msPacmanDisableTrace = () => {
    enabled = false;
    consoleMirror = false;
  };
  w.__msPacmanClearTrace = () => clearTrace();
  w.__msPacmanDumpTrace = () => downloadTrace();
  w.__msPacmanGetTrace = () => buffer.slice();

  // Diagnostics — lets us tell whether the module instance exposed on window
  // is the same one that the game engine imports `pushTrace` / `isTraceEnabled`
  // from. If these two get duplicated into separate chunks, enabling from the
  // console has no effect on the game-side pushes.
  w.__msPacmanDebugStatus = () => ({
    enabled,
    consoleMirror,
    bufferSize: buffer.length,
  });
  w.__msPacmanDebugPing = (tag = 'ping') => {
    // Force-push a synthetic entry bypassing the enabled check so we can
    // verify the module instance link independently of the enabled flag.
    buffer.push({
      kind: 'event',
      t: performance.now(),
      frame: -1,
      pac: { x: 0, y: 0, tileX: 0, tileY: 0, offX: 0, offY: 0, dir: { dx: 0, dy: 0 } },
      event: 'stuck',
      detail: { debugPing: true, tag },
    });
    if (buffer.length > MAX_ENTRIES) buffer.shift();
    return { pushed: true, bufferSize: buffer.length };
  };
}
