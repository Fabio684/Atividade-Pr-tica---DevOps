export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readString(key: string, fallback = ""): string {
  return localStorage.getItem(key) || fallback;
}

export function writeString(key: string, value: string): void {
  localStorage.setItem(key, value);
}