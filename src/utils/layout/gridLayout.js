import { tableWidth as defaultTableWidth } from "../../data/constants";
import { estimateTableHeight } from "./estimateTableHeight";

/**
 * Computes grid positions for tables. Pure function - no mutation, no DOM access.
 *
 * @param {Array} tables - Array of table objects (must have .id and .fields)
 * @param {Object} [options={}]
 * @param {number}   [options.tableWidth=220]   - Width of each table
 * @param {number}   [options.gapX=54]          - Horizontal gap between tables
 * @param {number}   [options.gapY=40]          - Vertical gap between rows
 * @param {number}   [options.columnsPerRow]     - Max tables per row (default: ceil(sqrt(n)))
 * @param {number}   [options.startX]            - X origin offset (default: gapX)
 * @param {number}   [options.startY]            - Y origin offset (default: gapY)
 * @param {"row"|"column"} [options.direction="row"] - "row": fill left-to-right then top-to-bottom;
 *                                                     "column": fill top-to-bottom then left-to-right
 * @param {function} [options.heightFn]          - (table, tableWidth) => number
 * @returns {Array<{id: number|string, x: number, y: number}>}
 */
export function gridLayout(tables, options = {}) {
  if (!tables || tables.length === 0) return [];

  const {
    tableWidth = defaultTableWidth,
    gapX = 54,
    gapY = 40,
    startX = gapX,
    startY = gapY,
    direction = "row",
    heightFn = estimateTableHeight,
  } = options;

  const count = tables.length;
  const columnsPerRow = options.columnsPerRow ?? Math.ceil(Math.sqrt(count));

  if (direction === "column") {
    return columnLayout(tables, {
      tableWidth,
      gapX,
      gapY,
      startX,
      startY,
      columnsPerRow,
      heightFn,
    });
  }

  return rowLayout(tables, {
    tableWidth,
    gapX,
    gapY,
    startX,
    startY,
    columnsPerRow,
    heightFn,
  });
}

function rowLayout(tables, config) {
  const { tableWidth, gapX, gapY, startX, startY, columnsPerRow, heightFn } =
    config;

  // Pass 1: compute heights and assign grid cells
  const cells = [];
  const rowMaxHeights = [];

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const row = Math.floor(i / columnsPerRow);
    const col = i % columnsPerRow;
    const height = heightFn(table, tableWidth);

    rowMaxHeights[row] = Math.max(rowMaxHeights[row] ?? 0, height);
    cells.push({ id: table.id, row, col });
  }

  // Pass 2: compute cumulative Y offsets
  const rowY = [startY];
  for (let r = 0; r < rowMaxHeights.length - 1; r++) {
    rowY[r + 1] = rowY[r] + rowMaxHeights[r] + gapY;
  }

  // Pass 3: assign positions
  return cells.map(({ id, row, col }) => ({
    id,
    x: startX + col * (tableWidth + gapX),
    y: rowY[row],
  }));
}

function columnLayout(tables, config) {
  const { tableWidth, gapX, gapY, startX, startY, columnsPerRow, heightFn } =
    config;

  const rowsPerColumn = Math.ceil(tables.length / columnsPerRow);

  // Pass 1: compute heights and assign grid cells
  const cells = [];
  const rowMaxHeights = [];

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const row = i % rowsPerColumn;
    const col = Math.floor(i / rowsPerColumn);
    const height = heightFn(table, tableWidth);

    rowMaxHeights[row] = Math.max(rowMaxHeights[row] ?? 0, height);
    cells.push({ id: table.id, row, col });
  }

  // Pass 2: compute cumulative Y offsets
  const rowY = [startY];
  for (let r = 0; r < rowMaxHeights.length - 1; r++) {
    rowY[r + 1] = rowY[r] + rowMaxHeights[r] + gapY;
  }

  // Pass 3: assign positions
  return cells.map(({ id, row, col }) => ({
    id,
    x: startX + col * (tableWidth + gapX),
    y: rowY[row],
  }));
}
