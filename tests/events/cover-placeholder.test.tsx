import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { EventCoverPlaceholder } from '../../src/components/events/EventCoverPlaceholder';

describe('EventCoverPlaceholder Component SSR', () => {
  it('renders SVG graphics and background gradient', () => {
    const html = renderToString(
      <EventCoverPlaceholder
        seed="33123:pubkey1:webend-coffee-talk-7"
        title="Webend Coffee Talk - 7"
      />,
    );

    expect(html).toContain('role="img"');
    expect(html).toContain('Webend Coffee Talk - 7');
    expect(html).toContain('<svg');
    expect(html).toContain('viewBox="0 0 400 250"');
    expect(html).toContain('linear-gradient(');
    // Should render the monogram
    expect(html).toContain('WC');
  });

  it('renders compact size without error', () => {
    const html = renderToString(
      <EventCoverPlaceholder
        seed="curated-item-1"
        title="Cosplay Tour"
        size="sm"
      />,
    );

    expect(html).toContain('role="img"');
    expect(html).toContain('CT');
  });

  it('supports hiding monogram if requested', () => {
    const html = renderToString(
      <EventCoverPlaceholder
        seed="curated-item-2"
        title="Cosplay Tour"
        showMonogram={false}
      />,
    );

    expect(html).not.toContain('CT');
  });
});
