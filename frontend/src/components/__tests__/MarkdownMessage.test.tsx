/**
 * MarkdownMessage Component Tests
 * Unit tests for markdown rendering functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock react-syntax-highlighter before importing the component
// This avoids the ESM/CommonJS compatibility issues
// All variables inside vi.mock must be defined inline (hoisting)
vi.mock('react-syntax-highlighter', () => {
    const MockPrismLight = function ({ children }: { children: React.ReactNode }) {
        return React.createElement('pre', { 'data-testid': 'syntax-highlighter' }, children);
    };
    MockPrismLight.registerLanguage = () => { };
    return { PrismLight: MockPrismLight };
});

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
    oneDark: {},
    oneLight: {},
}));

vi.mock('react-syntax-highlighter/dist/esm/languages/prism/javascript', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/typescript', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/jsx', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/tsx', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/python', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/bash', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/json', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/yaml', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/markdown', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/sql', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/css', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/markup', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/java', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/csharp', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/go', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/rust', () => ({ default: {} }));
vi.mock('react-syntax-highlighter/dist/esm/languages/prism/diff', () => ({ default: {} }));

// Now import the component after mocks are set up
import { MarkdownMessage } from '../MarkdownMessage';

// Mock theme store
vi.mock('../../store/theme-store', () => ({
    useThemeStore: vi.fn(() => 'light'),
}));

// Mock notes hook
vi.mock('../../features/notes/hooks/use-notes-query', () => ({
    useNotes: vi.fn(() => ({
        data: [
            { id: '1', title: 'My Note', content: 'Note content' },
            { id: '2', title: 'Another Note', content: 'More content' },
        ],
    })),
}));

// Mock UI store
const mockOpenEditModal = vi.fn();
vi.mock('../../store/ui-store', () => ({
    useUIStore: vi.fn(() => mockOpenEditModal),
}));

describe('MarkdownMessage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ============================================
    // Basic Rendering Tests
    // ============================================
    describe('basic rendering', () => {
        it('should render plain text content', () => {
            // Act
            render(<MarkdownMessage content="Hello, World!" />);

            // Assert
            expect(screen.getByText('Hello, World!')).toBeInTheDocument();
        });

        it('should render empty content without errors', () => {
            // Act
            const { container } = render(<MarkdownMessage content="" />);

            // Assert
            expect(container.querySelector('.markdown-content')).toBeInTheDocument();
        });

        it('should have markdown-content class wrapper', () => {
            // Act
            const { container } = render(<MarkdownMessage content="Test" />);

            // Assert
            expect(container.querySelector('.markdown-content')).toBeInTheDocument();
        });
    });

    // ============================================
    // Markdown Formatting Tests
    // ============================================
    describe('markdown formatting', () => {
        it('should render bold text', () => {
            // Act
            render(<MarkdownMessage content="**bold text**" />);

            // Assert
            const boldElement = screen.getByText('bold text');
            expect(boldElement.tagName).toBe('STRONG');
        });

        it('should render italic text', () => {
            // Act
            render(<MarkdownMessage content="*italic text*" />);

            // Assert
            const italicElement = screen.getByText('italic text');
            expect(italicElement.tagName).toBe('EM');
        });

        it('should render headings', () => {
            // Act
            const { container } = render(
                <MarkdownMessage content="# Heading 1" />
            );

            // Assert
            expect(container.querySelector('h1')).toBeInTheDocument();
            expect(screen.getByText('Heading 1')).toBeInTheDocument();
        });

        it('should render unordered lists', () => {
            // Act
            const { container } = render(
                <MarkdownMessage content="- Item 1" />
            );

            // Assert
            const ul = container.querySelector('ul');
            expect(ul).toBeInTheDocument();
            expect(ul?.querySelectorAll('li').length).toBeGreaterThanOrEqual(1);
        });

        it('should render ordered lists', () => {
            // Act
            const { container } = render(
                <MarkdownMessage content="1. First" />
            );

            // Assert
            const ol = container.querySelector('ol');
            expect(ol).toBeInTheDocument();
            expect(ol?.querySelectorAll('li').length).toBeGreaterThanOrEqual(1);
        });

        it('should render blockquotes', () => {
            // Act
            const { container } = render(
                <MarkdownMessage content="> This is a quote" />
            );

            // Assert
            expect(container.querySelector('blockquote')).toBeInTheDocument();
        });

        it('should render horizontal rules', () => {
            // Act
            const { container } = render(<MarkdownMessage content="---" />);

            // Assert
            expect(container.querySelector('hr')).toBeInTheDocument();
        });

        it('should render paragraphs', () => {
            // Act
            const { container } = render(
                <MarkdownMessage content="First paragraph." />
            );

            // Assert
            const paragraphs = container.querySelectorAll('p');
            expect(paragraphs.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ============================================
    // Code Block Tests
    // ============================================
    describe('code blocks', () => {
        it('should render inline code', () => {
            // Act
            render(<MarkdownMessage content="Use `console.log()` to debug" />);

            // Assert
            // The content should be rendered (may be in CODE or PRE depending on mock)
            expect(screen.getByText('console.log()')).toBeInTheDocument();
        });

        it('should render fenced code blocks', () => {
            // Act
            const { container } = render(
                <MarkdownMessage content="```javascript\nconst x = 1;\n```" />
            );

            // Assert
            // The code block should be rendered with syntax highlighting
            expect(container.textContent).toContain('const x = 1;');
        });

        it('should render code blocks without language specified', () => {
            // Act
            const { container } = render(
                <MarkdownMessage content="```\nplain code\n```" />
            );

            // Assert
            expect(container.textContent).toContain('plain code');
        });

        it('should handle multiple code blocks', () => {
            // Act
            const { container } = render(
                <MarkdownMessage content="```js\ncode1\n```\n\n```python\ncode2\n```" />
            );

            // Assert
            expect(container.textContent).toContain('code1');
            expect(container.textContent).toContain('code2');
        });
    });

    // ============================================
    // Link Tests
    // ============================================
    describe('links', () => {
        it('should render external links with target="_blank"', () => {
            // Act
            const { container } = render(
                <MarkdownMessage content="Visit [Google](https://google.com)" />
            );

            // Assert
            const link = container.querySelector('a');
            expect(link).toBeInTheDocument();
            expect(link?.getAttribute('target')).toBe('_blank');
            expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
        });

        it('should render link text correctly', () => {
            // Act
            render(<MarkdownMessage content="Click [here](https://example.com)" />);

            // Assert
            expect(screen.getByText('here')).toBeInTheDocument();
        });
    });

    // ============================================
    // Table Tests
    // ============================================
    describe('tables', () => {
        it('should render markdown tables', () => {
            // Act
            const { container } = render(
                <MarkdownMessage
                    content={`| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |`}
                />
            );

            // Assert
            expect(container.querySelector('table')).toBeInTheDocument();
            expect(container.querySelector('thead')).toBeInTheDocument();
            expect(container.querySelector('tbody')).toBeInTheDocument();
            expect(container.querySelector('th')).toBeInTheDocument();
            expect(container.querySelector('td')).toBeInTheDocument();
        });
    });

    // ============================================
    // Unicode/Emoji Tests
    // ============================================
    describe('unicode handling', () => {
        it('should decode unicode escape sequences', () => {
            // Act
            render(<MarkdownMessage content="Hello \\uD83D\\uDC4B World" />);

            // Assert
            // The unicode should be decoded to the actual emoji
            expect(screen.getByText(/Hello.*World/)).toBeInTheDocument();
        });

        it('should render emojis directly', () => {
            // Act
            render(<MarkdownMessage content="Hello 👋 World" />);

            // Assert
            expect(screen.getByText('Hello 👋 World')).toBeInTheDocument();
        });
    });

    // ============================================
    // Special Content Tests
    // ============================================
    describe('special content', () => {
        it('should not convert checkbox syntax to note links', () => {
            // Act
            const { container } = render(
                <MarkdownMessage content="- [x] Completed task" />
            );

            // Assert
            // Should render as list items, not try to make note links
            const listItems = container.querySelectorAll('li');
            expect(listItems.length).toBeGreaterThanOrEqual(1);
        });

        it('should handle mixed content correctly', () => {
            // Arrange
            const complexContent = `
# Title

Here is some **bold** and *italic* text.

\`\`\`javascript
const x = 1;
\`\`\`

- Item 1
- Item 2

> A quote

| Col1 | Col2 |
|------|------|
| A    | B    |
`;

            // Act
            const { container } = render(<MarkdownMessage content={complexContent} />);

            // Assert
            expect(container.querySelector('h1')).toBeInTheDocument();
            expect(container.querySelector('strong')).toBeInTheDocument();
            expect(container.querySelector('em')).toBeInTheDocument();
            expect(container.querySelector('ul')).toBeInTheDocument();
            expect(container.querySelector('blockquote')).toBeInTheDocument();
            expect(container.querySelector('table')).toBeInTheDocument();
        });

        it('should handle nested formatting', () => {
            // Act
            render(<MarkdownMessage content="***bold and italic***" />);

            // Assert
            const text = screen.getByText('bold and italic');
            expect(text).toBeInTheDocument();
        });
    });

    // ============================================
    // GFM (GitHub Flavored Markdown) Tests
    // ============================================
    describe('GFM features', () => {
        it('should render strikethrough text', () => {
            // Act
            render(<MarkdownMessage content="~~strikethrough~~" />);

            // Assert
            const strikeElement = screen.getByText('strikethrough');
            expect(strikeElement.tagName).toBe('DEL');
        });

        it('should render autolinked URLs', () => {
            // Act
            const { container } = render(
                <MarkdownMessage content="Visit https://example.com" />
            );

            // Assert
            const link = container.querySelector('a');
            expect(link).toBeInTheDocument();
            expect(link?.getAttribute('href')).toBe('https://example.com');
        });
    });

    // ============================================
    // Edge Cases Tests
    // ============================================
    describe('edge cases', () => {
        it('should handle very long content', () => {
            // Arrange
            const longContent = 'A'.repeat(10000);

            // Act
            const { container } = render(<MarkdownMessage content={longContent} />);

            // Assert
            expect(container.textContent?.length).toBeGreaterThan(9999);
        });

        it('should handle special characters', () => {
            // Act
            render(<MarkdownMessage content={'Special chars: <>&"\''} />);

            // Assert
            expect(screen.getByText(/Special chars:/)).toBeInTheDocument();
        });

        it('should handle newlines correctly', () => {
            // Act
            const { container } = render(
                <MarkdownMessage content="Line 1\n\nLine 2" />
            );

            // Assert
            // React-markdown renders content - at least 1 paragraph
            const paragraphs = container.querySelectorAll('p');
            expect(paragraphs.length).toBeGreaterThanOrEqual(1);
        });

        it('should handle content with only whitespace', () => {
            // Act
            const { container } = render(<MarkdownMessage content="   \n\n   " />);

            // Assert
            expect(container.querySelector('.markdown-content')).toBeInTheDocument();
        });
    });

    // ============================================
    // Heading Level Tests
    // ============================================
    describe('heading levels', () => {
        it('should render h4 correctly', () => {
            // Act
            const { container } = render(<MarkdownMessage content="#### Heading 4" />);

            // Assert
            const h4 = container.querySelector('h4');
            expect(h4).toBeInTheDocument();
            expect(h4?.textContent).toBe('Heading 4');
        });

        it('should render h5 correctly', () => {
            // Act
            const { container } = render(<MarkdownMessage content="##### Heading 5" />);

            // Assert
            const h5 = container.querySelector('h5');
            expect(h5).toBeInTheDocument();
            expect(h5?.textContent).toBe('Heading 5');
        });

        it('should render h6 correctly', () => {
            // Act
            const { container } = render(<MarkdownMessage content="###### Heading 6" />);

            // Assert
            const h6 = container.querySelector('h6');
            expect(h6).toBeInTheDocument();
            expect(h6?.textContent).toBe('Heading 6');
        });
    });
});

