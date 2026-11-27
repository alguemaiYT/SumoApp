// Lightweight zero-render lock so horizontal sliders, 3D WebView orbit, and joystick
// never trigger the parent horizontal tab-swipe gesture.

let activeLocks = 0;

export function acquireTabSwipeLock(): void {
  activeLocks += 1;
}

export function releaseTabSwipeLock(): void {
  activeLocks = Math.max(0, activeLocks - 1);
}

export function resetTabSwipeLock(): void {
  activeLocks = 0;
}

export function isTabSwipeLocked(): boolean {
  return activeLocks > 0;
}
