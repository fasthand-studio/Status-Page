import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/cn';

export function Markdown({
  children,
  className,
  invert = false,
}: {
  children: string;
  className?: string;
  invert?: boolean;
}) {
  return (
    <div className={cn('prose-fh', invert && 'prose-fh-invert', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => {
            const external = props.href?.startsWith('http');
            return (
              <a
                {...props}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
              />
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
