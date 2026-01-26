"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "serviceflow_sound_enabled";

// Placeholder sound URLs using base64 encoded minimal audio
// These are tiny beep sounds - replace with actual sound files in production
const SOUNDS = {
  // Short notification beep (440Hz sine wave, 100ms)
  notification:
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleSwSVrPYzIhNHD2Qv9nPi0whTam/zcKBJyOw2tXLjy8QZ8Ha0bZdEyGb2NLMkzoXXLzf0LVVHRqO2NLMo0sZWr3d0rRTGh2b1tbIkkgbXL/c0rNPGiCg1dXHkEUcXsDb0bFMGiKl1NPEjkIdYMHa0K5JGiWq09LBiz8dYsLZz6tGGiiv0tK/iDwdZcPYzqhDGiyy0dG9hTodZ8TXzaVAGy+10dC7gjcdacXWzKI9GzK40M+5fzQdas" +
    "bVy589GzW60M63fDEdbc" +
    "fUyps6Gzi90M21eTAdcMjTyJg3Gzu/z8yzeC8dc8nSxpU0HDzBzsqwdS0dd8rRxJIxHD7Czci" +
    "tdCsdesvQwY8uHUDEzMardCkdfczPv4wrHULFy8Wocycdf87OvYkoHUTHysOlcSUdgc/NuoYlHUbIycGicyMdg9DLuIMiHUjKyL+fcSEdhdHKtYAfHUrLxr2cbyAdhNLItX8cHUzMxbuZbR4dhtPHs3wZHU7OxLiWax0diNTFsHkWHVDPwraTagwdjNXDrXYTHVLQwbSQaQsdk9bBqnMQHVTRv7GNZwodmNe/p3ANHV" +
    "bTvq6KZQgemdi9pG0LHVnUvKuHYgYfnNm7oWoIHVvVuqiEXwMgn9q5nmcFHV3WuKWBXAAhotu3m2QCHl/XtqJ+WQAjo9y1mGH/HmHYtJ97VgAlpd2zll7",
  // Longer ring tone for incoming calls (two-tone pattern)
  incomingCall:
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleSwSVrPYzIhNHD2Qv9nPi0whTam/zcKBJyOw2tXLjy8QZ8Ha0bZdEyGb2NLMkzoXXLzf0LVVHRqO2NLMo0sZWr3d0rRTGh2b1tbIkkgbXL/c0rNPGiCg1dXHkEUcXsDb0bFMGiKl1NPEjkIdYMHa0K5JGiWq09LBiz8dYsLZz6tGGiiv0tK/iDwdZcPYzqhDGiyy0dG9hTodZ8TXzaVAGy+10dC7gjcdacXWzKI9GzK40M+5fzQdas" +
    "bVy589GzW60M63fDEdbc" +
    "fUyps6Gzi90M21eTAdcMjTyJg3Gzu/z8yzeC8dc8nSxpU0HDzBzsqwdS0dd8rRxJIxHD7Czci" +
    "tdCsdesvQwY8uHUDEzMardCkdfczPv4wrHULFy8Wocycdf87OvYkoHUTHysOlcSUdgc/NuoYlHUbIycGicyMdg9DLuIMiHUjKyL+fcSEdhdHKtYAfHUrLxr2cbyAdhNLItX8cHUzMxbuZbR4dhtPHs3wZHU7OxLiWax0diNTFsHkWHVDPwraTagwdjNXDrXYTHVLQwbSQaQsdk9bBqnMQHVTRv7GNZwodmNe/p3ADHV" +
    "bTvq6KZQgemdi9pG0LHVnUvKuHYgYfnNm7oWoIHVvVuqiEXwMgn9q5nmcFHV3WuKWBXAAhotu3m2QCHl/XtqJ+WQAjo9y1mGH/HmHYtJ97VgAlpd2zll7",
  // Short positive confirmation sound
  success:
    "data:audio/wav;base64,UklGRl9vT19teleSwSVrPYzIhNHD2Qv9nPi0whTam/zcKBJyOw2tXLjy8QZ8Ha0bZdEyGb2NLMkzoXXLzf0LVVHRqO2NLMo0sZWr3d0rRTGh2b1tbIkkgbXL/c0rNPGiCg1dXHkEUcXsDb0bFMGiKl1NPEjkIdYMHa0K5JGiWq09LBiz8dYsLZz6tGGiiv0tK/iDwdZcPYzqhDGiyy0dG9hTodZ8TXzaVAGy+10dC7gjcdacXWzKI9GzK40M+5fzQdasbVy589GzW60M63fDEdbcfUyps6Gzi90M21eTAdcMjTyJg3Gzu/z8yzeC8dc8nSxpU0HDzBzsqwdS0dd8rRxJIxHD7CzciAAA",
} as const;

