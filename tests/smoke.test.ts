import { describe, it, expect } from "vitest";
import { formatDate } from "@/lib/format";

describe("bộ khung kiểm thử", () => {
  it("giải được alias @/ tới src/", () => {
    expect(typeof formatDate).toBe("function");
  });
});
