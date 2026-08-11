// Text transforms behind the product editor's toolbar.
//
// Kept free of React and the DOM: each takes the current text plus the
// selection and returns the next text plus where the caret should land, which
// is what makes them checkable without a browser.

const BULLET = /^(\s*)- /;
const NUMBERED = /^(\s*)\d+\. /;
const HEADING = /^(\s*)#{1,6} /;

const result = (value, from, to = from) => ({ value, selection: [from, to] });

/** Wrap the selection in `token`, or unwrap it if it's already wrapped. */
export const toggleInline = (value, start, end, token, placeholder) => {
  const selected = value.slice(start, end);
  const len = token.length;

  if (start >= len && value.slice(start - len, start) === token && value.slice(end, end + len) === token) {
    return result(value.slice(0, start - len) + selected + value.slice(end + len), start - len, end - len);
  }

  const text = selected || placeholder;
  const next = value.slice(0, start) + token + text + token + value.slice(end);
  // With no selection, select the placeholder so typing replaces it.
  return selected
    ? result(next, start + len, end + len)
    : result(next, start + len, start + len + text.length);
};

/**
 * Apply a line marker ('bullet' | 'ordered' | 'heading') to every line the
 * selection touches, toggling it off when they all already have it. The three
 * are mutually exclusive, so any existing marker is replaced.
 */
export const toggleLines = (value, start, end, kind) => {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = value.indexOf('\n', end);
  const to = lineEnd === -1 ? value.length : lineEnd;

  const lines = value.slice(from, to).split('\n');
  const pattern = kind === 'ordered' ? NUMBERED : kind === 'bullet' ? BULLET : HEADING;
  const marker = (i) => (kind === 'ordered' ? `${i + 1}. ` : kind === 'bullet' ? '- ' : '## ');
  const allMarked = lines.every((line) => !line.trim() || pattern.test(line));

  const block = lines
    .map((line, i) => {
      if (!line.trim()) return line;
      const bare = line.replace(BULLET, '$1').replace(NUMBERED, '$1').replace(HEADING, '$1');
      return allMarked ? bare : bare.replace(/^(\s*)/, `$1${marker(i)}`);
    })
    .join('\n');

  return result(value.slice(0, from) + block + value.slice(to), from, from + block.length);
};

export const insertLink = (value, start, end) => {
  const selected = value.slice(start, end);
  const text = selected || 'link text';
  const next = `${value.slice(0, start)}[${text}](https://)${value.slice(end)}`;
  // With text already selected the URL is what's left to fill in, so put the
  // caret there; otherwise select the placeholder label first.
  const afterUrl = start + text.length + 3 + 'https://'.length;
  return selected ? result(next, afterUrl) : result(next, start + 1, start + 1 + text.length);
};

/**
 * Enter inside a list continues it; Enter on an empty marker ends it. Returns
 * null when the caret isn't in a list, meaning the keypress should fall
 * through to the browser's own handling.
 */
export const continueList = (value, caret) => {
  const from = value.lastIndexOf('\n', caret - 1) + 1;
  const line = value.slice(from, caret);

  const bullet = line.match(BULLET);
  const numbered = line.match(NUMBERED);
  if (!bullet && !numbered) return null;

  const marker = bullet ? `${bullet[1]}- ` : `${numbered[1]}${parseInt(line.trim(), 10) + 1}. `;

  // Nothing typed after the marker — the vendor is done with the list.
  if (line.trim() === marker.trim() || (numbered && !line.slice(numbered[0].length).trim())) {
    return result(value.slice(0, from) + value.slice(caret), from);
  }

  const at = caret + 1 + marker.length;
  return result(`${value.slice(0, caret)}\n${marker}${value.slice(caret)}`, at);
};
