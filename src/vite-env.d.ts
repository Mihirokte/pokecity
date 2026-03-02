/// <reference types="vite/client" />

interface Window {
  claude: {
    complete: (prompt: string) => Promise<string>;
  };
}
