import { useEffect, useState } from 'react';

// Keeps a search box responsive while the list behind it is server-paged —
// without this every keystroke fires a request.
export const useDebouncedValue = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebouncedValue;
