/// <reference types="@cloudflare/workers-types" />
/// <reference types="@cloudflare/vitest-pool-workers/types" />

import type { D1Migration } from "@cloudflare/vitest-pool-workers";

// Phiên bản 0.22.0 của @cloudflare/vitest-pool-workers bỏ pattern
// `interface ProvidedEnv` cũ, thay bằng gộp kiểu vào namespace global
// `Cloudflare.Env` (namespace này do @cloudflare/workers-types khai báo).
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
