import { gridLayout } from "./layout";

export function arrangeTables(diagram, options) {
  const positions = gridLayout(diagram.tables, options);
  const posMap = new Map(positions.map((p) => [p.id, p]));
  diagram.tables.forEach((table) => {
    const pos = posMap.get(table.id);
    if (pos) {
      table.x = pos.x;
      table.y = pos.y;
    }
  });
}
