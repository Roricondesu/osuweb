import type { OsuUserProfile } from "./osuApi";

const PROFILE_KEY = "osurhythm-osu-profile";
const LOCAL_AVATAR_KEY = "osurhythm-local-avatar";
const LOCAL_USERNAME_KEY = "osurhythm-local-username";

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

/** 本地自定义用户名（未绑定官方账号时显示） */
export function loadLocalUsername(): string {
  try {
    return localStorage.getItem(LOCAL_USERNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveLocalUsername(name: string): void {
  try {
    localStorage.setItem(LOCAL_USERNAME_KEY, name);
  } catch {
    // 静默失败
  }
}

/** 本地上传的自定义头像（dataURL，未绑定官方账号时显示） */
export function loadLocalAvatar(): string {
  try {
    return localStorage.getItem(LOCAL_AVATAR_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveLocalAvatar(dataUrl: string): void {
  try {
    localStorage.setItem(LOCAL_AVATAR_KEY, dataUrl);
  } catch {
    // 静默失败（可能超 localStorage 配额）
  }
}

export function clearLocalAvatar(): void {
  try {
    localStorage.removeItem(LOCAL_AVATAR_KEY);
  } catch {
    // 静默失败
  }
}

