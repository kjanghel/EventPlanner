// Detection helpers for PWA / standalone-mode state.
//
// Why this matters: iOS Web Push only works for PWAs that have been added
// to the home screen via Safari's Share menu. We use these helpers to
// nudge iPhone users (in regular Safari) toward installing, and to
// suppress UI like the notifications opt-in modal that would be useless
// for them in browser mode.

declare global {
  interface Navigator {
    // iOS-specific: true when the page is running as an installed PWA
    // launched from the home screen.
    standalone?: boolean
  }
}

// Detect iOS (iPhone / iPad / iPod). Excludes iPadOS in "desktop class"
// mode where userAgent says Mac but maxTouchPoints > 1 — that's still iOS.
export function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  // iPadOS 13+ disguises as macOS — distinguish via touch.
  if (ua.includes('Mac') && navigator.maxTouchPoints > 1) return true
  return false
}

// True when the page is running as an installed PWA (home-screen launch).
// Two checks: the modern `display-mode: standalone` media query and the
// legacy iOS-specific `navigator.standalone` boolean.
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  if (navigator.standalone === true) return true
  return false
}

// True when the user is on iOS in plain Safari (or any iOS browser, since
// they all use WebKit) and has NOT installed the PWA yet. This is the
// audience for the install nudge.
export function isIOSBrowserNotPWA(): boolean {
  return isIOS() && !isStandalone()
}

// True when the user is on iOS in a non-Safari browser (Chrome / Firefox
// on iPhone). These browsers can't install a PWA — only Safari can. So
// the install instructions need to tell them to switch to Safari first.
export function isIOSNonSafari(): boolean {
  if (!isIOS()) return false
  const ua = navigator.userAgent
  // Chrome on iOS → CriOS, Firefox → FxiOS, Edge → EdgiOS
  return /CriOS|FxiOS|EdgiOS/.test(ua)
}