type SoundType = keyof typeof SOUNDS;

interface UseSoundReturn {
  playNotification: () => void;
  playIncomingCall: () => void;
  playSuccess: () => void;
  isSoundEnabled: boolean;
  toggleSound: () => void;
}

/**
 * Custom hook for managing sound effects in ServiceFlow.
 * Provides functions to play notification sounds with user preference management.
 *
 * Features:
 * - Stores preference in localStorage (opt-in, defaults to OFF)
 * - Uses HTML5 Audio API
 * - Handles browser autoplay restrictions gracefully
 *
 * @example
 * ```tsx
 * const { playNotification, isSoundEnabled, toggleSound } = useSound();
 *
 * // Toggle sound in settings
 * <button onClick={toggleSound}>
 *   {isSoundEnabled ? <Volume2 /> : <VolumeX />}
 * </button>
 *
 * // Play sound when message arrives
 * if (newMessage) playNotification();
 * ```
 */
export function useSound(): UseSoundReturn {
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(false);
  const audioCache = useRef<Map<SoundType, HTMLAudioElement>>(new Map());

  // Load preference from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Default to OFF - sounds are opt-in
      setIsSoundEnabled(stored === "true");
    } catch {
      // localStorage might be blocked in some browsers
      setIsSoundEnabled(false);
    }
  }, []);

  // Pre-cache audio elements for better performance
  const getAudio = useCallback((type: SoundType): HTMLAudioElement | null => {
    if (typeof window === "undefined" || typeof Audio === "undefined") {
      return null;
    }

    let audio = audioCache.current.get(type);
    if (!audio) {
      try {
        audio = new Audio(SOUNDS[type]);
        audio.preload = "auto";
        audioCache.current.set(type, audio);
      } catch {
        // Audio not supported
        return null;
      }
    }
    return audio;
  }, []);

  // Generic play function with autoplay handling
  const playSound = useCallback(
    (type: SoundType): void => {
      if (!isSoundEnabled) return;

      const audio = getAudio(type);
      if (!audio) return;

      // Reset to start if already playing
      audio.currentTime = 0;

      // Play with promise handling for autoplay restrictions
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Autoplay was prevented - this is expected in some browsers
          // The sound will play on the next user interaction
          if (error.name !== "NotAllowedError") {
            console.warn("ServiceFlow: Could not play sound:", error.message);
          }
        });
      }
    },
    [isSoundEnabled, getAudio]
  );

  const playNotification = useCallback((): void => {
    playSound("notification");
  }, [playSound]);

  const playIncomingCall = useCallback((): void => {
    playSound("incomingCall");
  }, [playSound]);

  const playSuccess = useCallback((): void => {
    playSound("success");
  }, [playSound]);

  const toggleSound = useCallback((): void => {
    setIsSoundEnabled((prev) => {
      const newValue = !prev;

      try {
        localStorage.setItem(STORAGE_KEY, String(newValue));
      } catch {
        // localStorage might be blocked
      }

      // Play a test sound when enabling to confirm it works
      // and to trigger user gesture for future autoplay
      if (newValue) {
        const audio = getAudio("notification");
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(() => {
            // Silently fail - user will see the enabled state
          });
        }
      }

      return newValue;
    });
  }, [getAudio]);

  return {
    playNotification,
    playIncomingCall,
    playSuccess,
    isSoundEnabled,
    toggleSound,
  };
}

export default useSound;
