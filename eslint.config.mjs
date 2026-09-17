import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Code sinh tự động của bản build Workers (OpenNext / Wrangler), không
    // phải code do người viết — lint chúng chỉ tạo hàng nghìn cảnh báo vô ích
    // và khiến cổng lint luôn đỏ, dạy người ta phớt lờ nó.
    ".open-next/**",
    ".wrangler/**",
  ]),
]);

export default eslintConfig;
