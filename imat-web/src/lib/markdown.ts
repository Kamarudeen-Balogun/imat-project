// Safe, small Markdown subset for broadcast bodies.
//
// Supports: ## / ### headings, **bold**, *italic*, `code`, [links](https://…),
// ![images](https://…), - bullet lists, 1. numbered lists, > quotes and ---
// rules. Everything else is escaped plain text, so no raw HTML can ever
// reach a reader — the renderer escapes first and only ever emits its own
// tags. Plain-text bodies written before Markdown existed render exactly
// as they did before (blank-line separated paragraphs).

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeUrl(url: string): boolean {
  return /^https?:\/\/[^\s"'<>]+$/i.test(url);
}

function renderInline(escapedText: string): string {
  let html = escapedText;

  // Images first so their ![…](…) syntax is not eaten by the link rule.
  html = html.replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g, (_match, alt: string, url: string) =>
    isSafeUrl(url)
      ? `<img src="${url}" alt="${alt}" loading="lazy" />`
      : alt
  );

  html = html.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_match, text: string, url: string) =>
    isSafeUrl(url)
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`
      : text
  );

  html = html.replace(/`([^`]+)`/g, (_match, code: string) => `<code>${code}</code>`);
  html = html.replace(/\*\*([^*]+)\*\*/g, (_match, text: string) => `<strong>${text}</strong>`);
  html = html.replace(/\*([^*]+)\*/g, (_match, text: string) => `<em>${text}</em>`);

  return html;
}

export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/^-{3,}\s*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function renderMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];

  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let quoteLines: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(`<p>${renderInline(escapeHtml(paragraph.join(" ")))}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      const tag = listOrdered ? "ol" : "ul";
      blocks.push(
        `<${tag}>${listItems.map((item) => `<li>${renderInline(escapeHtml(item))}</li>`).join("")}</${tag}>`
      );
      listItems = [];
    }
  };

  const flushQuote = () => {
    if (quoteLines.length > 0) {
      blocks.push(`<blockquote>${renderInline(escapeHtml(quoteLines.join(" ")))}</blockquote>`);
      quoteLines = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      flushQuote();
      const level = heading[1].length === 2 ? "h2" : "h3";
      blocks.push(`<${level}>${renderInline(escapeHtml(heading[2]))}</${level}>`);
      continue;
    }

    if (/^---+$/.test(line)) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push("<hr />");
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      quoteLines.push(quote[1]);
      continue;
    }
    flushQuote();

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (!listOrdered && listItems.length > 0) {
        // Continuing an unordered list.
      } else if (listOrdered) {
        flushList();
      }
      listOrdered = false;
      listItems.push(bullet[1]);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (listOrdered && listItems.length > 0) {
        // Continuing an ordered list.
      } else if (!listOrdered && listItems.length > 0) {
        flushList();
      }
      listOrdered = true;
      listItems.push(ordered[1]);
      continue;
    }
    flushList();

    const standaloneImage = line.match(/^!\[([^\]]*)\]\((https?:[^)\s]+)\)$/);
    if (standaloneImage) {
      flushParagraph();
      blocks.push(
        isSafeUrl(standaloneImage[2])
          ? `<figure><img src="${standaloneImage[2]}" alt="${escapeHtml(standaloneImage[1])}" loading="lazy" /></figure>`
          : `<p>${renderInline(escapeHtml(standaloneImage[1]))}</p>`
      );
      continue;
    }

    paragraph.push(rawLine.trim());
  }

  flushParagraph();
  flushList();
  flushQuote();

  return blocks.join("\n");
}
