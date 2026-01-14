export const isDebugEnabled =
  process.env.NEXT_PUBLIC_DEBUG === 'true';

export const debugLog = (...args: unknown[]) => {
  if (isDebugEnabled) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

export const debugError = (...args: unknown[]) => {
  if (isDebugEnabled) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
};
