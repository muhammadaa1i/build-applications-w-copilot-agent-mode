import type { ReactNode } from 'react';

export type ApiState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

export const loadingState = { status: 'loading' } as const;

export function errorState(error: unknown): { status: 'error'; message: string } {
  return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
}

type Props<T> = {
  state: ApiState<T>;
  label: string;
  isEmpty: (data: T) => boolean;
  emptyMessage: string;
  children: (data: T) => ReactNode;
};

// Renders the loading, error, empty and success states shared by every capability view.
export function ApiStateView<T>({ state, label, isEmpty, emptyMessage, children }: Props<T>) {
  if (state.status === 'loading') return <p role="status">Loading {label}…</p>;
  if (state.status === 'error') return <div role="alert" className="alert alert-danger">Unable to load {label}: {state.message}</div>;
  if (isEmpty(state.data)) return <p className="text-muted">{emptyMessage}</p>;
  return <>{children(state.data)}</>;
}
