import { expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PaketSemasi } from "../../src/lib/calisma-odasi/sema";
const root = resolve("src/data/calisma-odasi");
it("validates every published study room against the player schema", () => {
  for (const file of readdirSync(root).filter((f) => f.endsWith(".json"))) {
    const result = PaketSemasi.safeParse(
      JSON.parse(readFileSync(resolve(root, file), "utf8")),
    );
    expect(
      result.success,
      `${file}: ${result.success ? "" : result.error.message}`,
    ).toBe(true);
  }
});
