/* eslint-disable no-console */
type Level = 'info' | 'warn' | 'error' | 'debug';

function emit(level: Level, msg: string, meta?: unknown) {
  const ts = new Date().toISOString();
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({ ts, level, msg, meta }));
  } else {
    const metaStr = meta !== undefined ? ' ' + JSON.stringify(meta) : '';
    console.log(`[${ts}] ${level.toUpperCase()} ${msg}${metaStr}`);
  }
}

export const logger = {
  info: (msg: string, meta?: unknown) => emit('info', msg, meta),
  warn: (msg: string, meta?: unknown) => emit('warn', msg, meta),
  error: (msg: string, meta?: unknown) => emit('error', msg, meta),
  debug: (msg: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== 'production') emit('debug', msg, meta);
  },
};
