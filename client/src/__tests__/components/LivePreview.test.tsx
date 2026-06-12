import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LivePreview from '../../components/LivePreview';

describe('LivePreview', () => {
  it('renders an iframe', () => {
    render(<LivePreview html="<p>Hello</p>" css="p { color: red; }" />);
    expect(screen.getByTitle('Preview')).toBeInTheDocument();
  });

  it('uses the custom title prop', () => {
    render(<LivePreview html="" css="" title="Your Output" />);
    expect(screen.getByTitle('Your Output')).toBeInTheDocument();
    expect(screen.getByText('Your Output')).toBeInTheDocument();
  });

  it('renders the iframe with sandbox attribute', () => {
    render(<LivePreview html="<script>alert(1)</script>" css="" />);
    const iframe = screen.getByTitle('Preview');
    expect(iframe).toHaveAttribute('sandbox', 'allow-same-origin');
  });

  it('builds srcDoc containing the provided HTML', () => {
    render(<LivePreview html="<h1>Test</h1>" css="h1 { color: blue; }" />);
    const iframe = screen.getByTitle('Preview') as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toContain('<h1>Test</h1>');
    expect(iframe.getAttribute('srcdoc')).toContain('h1 { color: blue; }');
  });

  it('applies custom className', () => {
    const { container } = render(<LivePreview html="" css="" className="my-class" />);
    expect(container.firstChild).toHaveClass('my-class');
  });
});
