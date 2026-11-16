let isInitialLoad = true;

export const isFirstLoad = () => isInitialLoad;
export const markAppLoaded = () => {
  isInitialLoad = false;
};
