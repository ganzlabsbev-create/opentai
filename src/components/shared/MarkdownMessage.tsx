import ReactMarkdown from "react-markdown";
import { CodeBlock } from "@/components/shared/CodeBlock";

interface MarkdownMessageProps {
  text: string;
}

export function MarkdownMessage({ text }: MarkdownMessageProps) {
  return (
    <div className="text-[14.5px] leading-[1.65] text-text">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="my-1.5">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          code: ({ className, children, ...props }) => {
            const isBlock = /language-(\w+)/.exec(className || "");
            if (!isBlock) {
              return (
                <code className="rounded-[5px] bg-surface-elevated px-1.5 py-0.5 font-mono text-[0.9em]" {...props}>
                  {children}
                </code>
              );
            }
            return <CodeBlock lang={isBlock[1]} code={String(children).replace(/\n$/, "")} />;
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
