"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Track, OverPlayerState, OverPlayerControls } from "./types";
import {
  clampVolume,
  detectLive,
  loadPlayback,
  orderTracks,
  persistedTime,
  savePlayback,
  volumeFromSaved,
} from "./persist";

interface UseOverPlayerOptions {
  tracks: Track[];
  shuffle?: boolean;
  autoplay?: boolean;
  volume?: number;
  storageKey?: string;
  onTrackChange?: (track: Track, index: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
}

export function useOverPlayer({
  tracks,
  shuffle: initialShuffle = true,
  autoplay = true,
  volume: initialVolume = 0.3,
  storageKey = "overplayer",
  onTrackChange,
  onPlay,
  onPause,
  onEnd,
}: UseOverPlayerOptions): [OverPlayerState, OverPlayerControls, Track[]] {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const orderedTracksRef = useRef<Track[]>([]);
  const [playing, setPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => clampVolume(initialVolume));
  const [muted, setMuted] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(initialShuffle);
  const [repeatOne, setRepeatOne] = useState(false);
  const [isLive, setIsLive] = useState(() => tracks[0]?.live === true);
  const [, setRevision] = useState(0);
  const volumeRef = useRef(clampVolume(initialVolume));
  const mutedRef = useRef(false);
  const prevVolumeRef = useRef(clampVolume(initialVolume));
  const trackIdxRef = useRef(0);
  const callbacksRef = useRef({ onTrackChange, onPlay, onPause, onEnd });
  callbacksRef.current = { onTrackChange, onPlay, onPause, onEnd };

  const writePlayback = useCallback(() => {
    const audio = audioRef.current;
    const idx = trackIdxRef.current;
    const track = orderedTracksRef.current[idx];
    savePlayback(storageKey, {
      src: track?.src || "",
      time: persistedTime(track?.live, audio?.duration ?? NaN, audio?.currentTime || 0),
      wasPlaying: audio ? !audio.paused : false,
      volume: volumeRef.current,
      muted: mutedRef.current,
      prevVolume: prevVolumeRef.current,
    });
  }, [storageKey]);

  // Initialize audio after mount so server rendering never touches Audio.
  useEffect(() => {
    if (tracks.length === 0 || typeof Audio === "undefined") {
      setRevision((revision) => revision + 1);
      return;
    }

    const ordered = orderTracks(storageKey, tracks, initialShuffle);
    orderedTracksRef.current = ordered;

    const saved = loadPlayback(storageKey);
    let restoredIndex = 0;
    let restoredTime = 0;
    let shouldPlay = autoplay;
    const restoredVolume = volumeFromSaved(saved, initialVolume);

    if (saved?.src) {
      const idx = ordered.findIndex((track) => track.src === saved.src);
      if (idx >= 0) {
        restoredIndex = idx;
        restoredTime = saved.time || 0;
        if (typeof saved.wasPlaying === "boolean") shouldPlay = saved.wasPlaying;
      }
    }

    volumeRef.current = restoredVolume.volume;
    mutedRef.current = restoredVolume.muted;
    prevVolumeRef.current = restoredVolume.prevVolume;
    setVolumeState(restoredVolume.volume);
    setMuted(restoredVolume.muted);
    setCurrentTime(restoredTime);

    const audio = new Audio(ordered[restoredIndex].src);
    audio.volume = restoredVolume.muted ? 0 : restoredVolume.volume;
    audio.preload = "auto";
    if (restoredTime > 0) audio.currentTime = restoredTime;
    audioRef.current = audio;
    trackIdxRef.current = restoredIndex;
    setTrackIndex(restoredIndex);

    const restoredTrack = ordered[restoredIndex];
    setIsLive(detectLive(restoredTrack?.live, audio.duration));

    const checkLive = () => {
      const track = orderedTracksRef.current[trackIdxRef.current];
      setIsLive(detectLive(track?.live, audio.duration));
    };
    const onTimeUpdate = () => { setCurrentTime(audio.currentTime); setDuration(audio.duration || 0); checkLive(); };
    const onLoadedMetadata = () => { setDuration(audio.duration || 0); checkLive(); };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);

    if (shouldPlay) {
      audio.play().then(() => setPlaying(true)).catch(() => {
        const events = ["click", "touchstart", "keydown", "mousemove", "scroll", "pointerdown"];
        const unlock = () => {
          audio.play().then(() => setPlaying(true)).catch(() => {});
          events.forEach((eventName) => document.removeEventListener(eventName, unlock));
        };
        events.forEach((eventName) => document.addEventListener(eventName, unlock, { once: true, passive: true }));
      });
    }

    const saveId = setInterval(writePlayback, 500);
    setRevision((revision) => revision + 1);

    return () => {
      writePlayback();
      clearInterval(saveId);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.pause();
      if (audioRef.current === audio) audioRef.current = null;
    };
    // Playback is created once per mount. Later prop identity changes do not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle track end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      callbacksRef.current.onEnd?.();
      if (repeatOne) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      const playlist = orderedTracksRef.current;
      let nextIdx: number;
      if (shuffleOn) {
        nextIdx = Math.floor(Math.random() * playlist.length);
        if (nextIdx === trackIndex && playlist.length > 1) nextIdx = (nextIdx + 1) % playlist.length;
      } else {
        nextIdx = (trackIndex + 1) % playlist.length;
      }
      trackIdxRef.current = nextIdx;
      setTrackIndex(nextIdx);
      audio.src = playlist[nextIdx].src;
      audio.play().then(() => setPlaying(true)).catch(() => {});
      callbacksRef.current.onTrackChange?.(playlist[nextIdx], nextIdx);
    };

    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [trackIndex, repeatOne, shuffleOn]);

