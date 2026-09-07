import { describe, it, expect } from 'vitest';
import { cn } from '../src/lib/utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('px-2 py-1', 'bg-blue-500')).toBe('px-2 py-1 bg-blue-500');
  });

  it('handles conditional classes properly', () => {
    expect(cn('base', false && 'conditional', 'active')).toBe('base active');
  });

  it('resolves tailwind conflicts adhering to latest class', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
});
