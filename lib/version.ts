// App version configuration
export const APP_VERSION = '1.0.9';
export const BUILD_NUMBER = '20251215'; // YYYYMMDD format

export const getFullVersion = () => {
  return `v${APP_VERSION} (${BUILD_NUMBER})`;
};
