// App version configuration
export const APP_VERSION = '1.0.8';
export const BUILD_NUMBER = '20251213'; // YYYYMMDD format

export const getFullVersion = () => {
  return `v${APP_VERSION} (${BUILD_NUMBER})`;
};
