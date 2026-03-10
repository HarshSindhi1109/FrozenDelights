import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync("../backend/localhost-key.pem"),
      cert: fs.readFileSync("../backend/localhost.pem"),
    },
    proxy: {
      "/uploads": {
        target: "https://localhost:5050",
        secure: false,
        changeOrigin: true,
      },
    },
  },
});
