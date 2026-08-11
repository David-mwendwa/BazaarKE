import { createContext, useContext } from 'react';

/**
 * The ask-before-you-do plumbing. The provider that fills this in lives in
 * `ConfirmProvider.jsx` — context and hooks are split out here so that file
 * exports nothing but a component, which is what Fast Refresh wants.
 */
export const ConfirmContext = createContext(null);

const use = (key, hook) => {
  const value = useContext(ConfirmContext);
  if (!value) throw new Error(`${hook} must be used inside a ConfirmProvider`);
  return value[key];
};

/**
 * Ask a yes/no question. Resolves `true` only if they said yes.
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title, message, confirmLabel, tone: 'danger' }))) return;
 */
export const useConfirm = () => use('confirm', 'useConfirm');

/**
 * Ask for a value. Resolves the string, or `null` if they backed out —
 * deliberately not `''`, so an optional field left blank is still an answer
 * and can be told apart from a cancel.
 *
 *   const prompt = usePrompt();
 *   const reason = await prompt({ title, label, options });
 *   if (reason === null) return;
 */
export const usePrompt = () => use('prompt', 'usePrompt');
