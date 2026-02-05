
import { useEffect } from 'react';

export function useDebounce(callback: Function, delay: number, dependencies: any[]) {
  useEffect(() => {
    const handler = setTimeout(() => {
      callback();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(dependencies), delay]);
}

    