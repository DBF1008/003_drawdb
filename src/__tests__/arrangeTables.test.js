import { describe, it, expect } from "vitest";
import { arrangeTables } from "../utils/arrangeTables";
import {
  tableFieldHeight,
  tableHeaderHeight,
  tableColorStripHeight,
} from "../data/constants";

function makeTable(id, fieldCount) {
  return {
    id: String(id),
    name: `table_${id}`,
    x: 0,
    y: 0,
    fields: Array.from({ length: fieldCount }, (_, i) => ({
      id: String(i),
      name: `field_${i}`,
      type: "INT",
      default: "",
      check: "",
      primary: false,
      unique: false,
      notNull: false,
      increment: false,
      comment: "",
    })),
    indices: [],
    comment: "",
    color: "#175e7a",
  };
}

describe("arrangeTables", () => {
  const tableWidth = 200;
  const gapX = 54;
  const gapY = 40;

  it("should handle an empty table list without errors", () => {
    const diagram = { tables: [] };
    arrangeTables(diagram);
    expect(diagram.tables).toEqual([]);
  });

  it("should position a single table in row 1", () => {
    const diagram = { tables: [makeTable(1, 3)] };
    arrangeTables(diagram);

    // Single table: i=0, length=1, 0 < 0.5 → true in JS → row 1
    // x = 0*200 + 1*54 = 54, y = gapY = 40
    expect(diagram.tables[0].x).toBe(0 * tableWidth + (0 + 1) * gapX);
    expect(diagram.tables[0].y).toBe(gapY);
  });

  it("should arrange 2 tables in two rows", () => {
    const diagram = { tables: [makeTable(1, 2), makeTable(2, 4)] };
    arrangeTables(diagram);

    // table 0: i=0, 0 < 1 → row 1, x = 0*200+54 = 54, y = 40
    expect(diagram.tables[0].x).toBe(gapX);
    expect(diagram.tables[0].y).toBe(gapY);

    // table 1: i=1, 1 < 1 → false → row 2, index = 2-1-1 = 0
    // x = 0*200+54 = 54
    const height0 =
      2 * tableFieldHeight + tableHeaderHeight + tableColorStripHeight;
    expect(diagram.tables[1].x).toBe(gapX);
    expect(diagram.tables[1].y).toBe(height0 + 2 * gapY);
  });

  it("should arrange 4 tables in a 2x2 grid", () => {
    const diagram = {
      tables: [
        makeTable(1, 2),
        makeTable(2, 5),
        makeTable(3, 1),
        makeTable(4, 3),
      ],
    };
    arrangeTables(diagram);

    // Row 1: tables 0,1 (i < 4/2 = 2)
    expect(diagram.tables[0].x).toBe(0 * tableWidth + 1 * gapX);
    expect(diagram.tables[0].y).toBe(gapY);

    expect(diagram.tables[1].x).toBe(1 * tableWidth + 2 * gapX);
    expect(diagram.tables[1].y).toBe(gapY);

    // maxHeight = max of table0 and table1 heights
    const h0 =
      2 * tableFieldHeight + tableHeaderHeight + tableColorStripHeight;
    const h1 =
      5 * tableFieldHeight + tableHeaderHeight + tableColorStripHeight;
    const maxHeight = Math.max(h0, h1);

    // Row 2: tables 2,3 (i >= 2)
    // table 2: i=2, index = 4-2-1 = 1
    expect(diagram.tables[2].x).toBe(1 * tableWidth + 2 * gapX);
    expect(diagram.tables[2].y).toBe(maxHeight + 2 * gapY);

    // table 3: i=3, index = 4-3-1 = 0
    expect(diagram.tables[3].x).toBe(0 * tableWidth + 1 * gapX);
    expect(diagram.tables[3].y).toBe(maxHeight + 2 * gapY);
  });

  it("should arrange 3 tables (odd count): 1 in row 1, 2 in row 2", () => {
    const diagram = {
      tables: [makeTable(1, 3), makeTable(2, 2), makeTable(3, 4)],
    };
    arrangeTables(diagram);

    // i=0: 0 < 1.5 → row 1
    expect(diagram.tables[0].y).toBe(gapY);

    // i=1: 1 < 1.5 → row 1
    expect(diagram.tables[1].y).toBe(gapY);

    // i=2: 2 < 1.5 → false → row 2
    const h0 =
      3 * tableFieldHeight + tableHeaderHeight + tableColorStripHeight;
    const h1 =
      2 * tableFieldHeight + tableHeaderHeight + tableColorStripHeight;
    const maxHeight = Math.max(h0, h1);
    expect(diagram.tables[2].y).toBe(maxHeight + 2 * gapY);
  });

  it("should compute maxHeight from the tallest table in row 1", () => {
    // Table with 10 fields should be taller than table with 1 field
    const diagram = {
      tables: [makeTable(1, 1), makeTable(2, 10), makeTable(3, 2), makeTable(4, 3)],
    };
    arrangeTables(diagram);

    const tallest =
      10 * tableFieldHeight + tableHeaderHeight + tableColorStripHeight;

    // Row 2 y should be based on tallest row-1 table
    expect(diagram.tables[2].y).toBe(tallest + 2 * gapY);
    expect(diagram.tables[3].y).toBe(tallest + 2 * gapY);
  });

  it("should handle tables with zero fields", () => {
    const diagram = { tables: [makeTable(1, 0), makeTable(2, 0)] };
    arrangeTables(diagram);

    expect(diagram.tables[0].x).toBe(gapX);
    expect(diagram.tables[0].y).toBe(gapY);

    const h = 0 * tableFieldHeight + tableHeaderHeight + tableColorStripHeight;
    expect(diagram.tables[1].y).toBe(h + 2 * gapY);
  });

  it("should mutate the original diagram object in-place", () => {
    const diagram = { tables: [makeTable(1, 2)] };
    const ref = diagram.tables[0];
    arrangeTables(diagram);
    expect(diagram.tables[0]).toBe(ref);
    expect(ref.x).not.toBe(0);
  });

  it("should place row 2 tables in reverse order", () => {
    const diagram = {
      tables: [
        makeTable("a", 2),
        makeTable("b", 2),
        makeTable("c", 2),
        makeTable("d", 2),
        makeTable("e", 2),
        makeTable("f", 2),
      ],
    };
    arrangeTables(diagram);

    // Row 1: indices 0,1,2 (i < 3)
    // Row 2: indices 3,4,5
    // index for i=3: 6-3-1=2, for i=4: 6-4-1=1, for i=5: 6-5-1=0
    const row2Xs = [
      diagram.tables[3].x,
      diagram.tables[4].x,
      diagram.tables[5].x,
    ];
    const row1Xs = [
      diagram.tables[0].x,
      diagram.tables[1].x,
      diagram.tables[2].x,
    ];
    // Row 2 should be in reverse order of row 1
    expect(row2Xs).toEqual([...row1Xs].reverse());
  });
});
