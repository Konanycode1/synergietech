import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET || "https://api.stssarl.com";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      host: true,
      port: 3334,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        },
      },
    },
    preview: {
      host: true,
      port: 8080,
    },
  };
});
