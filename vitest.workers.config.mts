import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Đọc file migration lúc cấu hình, ở Node, rồi đưa vào test qua binding.
// Trong workerd không có fs nên test không tự đọc file được.
const migrations = await readD1Migrations("./migrations");

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: "2026-03-01",
        // Phải khớp compatibility_flags trong wrangler.jsonc, nếu không test
        // chạy trên runtime khác production.
        compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
        d1Databases: ["DB"],
        bindings: { TEST_MIGRATIONS: migrations },
      },
    }),
  ],
  test: {
    name: "workers",
    include: ["tests/workers/**/*.test.ts"],
  },
});
