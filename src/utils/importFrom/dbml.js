import { Parser } from "@dbml/core";
import { arrangeTables } from "../arrangeTables";
import { Cardinality, Constraint } from "../../data/constants";
import { nanoid } from "nanoid";

const parser = new Parser();

function splitDBMLBlocks(src) {
  const blocks = [];
  const lines = src.split("\n");
  let currentBlock = null;
  let braceDepth = 0;

  const blockStartRegex = /^\s*(Table|Enum|TableGroup|Project)\s+/i;
  const inlineRefRegex = /^\s*Ref\s*[:\s]/i;
  const refBlockRegex = /^\s*Ref\s+\w+/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (currentBlock === null) {
      if (blockStartRegex.test(line) || refBlockRegex.test(line)) {
        const match = line.match(
          /^\s*(Table|Enum|TableGroup|Project|Ref)\s*/i,
        );
        const type = match ? match[1] : "Unknown";
        currentBlock = { type, lines: [line], startLine: i + 1 };
        const opens = (line.match(/{/g) || []).length;
        const closes = (line.match(/}/g) || []).length;
        braceDepth = opens - closes;
        if (opens > 0 && braceDepth <= 0) {
          blocks.push({
            ...currentBlock,
            content: currentBlock.lines.join("\n"),
          });
          currentBlock = null;
          braceDepth = 0;
        }
      } else if (inlineRefRegex.test(line) && !line.includes("{")) {
        blocks.push({
          type: "Ref",
          lines: [line],
          startLine: i + 1,
          content: line,
        });
      }
    } else {
      currentBlock.lines.push(line);
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;
      if (braceDepth <= 0) {
        blocks.push({
          ...currentBlock,
          content: currentBlock.lines.join("\n"),
        });
        currentBlock = null;
        braceDepth = 0;
      }
    }
  }

  if (currentBlock) {
    blocks.push({ ...currentBlock, content: currentBlock.lines.join("\n") });
  }

  return blocks;
}

