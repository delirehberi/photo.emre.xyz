import React, { useId } from 'react';
import { generateEventCover } from '@/lib/events/cover-generator';
import { Camera } from 'lucide-react';

export interface EventCoverPlaceholderProps {
  /**
   * Unique seed for deterministic generation (e.g. event coordinate, id, or title).
   */
  seed: string;
  /**
   * Event title used for monogram extraction and accessibility labeling.
   */
  title?: string | null;
  /**
   * Additional Tailwind class names.
   */
  className?: string;
  /**
   * Display size variant:
   * - 'sm': Compact size for spotlight curated items or lists
   * - 'default': Standard card cover size (16:10 or 16:9)
   * - 'lg': Full banner display
   */
  size?: 'sm' | 'default' | 'lg';
  /**
   * Whether to display the central frosted-glass monogram badge.
   * Defaults to true.
   */
  showMonogram?: boolean;
}

export const EventCoverPlaceholder: React.FC<EventCoverPlaceholderProps> = ({
  seed,
  title,
  className = '',
  size = 'default',
  showMonogram = true,
}) => {
  const filterId = useId();
  const coverData = generateEventCover(seed, title);
  const { palette, monogram, svgElements } = coverData;

  const bgGradient = `linear-gradient(${svgElements.gradientAngle}deg, ${palette.gradient[0]} 0%, ${palette.gradient[1]} 52%, ${palette.gradient[2]} 100%)`;

  const ariaLabel = title
    ? `${title} — Etkinlik Görseli`
    : 'Etkinlik Fotoğraf Albümü Görseli';

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`relative w-full h-full overflow-hidden flex items-center justify-center select-none bg-zinc-900 ${className}`}
      style={{
        background: bgGradient,
      }}
    >
      {/* SVG Pattern & Geometry Layer */}
      <svg
        viewBox="0 0 400 250"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full pointer-events-none transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        aria-hidden="true"
      >
        <defs>
          <filter
            id={`blur-${filterId}`}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <radialGradient
            id={`radial-glow-${filterId}`}
            cx="50%"
            cy="50%"
            r="60%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="60%" stopColor={palette.accent} stopOpacity="0.08" />
            <stop
              offset="100%"
              stopColor={palette.gradient[0]}
              stopOpacity="0"
            />
          </radialGradient>
        </defs>

        {/* Ambient Center Glow */}
        <rect
          x="0"
          y="0"
          width="400"
          height="250"
          fill={`url(#radial-glow-${filterId})`}
        />

        {/* Generative Shapes */}
        <g>
          {svgElements.shapes.map((shape, idx) => {
            const key = `shape-${idx}`;
            if (shape.type === 'circle') {
              const { isBlurred, ...circleAttrs } = shape.attributes;
              return (
                <circle
                  key={key}
                  {...circleAttrs}
                  filter={isBlurred ? `url(#blur-${filterId})` : undefined}
                />
              );
            }
            if (shape.type === 'path') {
              return <path key={key} {...shape.attributes} />;
            }
            if (shape.type === 'polygon') {
              return <polygon key={key} {...shape.attributes} />;
            }
            if (shape.type === 'line') {
              return <line key={key} {...shape.attributes} />;
            }
            return null;
          })}
        </g>
      </svg>

      {/* Subtle Fine Mesh Grain Overlay */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 0)',
          backgroundSize: '12px 12px',
        }}
        aria-hidden="true"
      />

      {/* Frosted-Glass Monogram & Emblem Badge */}
      {showMonogram && (
        <div
          className={`relative z-10 flex flex-col items-center justify-center rounded-2xl backdrop-blur-md shadow-lg border transition-all duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${
            size === 'sm' ? 'px-3 py-1.5 gap-0.5' : 'px-4 py-2.5 gap-1'
          }`}
          style={{
            backgroundColor: palette.badgeBg,
            borderColor: palette.badgeBorder,
            boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.25), 0 0 16px 0 ${palette.glow}`,
          }}
          aria-hidden="true"
        >
          <div className="flex items-center gap-1.5">
            <Camera
              className={`${
                size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
              } text-white/90 drop-shadow-xs stroke-[1.75]`}
            />
            <span
              className={`font-mono font-extrabold tracking-wider text-white drop-shadow-md ${
                size === 'sm' ? 'text-xs' : 'text-sm sm:text-base'
              }`}
            >
              {monogram}
            </span>
          </div>
          {size !== 'sm' && (
            <span className="text-[9px] uppercase tracking-widest font-semibold text-white/80 font-sans">
              Album
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default EventCoverPlaceholder;
