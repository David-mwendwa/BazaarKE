import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmContext } from './ConfirmContext.js';

/**
 * Replaces `window.confirm` and `window.prompt`, which can't be styled, ignore
 * dark mode, print the page's origin above the message, and freeze the whole
 * tab while they're open — including the toasts and re-renders behind them.
 *
 * Built on the native `<dialog>` element rather than a hand-rolled overlay, so
 * the parts that are easy to get wrong come from the browser: top-layer
 * stacking (no z-index race with the sticky table header), the backdrop, focus
 * trapping, inert background content, and Escape to dismiss.
 *
 * Idea borrowed from InkEngine's ConfirmContext; the prompt half is new, since
 * two call sites here need a value rather than a yes/no.
 */

const TONES = {
  danger: {
    icon: AlertTriangle,
    iconClass: 'bg-red-100 text-destructive dark:bg-red-950 dark:text-red-400',
    variant: 'danger',
  },
  primary: {
    icon: HelpCircle,
    iconClass:
      'bg-primary-100 text-primary-600 dark:bg-primary-950 dark:text-primary-400',
    variant: 'primary',
  },
};

export const ConfirmProvider = ({ children }) => {
  const [request, setRequest] = useState(null);
  const [value, setValue] = useState('');
  const [working, setWorking] = useState(false);
  const dialogRef = useRef(null);
  const fieldRef = useRef(null);
  // Held in a ref, not state: the promise has to settle exactly once, from
  // whichever path closes the dialog — button, backdrop, or Escape.
  const resolverRef = useRef(null);

  const settle = useCallback((answer) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setWorking(false);
    setRequest(null);
    if (resolve) resolve(answer);
  }, []);

  const open = useCallback((options, kind) => {
    return new Promise((resolve) => {
      // A second call while one is open would strand the first promise
      // forever, so answer it "no" before taking over.
      if (resolverRef.current) resolverRef.current(kind === 'prompt' ? null : false);
      resolverRef.current = resolve;
      const next = typeof options === 'string' ? { message: options } : { ...options };
      setValue(next.initialValue ?? '');
      setRequest({ ...next, kind });
    });
  }, []);

  const api = useMemo(
    () => ({
      confirm: (options) => open(options, 'confirm'),
      prompt: (options) => open(options, 'prompt'),
    }),
    [open],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (request && !dialog.open) dialog.showModal();
    if (!request && dialog.open) dialog.close();
  }, [request]);

  // A prompt should land the caret in the field; a confirm should not put
  // focus anywhere near the destructive button.
  useEffect(() => {
    if (request?.kind === 'prompt') fieldRef.current?.focus();
  }, [request]);

  const isPrompt = request?.kind === 'prompt';
  const tone = TONES[request?.tone] ?? (isPrompt ? TONES.primary : TONES.danger);
  const ToneIcon = tone.icon;
  const options = request?.options;
  const missing = Boolean(request?.required) && !value.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (missing) return;
    const answer = isPrompt ? value.trim() : true;

    // `onConfirm` lets a caller hold the dialog up with a spinner while the
    // request runs, rather than dismissing into an unexplained pause.
    if (request.onConfirm) {
      setWorking(true);
      try {
        await request.onConfirm(answer);
      } finally {
        settle(answer);
      }
      return;
    }
    settle(answer);
  };

  const cancel = () => settle(isPrompt ? null : false);

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby='confirm-title'
        // `close` fires for Escape and for every other route out. All of them
        // mean no.
        onClose={() => !working && cancel()}
        onClick={(e) => {
          // <dialog> spans the viewport, so a click landing on the element
          // itself rather than the panel inside it is a backdrop click.
          if (e.target === dialogRef.current && !working) cancel();
        }}
        className='confirm-dialog w-[calc(100vw-2rem)] max-w-md rounded-lg border border-input bg-card p-0 text-card-foreground shadow-card-hover'>
        {request && (
          <form onSubmit={submit} className='p-6'>
            <div className='flex gap-4'>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.iconClass}`}>
                <ToneIcon className='h-5 w-5' aria-hidden='true' />
              </span>
              <div className='min-w-0 flex-1'>
                <h2 id='confirm-title' className='text-base font-semibold text-foreground'>
                  {request.title ?? 'Are you sure?'}
                </h2>
                {request.message && (
                  <p className='mt-1 break-words text-sm text-muted-foreground'>
                    {request.message}
                  </p>
                )}

                {isPrompt && (
                  <label className='mt-4 block'>
                    {request.label && (
                      <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                        {request.label}
                      </span>
                    )}
                    {options ? (
                      // A fixed set of answers is a select, not a text box —
                      // `window.prompt` could only ever ask you to type one of
                      // them correctly from memory.
                      <select
                        ref={fieldRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground'>
                        <option value=''>{request.placeholder ?? 'Choose one…'}</option>
                        {options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        ref={fieldRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={request.placeholder}
                        maxLength={request.maxLength}
                        className='h-9'
                      />
                    )}
                  </label>
                )}
              </div>
            </div>

            <div className='mt-6 flex justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={cancel}
                disabled={working}
                // The destructive button never holds focus on open — a stray
                // Enter should back out, not delete something.
                autoFocus={!isPrompt}>
                {request.cancelLabel ?? 'Cancel'}
              </Button>
              <Button type='submit' variant={tone.variant} disabled={working || missing}>
                {working && <Loader2 className='mr-2 h-4 w-4 animate-spin' aria-hidden='true' />}
                {request.confirmLabel ?? (isPrompt ? 'Continue' : 'Confirm')}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
};

export default ConfirmProvider;
