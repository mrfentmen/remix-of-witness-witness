/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/test/"],
    },
    env: {
      SUPABASE_URL: "https://roazfxusdkoxiziijmgh.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvYXpmeHVzZGtveGl6aWlqbWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzODc5NDcsImV4cCI6MjA5Mzk2Mzk0N30.WcsKuD42EJzjVOWtTaFTFee74bBp-C4jrxb4fpBCroA",
      VITE_SUPABASE_URL: "https://roazfxusdkoxiziijmgh.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvYXpmeHVzZGtveGl6aWlqbWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzODc5NDcsImV4cCI6MjA5Mzk2Mzk0N30.WcsKuD42EJzjVOWtTaFTFee74bBp-C4jrxb4fpBCroA",
      VITE_SUPABASE_PROJECT_ID: "roazfxusdkoxiziijmgh",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
