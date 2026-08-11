// Allowlist sanitiser for the product copy vendors write.
//
// Product descriptions are stored as HTML and rendered with
// `dangerouslySetInnerHTML`, so anything a vendor can save ends up executing
// in a shopper's browser. Keep this to the tags the markdown editor can
// actually produce — no ids, no classes, no styles, no event handlers.
//
// This runs at render time rather than only at save time on purpose: the API
// accepts raw HTML, so a crafted PATCH bypasses the editor entirely.

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'CODE', 'PRE',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'HR',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'A', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
]);

const ALLOWED_ATTRS = { A: ['href', 'title'] };

const SAFE_HREF = /^(https?:|mailto:|tel:|\/|#)/i;

export const sanitizeHtml = (html) => {
  if (!html) return '';
  if (typeof window === 'undefined') return '';

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstChild;

  const walk = (node) => {
    // Snapshot: unwrapping a child mutates the live childNodes list.
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) continue;

      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        continue;
      }

      if (!ALLOWED_TAGS.has(child.tagName)) {
        // Unwrap rather than delete, so a stray <div> or <span> around real
        // copy doesn't take the copy with it. <script>/<style> are the
        // exception — their text content is the payload.
        if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') {
          child.remove();
        } else {
          walk(child);
          child.replaceWith(...child.childNodes);
        }
        continue;
      }

      const allowed = ALLOWED_ATTRS[child.tagName] || [];
      for (const attr of Array.from(child.attributes)) {
        if (!allowed.includes(attr.name.toLowerCase())) child.removeAttribute(attr.name);
      }

      if (child.tagName === 'A') {
        const href = child.getAttribute('href') || '';
        if (!SAFE_HREF.test(href.trim())) child.removeAttribute('href');
        child.setAttribute('rel', 'nofollow noopener noreferrer');
        child.setAttribute('target', '_blank');
      }

      walk(child);
    }
  };

  walk(root);
  return root.innerHTML;
};

export default sanitizeHtml;
