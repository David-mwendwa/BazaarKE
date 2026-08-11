import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Bold, Italic, Heading2, List, ListOrdered, Link2 } from 'lucide-react';
import { Label } from '../../../components/ui/Label';
import { Textarea } from '../../../components/ui/Textarea';
import { markdownToHtml, markdownToPlainText } from '../../../lib/richText.js';
import { toggleInline, toggleLines, insertLink, continueList } from '../../../lib/markdownCommands.js';

const TABS = [
  { id: 'write', label: 'Write' },
  { id: 'preview', label: 'Preview' },
];

// Tooltips should name the key the vendor actually presses.
const MOD = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform) ? '⌘' : 'Ctrl+';

/**
 * Rich-text editor for copy that is stored as HTML.
 *
 * The parent holds markdown in state and converts once on submit — the preview
 * here renders the same `markdownToHtml` output that gets saved, so what a
 * vendor sees is what a shopper gets.
 *
 * Vendors are not expected to know markdown: the toolbar, the shortcuts
 * (Cmd/Ctrl+B / I / K) and Enter-continues-the-list mean the syntax is
 * something they end up with, not something they have to type.
 *
 * `recommendedLength` is advisory, not enforced — it counts rendered
 * characters rather than markdown source (`**Fast**` is four characters of
 * copy, not eight), and most of the seeded catalog is well over any sensible
 * cap, so blocking on it would make those products unsavable.
 */
export const MarkdownField = ({ id, label, value, onChange, rows = 6, recommendedLength, hint }) => {
  const [tab, setTab] = useState('write');
  const textareaRef = useRef(null);
  // Where the caret should land after an edit. React re-renders the textarea
  // from `value`, which resets the selection, so it has to be reapplied after
  // the DOM updates rather than at the point of the edit.
  const pendingSelection = useRef(null);

  useLayoutEffect(() => {
    const target = pendingSelection.current;
    if (!target || !textareaRef.current) return;
    pendingSelection.current = null;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(target[0], target[1]);
  });

  // Returning from Preview should put the caret back in the textarea — but not
  // on mount, or the first field on the form would grab focus from the page.
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current && tab === 'write' && textareaRef.current) textareaRef.current.focus();
    mounted.current = true;
  }, [tab]);

  const html = useMemo(() => (tab === 'preview' ? markdownToHtml(value) : ''), [tab, value]);
  const length = useMemo(
    () => (recommendedLength ? markdownToPlainText(value).length : 0),
    [recommendedLength, value],
  );
  const over = recommendedLength ? length > recommendedLength : false;

  const commit = (next, selection) => {
    pendingSelection.current = selection;
    onChange(next);
  };

  // Each command is a pure (value, start, end) -> { value, selection }
  // transform in lib/markdownCommands.js; this just feeds it the live
  // selection and commits the result.
  const run = (command) => {
    const el = textareaRef.current;
    if (!el) return;
    const next = command(value, el.selectionStart, el.selectionEnd);
    if (next) commit(next.value, next.selection);
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey) {
      const shortcut = {
        b: (v, s, en) => toggleInline(v, s, en, '**', 'bold text'),
        i: (v, s, en) => toggleInline(v, s, en, '_', 'italic text'),
        k: insertLink,
      }[e.key.toLowerCase()];

      if (shortcut) {
        e.preventDefault();
        run(shortcut);
        return;
      }
    }

    // Enter continues the list the caret is in — and an empty marker ends it,
    // which is the behaviour every other editor has trained people to expect.
    if (e.key === 'Enter' && !e.shiftKey && e.target.selectionStart === e.target.selectionEnd) {
      const next = continueList(value, e.target.selectionStart);
      if (next) {
        e.preventDefault();
        commit(next.value, next.selection);
      }
    }
  };

  const tools = [
    { icon: Bold, label: 'Bold', hint: `${MOD}B`, command: (v, s, e) => toggleInline(v, s, e, '**', 'bold text') },
    { icon: Italic, label: 'Italic', hint: `${MOD}I`, command: (v, s, e) => toggleInline(v, s, e, '_', 'italic text') },
    { icon: Heading2, label: 'Heading', command: (v, s, e) => toggleLines(v, s, e, 'heading') },
    { icon: List, label: 'Bulleted list', command: (v, s, e) => toggleLines(v, s, e, 'bullet') },
    { icon: ListOrdered, label: 'Numbered list', command: (v, s, e) => toggleLines(v, s, e, 'ordered') },
    { icon: Link2, label: 'Link', hint: `${MOD}K`, command: insertLink },
  ];

  return (
    <div className='space-y-1.5'>
      <Label htmlFor={id}>{label}</Label>

      {/* The whole editor is the "field", so the focus ring goes on the
          wrapper — same border, ring colour and offset as a plain Input, so
          clicking between them doesn't change the highlight. */}
      <div className='overflow-hidden rounded-md border border-input bg-white ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 dark:bg-gray-800'>
        <div className='flex flex-wrap items-center gap-1 border-b border-input bg-gray-50 px-1.5 py-1 dark:bg-gray-900/40'>
          {tools.map((tool) => (
            <button
              key={tool.label}
              type='button'
              // Toolbar buttons must not steal focus, or the selection they act
              // on is gone by the time the handler runs.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(tool.command)}
              disabled={tab === 'preview'}
              title={tool.hint ? `${tool.label} (${tool.hint})` : tool.label}
              aria-label={tool.label}
              className='rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'>
              <tool.icon className='h-4 w-4' aria-hidden='true' />
            </button>
          ))}

          <div className='ml-auto flex rounded-md p-0.5'>
            {TABS.map((t) => (
              <button
                key={t.id}
                type='button'
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-white text-primary-700 shadow-sm dark:bg-gray-700 dark:text-primary-400'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'write' ? (
          <Textarea
            id={id}
            ref={textareaRef}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className='rounded-none border-0 bg-transparent text-[13px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0'
            placeholder={'Describe the product.\n\nUse the buttons above to add bold text, headings or a list of features.'}
          />
        ) : (
          <div
            style={{ minHeight: `${rows * 1.6 + 1}rem` }}
            className='prose prose-sm dark:prose-invert max-w-none px-3 py-2'
            dangerouslySetInnerHTML={{
              __html: html || '<p class="text-sm text-muted-foreground">Nothing to preview yet.</p>',
            }}
          />
        )}
      </div>

      <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-1'>
        <p className='text-xs text-muted-foreground'>
          {hint || 'Select text and use the buttons above to format it.'}
        </p>
        {recommendedLength ? (
          <p
            className={`text-xs tabular-nums ${over ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'}`}
            title={over ? `Longer than the recommended ${recommendedLength} characters` : undefined}>
            {length} / {recommendedLength} recommended
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default MarkdownField;
