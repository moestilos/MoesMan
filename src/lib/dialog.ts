/**
 * Helper de diálogos personalizados. Dispara eventos que DialogRoot escucha.
 * Devuelve Promise resuelta cuando usuario responde.
 */

type DialogKind = 'confirm' | 'alert';

interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger' | 'brand';
}

interface DialogEventDetail extends DialogOptions {
  kind: DialogKind;
  resolve: (v: boolean) => void;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function showConfirm(options: string | DialogOptions): Promise<boolean> {
  const opts: DialogOptions = typeof options === 'string' ? { message: options } : options;
  if (!isBrowser()) return Promise.resolve(false);
  return new Promise((resolve) => {
    const detail: DialogEventDetail = { ...opts, kind: 'confirm', resolve };
    window.dispatchEvent(new CustomEvent<DialogEventDetail>('ako:dialog', { detail }));
  });
}

export function showAlert(options: string | DialogOptions): Promise<void> {
  const opts: DialogOptions = typeof options === 'string' ? { message: options } : options;
  if (!isBrowser()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const detail: DialogEventDetail = { ...opts, kind: 'alert', resolve: () => resolve() };
    window.dispatchEvent(new CustomEvent<DialogEventDetail>('ako:dialog', { detail }));
  });
}

export type { DialogEventDetail, DialogOptions };
