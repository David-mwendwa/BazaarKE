// Markdown <-> HTML bridge for the product form.
//
// Descriptions are *stored* as HTML (that's what the storefront renders, and
// what the scraped catalog already contains), but HTML is miserable to edit in
// a textarea. So the form converts to markdown on load and back to HTML on
// save; the database format never changes.
//
// The round trip is lossy by design: turndown drops anything the allowlist in
// sanitizeHtml.js wouldn't have kept anyway.

import { marked } from 'marked';
import TurndownService from 'turndown';
import { sanitizeHtml } from './sanitizeHtml.js';

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
});

marked.setOptions({ breaks: true, gfm: true });

export const htmlToMarkdown = (html) => {
  if (!html) return '';
  // Scraped copy is littered with \r\n inside block tags, which turndown
  // faithfully preserves as hard line breaks in the middle of sentences.
  const normalised = String(html).replace(/\r\n?/g, '\n');

  // If there are no tags at all it's already plain text (or markdown someone
  // pasted) — running it through turndown would escape the markdown syntax.
  if (!/<[a-z][\s\S]*>/i.test(normalised)) return normalised;

  return turndown.turndown(normalised).trim();
};

export const markdownToHtml = (markdown) => {
  if (!markdown || !markdown.trim()) return '';
  return sanitizeHtml(marked.parse(markdown.trim())).trim();
};

// Length checks (and the short-description cap) should count what a shopper
// reads, not the markup around it.
export const markdownToPlainText = (markdown) => {
  const html = markdownToHtml(markdown);
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
};
