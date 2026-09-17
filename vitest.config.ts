import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
        },
        test: {
          name: "node",
          environment: "node",
          // Loại tests/workers — những file đó cần runtime workerd.
          include: ["tests/*.test.ts"],
        },
      },
      "./vitest.workers.config.mts",
    ],
  },
});
