import type { Options } from "rehype-highlight";

import styled from "styled-components";
import { useRemark } from "react-remark";
import { visit } from "unist-util-visit";
import rehypeHighlight from "rehype-highlight";
import { memo, useEffect, useRef } from "react";

import { useReclineState } from "@webview-ui/context/ReclineStateContext";

import { CODE_BLOCK_BG_COLOR } from "./CodeBlock";


interface MarkdownBlockProps {
  markdown?: string;
  isPartial?: boolean;
}

const AnimatedText = styled.div<{ isPartial: boolean }>`
  position: relative;
  transform: translateZ(0);
  will-change: mask-position;
  backface-visibility: hidden;

  ${props => props.isPartial
    ? `
    mask-image: linear-gradient(
      to right,
      transparent 0%,
      rgba(0, 0, 0, 0.2) 10px,
      rgba(0, 0, 0, 0.7) 20px,
      black 40px
    );
    mask-size: 200% 100%;
    mask-position: -100% 0;
    animation: revealText 1s ease-out forwards;

    &.new-chunk {
      animation: none;
      mask-position: -100% 0;
      animation: revealText 1s ease-out forwards;
    }

    @keyframes revealText {
      from {
        mask-position: -100% 0;
      }
      to {
        mask-position: 0% 0;
      }
    }
    `
    : ""}

  & > * {
    opacity: ${props => props.isPartial ? "0.98" : "1"};
    transition: opacity 0.2s ease-out;
  }
`;

/**
 * Custom remark plugin that converts plain URLs in text into clickable links
 *
 * The original bug: We were converting text nodes into paragraph nodes,
 * which broke the markdown structure because text nodes should remain as text nodes
 * within their parent elements (like paragraphs, list items, etc.).
 * This caused the entire content to disappear because the structure became invalid.
 */
function remarkUrlToLink() {
  return (tree: any) => {
    // Visit all "text" nodes in the markdown AST (Abstract Syntax Tree)
    visit(tree, "text", (node: any, index, parent) => {
      const urlRegex = /https?:\/\/[^\s<>)"]+/g;
      const matches = node.value.match(urlRegex);
      if (!matches)
        return;

      const parts = node.value.split(urlRegex);
      const children: any[] = [];

      parts.forEach((part: string, i: number) => {
        if (part)
          children.push({ type: "text", value: part });
        if (matches[i]) {
          children.push({
            type: "link",
            url: matches[i],
            children: [{ type: "text", value: matches[i] }]
          });
        }
      });

      // Fix: Instead of converting the node to a paragraph (which broke things),
      // we replace the original text node with our new nodes in the parent's children array.
      // This preserves the document structure while adding our links.
      if (parent) {
        parent.children.splice(index, 1, ...children);
      }
    });
  };
}

const StyledMarkdown = styled.div`
	pre {
		background-color: ${CODE_BLOCK_BG_COLOR};
		border-radius: 3px;
		margin: 13x 0;
		padding: 10px 10px;
		max-width: calc(100vw - 20px);
		overflow-x: auto;
		overflow-y: hidden;
	}

	pre > code {
		.hljs-deletion {
			background-color: var(--vscode-diffEditor-removedTextBackground);
			display: inline-block;
			width: 100%;
		}
		.hljs-addition {
			background-color: var(--vscode-diffEditor-insertedTextBackground);
			display: inline-block;
			width: 100%;
		}
	}

	code {
		span.line:empty {
			display: none;
		}
		word-wrap: break-word;
		border-radius: 3px;
		background-color: ${CODE_BLOCK_BG_COLOR};
		font-size: var(--vscode-editor-font-size, var(--vscode-font-size, 12px));
		font-family: var(--vscode-editor-font-family);
	}

	code:not(pre > code) {
		font-family: var(--vscode-editor-font-family, monospace);
		color: var(--vscode-textPreformat-foreground, #f78383);
		background-color: var(--vscode-textCodeBlock-background, #1e1e1e);
		padding: 0px 2px;
		border-radius: 3px;
		border: 1px solid var(--vscode-textSeparator-foreground, #424242);
		white-space: pre-line;
		word-break: break-word;
		overflow-wrap: anywhere;
	}

	font-family:
		var(--vscode-font-family),
		system-ui,
		-apple-system,
		BlinkMacSystemFont,
    "Fira Code",
		"Segoe UI",
		Roboto,
		Oxygen,
		Ubuntu,
		Cantarell,
		"Open Sans",
		"Helvetica Neue",
		sans-serif;
	font-size: var(--vscode-font-size, 13px);

	p,
	li,
	ol,
	ul {
		line-height: 1.25;
	}

	ol,
	ul {
		padding-left: 2.5em;
		margin-left: 0;
	}

	p {
		white-space: pre-wrap;
	}

	a {
		text-decoration: none;
	}
	a {
		&:hover {
			text-decoration: underline;
		}
	}
`;

const StyledPre = styled.pre<{ theme: any }>`
	& .hljs {
		color: var(--vscode-editor-foreground, #fff);
	}

	${props =>
    Object.keys(props.theme)
      .map((key, index) => {
        return `
      & ${key} {
        color: ${props.theme[key]};
      }
    `;
      })
      .join("")}
`;

const MarkdownBlock = memo(({ markdown, isPartial }: MarkdownBlockProps): JSX.Element => {
  const { theme } = useReclineState();
  const prevMarkdownRef = useRef(markdown);
  const [reactContent, setMarkdown] = useRemark({
    remarkPlugins: [
      remarkUrlToLink,
      () => {
        return (tree) => {
          visit(tree, "code", (node: any) => {
            if (!node.lang) {
              node.lang = "javascript";
            }
            else if (node.lang.includes(".")) {
              node.lang = node.lang.split(".").slice(-1)[0];
            }
          });
        };
      }
    ],
    rehypePlugins: [
      rehypeHighlight as any,
      {
        // languages: {},
      } as Options
    ],
    rehypeReactOptions: {
      components: {
        pre: ({ node, ...preProps }: any) => <StyledPre {...preProps} theme={theme} />
      }
    }
  });

  useEffect(() => {
    setMarkdown(markdown || "");
  }, [markdown, setMarkdown, theme]);

  useEffect(() => {
    if (!isPartial || markdown === prevMarkdownRef.current) {
      return;
    }

    const element = document.querySelector(".animated-text") as HTMLElement;
    if (element) {
      element.classList.remove("new-chunk");
      // Force reflow
      void element.offsetWidth;
      element.classList.add("new-chunk");
    }
    prevMarkdownRef.current = markdown;
  }, [markdown, isPartial]);

  return (
    <div style={{}}>
      <StyledMarkdown>
        <AnimatedText className="animated-text" isPartial={isPartial ?? false}>
          {reactContent}
        </AnimatedText>
      </StyledMarkdown>
    </div>
  );
});

export default MarkdownBlock;
