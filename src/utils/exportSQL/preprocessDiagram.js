import { convertName } from "../namingConvention";

export function preprocessDiagram(diagramData, options) {
  const { schemaOnly = false, namingConvention = "original" } = options || {};

  const data = structuredClone(diagramData);

  if (namingConvention !== "original") {
    for (const table of data.tables) {
      table.name = convertName(table.name, namingConvention);
      for (const field of table.fields) {
        field.name = convertName(field.name, namingConvention);
      }
      if (table.indices) {
        for (const idx of table.indices) {
          idx.fields = idx.fields.map((f) => convertName(f, namingConvention));
        }
      }
    }
  }

  if (schemaOnly) {
    for (const table of data.tables) {
      table.comment = "";
      table.indices = [];
      for (const field of table.fields) {
        field.comment = "";
        field.default = "";
        field.check = "";
        field.unique = false;
        field.notNull = false;
        field.increment = false;
      }
    }
    data.references = [];
  }

  return data;
}
