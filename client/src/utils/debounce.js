/**
 * Debounce utility
 */
export const debounce = (fn, ms) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
};

/**
 * Create a debounced function that can be cleaned up
 */
export const useDebouncedCallback = (callback, delay) => {
  let timeoutId;

  const debouncedFn = (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };

  const cancel = () => clearTimeout(timeoutId);

  return [debouncedFn, cancel];
};
