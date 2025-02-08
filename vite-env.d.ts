/// <reference types="vite/client" />

// Declare modules for Vite-specific import types
declare module '*?worker' {
    const workerConstructor: new () => Worker;
    export default workerConstructor;
  }
  
  declare module '*?url' {
    const url: string;
    export default url;
  }