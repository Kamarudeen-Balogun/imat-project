// Renders a broadcast body with the exact same typography as the public
// newsroom post. The composer preview and the newsroom page both use this
// component, so what the author sees while writing is what readers get.
import { renderMarkdownToHtml } from "@/lib/markdown";

export default function ArticleBody({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  return (
    <div
      className={`article-body ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(markdown) }}
    />
  );
}
