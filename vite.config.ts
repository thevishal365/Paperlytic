import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  optimizeDeps: {
    include: [
      "@tanstack/query-sync-storage-persister",
      "@tanstack/react-query",
      "@tanstack/react-query-persist-client",
      "@tanstack/react-router",
      "@tanstack/react-store",
      "@tanstack/router-core",
      "@tanstack/router-core/isServer",
      "@tanstack/router-core/ssr/client",
      "franc",
      "react",
      "react/jsx-dev-runtime",
      "react/jsx-runtime",
      "seroval",
      "use-sync-external-store/shim/with-selector",
    ],
  },
  plugins: [tailwindcss(), tanstackStart(), netlify(), viteReact()],
});
