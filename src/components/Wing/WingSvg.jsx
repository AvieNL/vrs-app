import wingSvgRaw from '../../assets/wing.svg?raw';

export default function WingSvg({ containerRef, onFeatherClick, onFeatherContextMenu }) {
  return (
    <div
      ref={containerRef}
      className="wing-svg-container"
      dangerouslySetInnerHTML={{ __html: wingSvgRaw }}
      onClick={onFeatherClick}
      onContextMenu={onFeatherContextMenu}
    />
  );
}
