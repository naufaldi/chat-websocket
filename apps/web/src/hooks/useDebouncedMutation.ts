import { useCallback, useRef, useState } from 'react';
import type { UseMutateFunction } from '@tanstack/react-query';

interface UseDebouncedMutationOptions<TData, TError, TVariables> {
  mutate: UseMutateFunction<TData, TError, TVariables, unknown>;
  debounceMs?: number;
  onError?: (_error: TError, _variables: TVariables) => void;
  onSuccess?: (_data: TData, _variables: TVariables) => void;
}

interface UseDebouncedMutationReturn<_TData, _TError, TVariables> {
  debouncedMutate: (variables: TVariables) => void;
  isDebouncing: boolean;
  flush: () => void;
  cancel: () => void;
  pendingVariables: TVariables | null;
}

/**
 * Hook for debouncing mutation calls.
 * Useful for auto-save functionality where rapid changes should be batched.
 *
 * @example
 * ```typescript
 * const mutation = useUpdateProfileSettings();
 * const debounced = useDebouncedMutation({
 *   mutate: mutation.mutate,
 *   debounceMs: 500,
 * });
 *
 * // Call rapidly - only last call executes after 500ms
 * debounced.debouncedMutate({ displayName: 'A' });
 * debounced.debouncedMutate({ displayName: 'B' });
 * debounced.debouncedMutate({ displayName: 'C' }); // Only this executes
 * ```
 */
export function useDebouncedMutation<TData, TError, TVariables>({
  mutate,
  debounceMs = 500,
  onError,
  onSuccess,
}: UseDebouncedMutationOptions<TData, TError, TVariables>): UseDebouncedMutationReturn<TData, TError, TVariables> {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingVariablesRef = useRef<TVariables | null>(null);
  const [isDebouncing, setIsDebouncing] = useState(false);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingVariablesRef.current = null;
    setIsDebouncing(false);
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const variables = pendingVariablesRef.current;
    if (variables) {
      pendingVariablesRef.current = null;
      setIsDebouncing(false);
      mutate(variables, {
        onError: onError ? (error) => onError(error, variables) : undefined,
        onSuccess: onSuccess ? (data) => onSuccess(data, variables) : undefined,
      });
    }
  }, [mutate, onError, onSuccess]);

  const debouncedMutate = useCallback(
    (variables: TVariables) => {
      // Store the latest variables
      pendingVariablesRef.current = variables;
      setIsDebouncing(true);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        const vars = pendingVariablesRef.current;
        if (vars) {
          pendingVariablesRef.current = null;
          setIsDebouncing(false);
          mutate(vars, {
            onError: onError ? (error) => onError(error, vars) : undefined,
            onSuccess: onSuccess ? (data) => onSuccess(data, vars) : undefined,
          });
        }
      }, debounceMs);
    },
    [debounceMs, mutate, onError, onSuccess]
  );

  return {
    debouncedMutate,
    isDebouncing,
    flush,
    cancel,
    pendingVariables: pendingVariablesRef.current,
  };
}

/**
 * Combines a mutation hook with debouncing for auto-save functionality.
 * Returns both the debounced mutate function and the original mutation state.
 *
 * @example
 * ```typescript
 * const { debouncedMutate, isDebouncing, isPending } = useAutoSaveMutation(
 *   useUpdateProfileSettings(),
 *   { debounceMs: 500 }
 * );
 * ```
 */
export function useAutoSaveMutation<TData, TError, TVariables>(
  mutation: {
    mutate: UseMutateFunction<TData, TError, TVariables, unknown>;
    isPending: boolean;
    isError: boolean;
    error: TError | null;
    isSuccess: boolean;
    data: TData | undefined;
  },
  options?: { debounceMs?: number }
) {
  const debounced = useDebouncedMutation({
    mutate: mutation.mutate,
    debounceMs: options?.debounceMs ?? 500,
  });

  return {
    ...debounced,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
}
