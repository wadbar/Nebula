export const triggerHaptic = (pattern: number | number[] = 50) => {
  if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
    try {
      window.navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration errors
    }
  }
};

export const hapticHover = () => triggerHaptic(10);
export const hapticClick = () => triggerHaptic(20);
export const hapticSuccess = () => triggerHaptic([30, 50, 30, 50, 50]);
export const hapticError = () => triggerHaptic([50, 50, 50, 50, 50]);