function processSchema(schema, tables, relationships, enums, warnings) {
  for (const table of schema.tables) {
    try {
      const parsedTable = {};
      parsedTable.id = nanoid();
      parsedTable.name = table.name;
      parsedTable.comment = table.note ?? "";
      parsedTable.color = table.headerColor ?? "#175e7a";
      parsedTable.fields = [];
      parsedTable.indices = [];

      for (const column of table.fields) {
        const field = {};
        field.id = nanoid();
        field.name = column.name;
        field.type = column.type.type_name.toUpperCase();
        field.default = column.dbdefault?.value ?? "";
        field.check = "";
        field.primary = !!column.pk;
        field.unique = !!column.pk;
        field.notNull = !!column.not_null;
        field.increment = !!column.increment;
        field.comment = column.note ?? "";
        parsedTable.fields.push(field);
      }

      for (const idx of table.indexes) {
        const parsedIndex = {};
        parsedIndex.id = idx.id - 1;
        parsedIndex.fields = idx.columns.map((x) => x.value);
        parsedIndex.name =
          idx.name ?? `${parsedTable.name}_index_${parsedIndex.id}`;
        parsedIndex.unique = !!idx.unique;
        parsedTable.indices.push(parsedIndex);
      }

      tables.push(parsedTable);
    } catch (e) {
      warnings.push({
        type: "table",
        name: table.name || "unknown",
        reason: e.message || "Unknown error",
      });
    }
  }

  for (const ref of schema.refs) {
    try {
      const startTableName = ref.endpoints[0].tableName;
      const endTableName = ref.endpoints[1].tableName;
      const startFieldName = ref.endpoints[0].fieldNames[0];
      const endFieldName = ref.endpoints[1].fieldNames[0];

      const startTable = tables.find((t) => t.name === startTableName);
      if (!startTable) {
        warnings.push({
          type: "ref",
          name: `${startTableName}.${startFieldName} -> ${endTableName}.${endFieldName}`,
          reason: `Table "${startTableName}" not found`,
        });
        continue;
      }

      const endTable = tables.find((t) => t.name === endTableName);
      if (!endTable) {
        warnings.push({
          type: "ref",
          name: `${startTableName}.${startFieldName} -> ${endTableName}.${endFieldName}`,
          reason: `Table "${endTableName}" not found`,
        });
        continue;
      }

      const endField = endTable.fields.find((f) => f.name === endFieldName);
      if (!endField) {
        warnings.push({
          type: "ref",
          name: `${startTableName}.${startFieldName} -> ${endTableName}.${endFieldName}`,
          reason: `Field "${endFieldName}" not found in "${endTableName}"`,
        });
        continue;
      }

      const startField = startTable.fields.find(
        (f) => f.name === startFieldName,
      );
      if (!startField) {
        warnings.push({
          type: "ref",
          name: `${startTableName}.${startFieldName} -> ${endTableName}.${endFieldName}`,
          reason: `Field "${startFieldName}" not found in "${startTableName}"`,
        });
        continue;
      }

      const relationship = {};
      relationship.name =
        "fk_" + startTableName + "_" + startFieldName + "_" + endTableName;
      relationship.startTableId = startTable.id;
      relationship.endTableId = endTable.id;
      relationship.endFieldId = endField.id;
      relationship.startFieldId = startField.id;
      relationship.id = nanoid();

      relationship.updateConstraint = ref.onDelete
        ? ref.onDelete[0].toUpperCase() + ref.onDelete.substring(1)
        : Constraint.NONE;
      relationship.deleteConstraint = ref.onUpdate
        ? ref.onUpdate[0].toUpperCase() + ref.onUpdate.substring(1)
        : Constraint.NONE;

      const startRelation = ref.endpoints[0].relation;
      const endRelation = ref.endpoints[1].relation;

      if (startRelation === "*" && endRelation === "1") {
        relationship.cardinality = Cardinality.MANY_TO_ONE;
      }
      if (startRelation === "1" && endRelation === "*") {
        relationship.cardinality = Cardinality.ONE_TO_MANY;
      }
      if (startRelation === "1" && endRelation === "1") {
        relationship.cardinality = Cardinality.ONE_TO_ONE;
      }

      relationships.push(relationship);
    } catch (e) {
      warnings.push({
        type: "ref",
        name: "unknown ref",
        reason: e.message || "Unknown error",
      });
    }
  }

  for (const schemaEnum of schema.enums) {
    try {
      const parsedEnum = {};
      parsedEnum.name = schemaEnum.name;
      parsedEnum.values = schemaEnum.values.map((x) => x.name);
      enums.push(parsedEnum);
    } catch (e) {
      warnings.push({
        type: "enum",
        name: schemaEnum.name || "unknown",
        reason: e.message || "Unknown error",
      });
    }
  }
}

export function fromDBML(src) {
  const warnings = [];
  const tables = [];
  const enums = [];
  const relationships = [];

  let fullParseFailed = false;

  try {
    const ast = parser.parse(src, "dbmlv2");
    for (const schema of ast.schemas) {
      processSchema(schema, tables, relationships, enums, warnings);
    }
  } catch {
    fullParseFailed = true;
  }

  if (fullParseFailed) {
    const blocks = splitDBMLBlocks(src);
    for (const block of blocks) {
      try {
        const blockAST = parser.parse(block.content, "dbmlv2");
        for (const schema of blockAST.schemas) {
          processSchema(schema, tables, relationships, enums, warnings);
        }
      } catch (blockError) {
        const preview = block.content.split("\n")[0].substring(0, 60);
        warnings.push({
          type: block.type.toLowerCase(),
          name: preview,
          reason:
            blockError.diags?.[0]?.message ||
            blockError.message ||
            "Unknown error",
        });
      }
    }
  }

  const diagram = { tables, enums, relationships };
  arrangeTables(diagram);
  return { diagram, warnings };
}
