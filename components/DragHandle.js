// Six-dot grip icon used by every drag-to-reorder row (roadmap steps, roadmap to-dos,
// technical specs). This replaces the Unicode "⠿" character those rows used to render as
// plain text. That glyph isn't covered by either project font (IBM Plex Sans or Mono), so
// the browser was silently substituting a fallback system font for just that one
// character — and the fallback's own vertical metrics never lined up with the rest of the
// row, no matter how the surrounding flexbox was aligned. Drawing the icon as SVG instead
// sidesteps font rendering entirely, so it aligns the same way in every browser.
export default function DragHandle({ size = 10, className = '', title = 'Drag to reorder' }) {
  return (
    <svg
      className={`drag-handle-icon ${className}`.trim()}
      width={size}
      height={size * 1.6}
      viewBox="0 0 10 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <circle cx="3" cy="2.5" r="1.4" fill="currentColor" />
      <circle cx="7" cy="2.5" r="1.4" fill="currentColor" />
      <circle cx="3" cy="8" r="1.4" fill="currentColor" />
      <circle cx="7" cy="8" r="1.4" fill="currentColor" />
      <circle cx="3" cy="13.5" r="1.4" fill="currentColor" />
      <circle cx="7" cy="13.5" r="1.4" fill="currentColor" />
    </svg>
  );
}
