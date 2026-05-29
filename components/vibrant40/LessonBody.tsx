/**
 * Renders a lesson's Markdown body with explicit Tailwind styling.
 *
 * The project has no @tailwindcss/typography plugin, so we map each Markdown
 * element to site tokens (ink / inkSoft / orchidDeep) by hand. Exercise
 * lessons rely on headings + ordered/unordered lists rendering correctly.
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function LessonBody({ body }: { body: string }) {
  return (
    <div className="mb-10">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="font-serif text-2xl text-ink mt-8 mb-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-serif text-xl text-ink mt-6 mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-grayDeep mt-5 mb-2">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-base text-ink mb-4 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 list-disc space-y-1.5 pl-5 text-base text-ink leading-relaxed">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-base text-ink leading-relaxed">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-orchidDeep underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-5 border-l-2 border-orchidDeep pl-4 italic text-inkSoft">
              {children}
            </blockquote>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
