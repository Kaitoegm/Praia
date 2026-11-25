import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    browserName:process.env.PRAIA_WEBKIT==='1'?'webkit':'chromium',
    baseURL: "http://127.0.0.1:4173",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: [
    {
      command:
        "npm run dev -- --mode navegacao --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 4174 --strictPort",
      url: "http://127.0.0.1:4174",
    },
  ],
});