  const controls: OverPlayerControls = {
    play: useCallback(() => {
      audioRef.current?.play().then(() => { setPlaying(true); callbacksRef.current.onPlay?.(); }).catch(() => {});
    }, []),
    pause: useCallback(() => {
      audioRef.current?.pause();
      setPlaying(false);
      callbacksRef.current.onPause?.();
    }, []),
    toggle: useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) {
        audio.play().then(() => { setPlaying(true); callbacksRef.current.onPlay?.(); }).catch(() => {});
      } else {
        audio.pause(); setPlaying(false); callbacksRef.current.onPause?.();
      }
    }, []),
    next: useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;
      const playlist = orderedTracksRef.current;
      if (playlist.length === 0) return;
      const nextIdx = (trackIndex + 1) % playlist.length;
      trackIdxRef.current = nextIdx;
      setTrackIndex(nextIdx);
      audio.src = playlist[nextIdx].src;
      if (playing) audio.play().catch(() => {});
      callbacksRef.current.onTrackChange?.(playlist[nextIdx], nextIdx);
    }, [trackIndex, playing]),
    prev: useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;
      const playlist = orderedTracksRef.current;
      if (playlist.length === 0) return;
      const prevIdx = (trackIndex - 1 + playlist.length) % playlist.length;
      trackIdxRef.current = prevIdx;
      setTrackIndex(prevIdx);
      audio.src = playlist[prevIdx].src;
      if (playing) audio.play().catch(() => {});
      callbacksRef.current.onTrackChange?.(playlist[prevIdx], prevIdx);
    }, [trackIndex, playing]),
    seek: useCallback((time: number) => {
      if (audioRef.current) audioRef.current.currentTime = time;
    }, []),
    setVolume: useCallback((vol: number) => {
      const clamped = clampVolume(vol, 0);
      volumeRef.current = clamped;
      mutedRef.current = clamped === 0;
      if (clamped > 0) prevVolumeRef.current = clamped;
      if (audioRef.current) audioRef.current.volume = clamped;
      setVolumeState(clamped);
      setMuted(clamped === 0);
      writePlayback();
    }, [writePlayback]),
    toggleMute: useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;
      if (mutedRef.current) {
        const restored = prevVolumeRef.current || 0.3;
        audio.volume = restored;
        volumeRef.current = restored;
        mutedRef.current = false;
        setVolumeState(restored);
        setMuted(false);
      } else {
        prevVolumeRef.current = volumeRef.current || 0.3;
        audio.volume = 0;
        volumeRef.current = 0;
        mutedRef.current = true;
        setVolumeState(0);
        setMuted(true);
      }
      writePlayback();
    }, [writePlayback]),
    toggleShuffle: useCallback(() => setShuffleOn((value) => !value), []),
    toggleRepeat: useCallback(() => setRepeatOne((value) => !value), []),
    jumpTo: useCallback((index: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const playlist = orderedTracksRef.current;
      if (index < 0 || index >= playlist.length) return;
      trackIdxRef.current = index;
      setTrackIndex(index);
      audio.src = playlist[index].src;
      if (playing) audio.play().catch(() => {});
      callbacksRef.current.onTrackChange?.(playlist[index], index);
    }, [playing]),
  };

  const state: OverPlayerState = {
    playing,
    currentTrack: orderedTracksRef.current[trackIndex] || null,
    trackIndex,
    currentTime,
    duration,
    volume,
    muted,
    shuffleOn,
    repeatOne,
    isLive,
  };

  return [state, controls, orderedTracksRef.current];
}
