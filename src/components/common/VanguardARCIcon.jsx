/**
 * VanguardARCIcon — Renders the actual Vanguard_ARC_Icon.svg file.
 *
 * Props:
 *   size      — icon height in px (default 48); width auto-scales from aspect ratio
 *   className — extra CSS class names
 *   style     — extra inline styles
 */
import VanguardLogoSrc from '../../assets/Vanguard_ARC_Icon.svg';

export default function VanguardARCIcon({
  size = 48,
  className = '',
  style = {},
  ...rest
}) {
  return (
    <img
      src={VanguardLogoSrc}
      alt="Vanguard ARC"
      className={`vanguard-arc-icon ${className}`}
      style={{
        display: 'block',
        height: `${size}px`,
        width: 'auto',
        objectFit: 'contain',
        flexShrink: 0,
        ...style,
      }}
      {...rest}
    />
  );
}
