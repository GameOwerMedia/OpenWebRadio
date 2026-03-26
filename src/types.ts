export interface Track {
  /** URL or path to the audio file */
  src: string;
  /** Display title for the track */
  title: string;
  /** Optional artist name */
  artist?: string;
}

export interface OverPlayerProps {
  /** List of tracks to play */
  tracks: Track[];
  /** Whether shuffle is enabled by default (default: true) */
  shuffle?: boolean;
  /** Whether to autoplay on load (default: true, subject to browser restrictions) */
  autoplay?: boolean;
  /** Initial volume from 0 to 1 (default: 0.3) */
  volume?: number;
  /** Unique key for session persistence — use different keys if you have multiple players (default: "overplayer") */
  storageKey?: string;
  /** Primary accent color (default: "#00e5ff") */
  accentColor?: string;
  /** Secondary accent color for visualizer alternation (default: "#ff2d7b") */
  accentColorAlt?: string;
  /** Label shown on the right side of the expanded player (default: "OverPlayer") */
  brandLabel?: string;
  /** Optional subtitle shown next to track title */
  subtitle?: string;
  /** Additional CSS class for the root container */
  className?: string;
  /** Render a custom element below the player (e.g. sponsor bar) */
  footer?: React.ReactNode;
}
