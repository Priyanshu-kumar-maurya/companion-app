import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/**
 * Checks if running inside native Android / iOS Capacitor container
 */
export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Configure Android System Status Bar appearance
 */
export const configureNativeStatusBar = async (bgColor = "#0D0D1A") => {
  if (!isNativePlatform()) return;

  try {
    // Style.Dark means dark content/icons, Style.Light or Style.Default sets white icons for dark theme
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: bgColor });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    console.warn("Native StatusBar configuration notice:", err?.message || err);
  }
};

/**
 * Trigger Tactile Native Haptic Feedback
 * @param {'light'|'medium'|'heavy'|'success'|'warning'|'error'|'selection'} type
 */
export const triggerHaptic = async (type = "light") => {
  if (isNativePlatform()) {
    try {
      if (type === "light") {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (type === "medium") {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (type === "heavy") {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (type === "success") {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (type === "warning") {
        await Haptics.notification({ type: NotificationType.Warning });
      } else if (type === "error") {
        await Haptics.notification({ type: NotificationType.Error });
      } else if (type === "selection") {
        await Haptics.selectionStart();
      }
      return;
    } catch (e) {
      // Fallback below
    }
  }

  // Web Browser vibration fallback
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      if (type === "heavy" || type === "error") {
        navigator.vibrate([40, 30, 40]);
      } else if (type === "medium" || type === "warning") {
        navigator.vibrate(25);
      } else {
        navigator.vibrate(12);
      }
    } catch (_) {}
  }
};

let lastBackPressTime = 0;

/**
 * Register Android Hardware Back Button listener
 * @param {Function} getNavigationState - Returns { page, history, canGoBack, goBack, isModalOpen, closeModal }
 */
export const setupNativeBackButton = (getNavigationState) => {
  if (!isNativePlatform()) return () => {};

  const listenerHandle = CapacitorApp.addListener("backButton", ({ canGoBack: nativeCanGoBack }) => {
    try {
      const state = typeof getNavigationState === "function" ? getNavigationState() : {};
      const {
        isModalOpen = false,
        closeModal = null,
        canGoBack = false,
        goBack = null,
        showExitToast = null,
      } = state;

      // 1. If an active modal is open, dismiss it first
      if (isModalOpen && typeof closeModal === "function") {
        triggerHaptic("light");
        closeModal();
        return;
      }

      // 2. If user can navigate back to previous screen
      if (canGoBack && typeof goBack === "function") {
        triggerHaptic("selection");
        goBack();
        return;
      }

      // 3. User is on Root Screen: Double-tap within 2 seconds to exit
      const now = Date.now();
      if (now - lastBackPressTime < 2000) {
        // Exit application
        triggerHaptic("medium");
        CapacitorApp.exitApp();
      } else {
        lastBackPressTime = now;
        triggerHaptic("light");
        if (typeof showExitToast === "function") {
          showExitToast("Press back again to exit Coffeely");
        }
      }
    } catch (err) {
      console.warn("Back button handling notice:", err);
    }
  });

  return () => {
    listenerHandle.then((handle) => handle.remove()).catch(() => {});
  };
};
