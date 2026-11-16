declare global {
  interface Window {
    electronAPI?: {
      /* ---------------------------------------------------
         Window controls
      --------------------------------------------------- */

      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      platform: string;
    };
  }
}

export {};
