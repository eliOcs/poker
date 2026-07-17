import { describe, it } from "node:test";
import assert from "node:assert";
import {
  allocateManagedTableIdentity,
  FINAL_TABLE_NAME,
} from "../../src/backend/mtt-table-names.js";

describe("mtt table names", () => {
  it("allocates durable regular names and monotonically increasing creation order", () => {
    const tournament =
      /** @type {import("../../src/backend/mtt.js").ManagedTournament} */ (
        /** @type {unknown} */ ({
          tables: [
            { tableName: "Table 1", createdOrder: 0 },
            { tableName: FINAL_TABLE_NAME, createdOrder: 2 },
          ],
        })
      );

    assert.deepEqual(
      allocateManagedTableIdentity(tournament, { finalTable: false }),
      { tableName: "Table 2", createdOrder: 3 },
    );
    assert.deepEqual(
      allocateManagedTableIdentity(tournament, { finalTable: true }),
      { tableName: FINAL_TABLE_NAME, createdOrder: 3 },
    );
  });
});
