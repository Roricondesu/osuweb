import type { OsuUserProfile } from "./osuApi";

const PROFILE_KEY = "osurhythm-osu-profile";

export function loadOsuProfile(): OsuUserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OsuUserProfile;
  } catch {
    return null;
  }
}

export function saveOsuProfile(profile: OsuUserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // 静默失败
  }
}

export function clearOsuProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // 静默失败
  }
}
