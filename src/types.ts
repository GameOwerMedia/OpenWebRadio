export interface Track {
  /** URL or path to the audio file */
  src: string;
  /** Display title for the track */
  title: string;
  /** Optional artist name */
  artist?: string;
  /** Optional cover art URL */
  cover?: string;
  /** Hint that this track is a live stream (auto-detected from duration if omitted) */
  live?: boolean;
}

export interface OverPlayerProps {
  /** List of tracks to play */
  tracks: Track[];
  /** Color theme — "dark", "light", or "auto" (follows OS preference). Default: "dark" */
  theme?: "dark" | "light" | "auto";
  /** Whether shuffle is enabled by default (default: true) */
  shuffle?: boolean;
  /** Whether to autoplay on load (default: true, subject to browser restrictions) */
  autoplay?: boolean;
  /** Initial volume from 0 to 1 (default: 0.3). A volume saved in this tab overrides it after mount. */
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
  /** Enable keyboard shortcuts — Space, ArrowLeft/Right, N/P (default: true) */
  keyboardShortcuts?: boolean;
  /** Called when a new track starts playing */
  onTrackChange?: (track: Track, index: number) => void;
  /** Called when playback starts */
  onPlay?: () => void;
  /** Called when playback pauses */
  onPause?: () => void;
  /** Called when a track ends naturally */
  onEnd?: () => void;
}

export interface OverPlayerState {
  playing: boolean;
  currentTrack: Track | null;
  trackIndex: number;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffleOn: boolean;
  repeatOne: boolean;
  /** True when the current track is a live stream */
  isLive: boolean;
}

export interface OverPlayerControls {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  jumpTo: (index: number) => void;
}
