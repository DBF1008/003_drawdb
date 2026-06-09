import { describe, it, expect } from "vitest";
import { toMySQL } from "../utils/exportSQL/mysql";
import { toPostgres } from "../utils/exportSQL/postgres";
import { toSqlite } from "../utils/exportSQL/sqlite";
import { exportSQL } from "../utils/exportSQL/index";
import { DB } from "../data/constants";

// --- helpers ---

function makeDiagram(database, overrides = {}) {
  return {
    database,
    tables: [],
    references: [],
    types: [],
    enums: [],
    ...overrides,
  };
}

function makeField(overrides = {}) {
  return {
    id: "f1",
    name: "col1",
    type: "INT",
    default: "",
    check: "",
    primary: false,
    unique: false,
    unsigned: false,
    notNull: false,
    increment: false,
    comment: "",
    size: "",
    values: [],
    isArray: false,
    ...overrides,
  };
}

function makeTable(overrides = {}) {
  return {
    id: "t1",
    name: "users",
    x: 0,
    y: 0,
    fields: [makeField()],
    indices: [],
    comment: "",
    color: "#175e7a",
    ...overrides,
  };
}

function makeReference(overrides = {}) {
  return {
    id: "r1",
    startTableId: "t1",
    startFieldId: "f1",
    endTableId: "t2",
    endFieldId: "f2",
    name: "fk_user_order",
    cardinality: "one_to_many",
    updateConstraint: "Cascade",
    deleteConstraint: "Cascade",
    ...overrides,
  };
}

// =====================================================================
// MySQL tests
// =====================================================================
describe("MySQL SQL Export (toMySQL)", () => {
  it("should generate CREATE TABLE with correct syntax", () => {
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [makeTable()],
    });
    const sql = toMySQL(diagram);

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `users`");
    expect(sql).toContain("`col1` INT");
  });

  it("should handle NOT NULL, UNIQUE, AUTO_INCREMENT", () => {
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [
        makeTable({
          fields: [
            makeField({
              name: "id",
              type: "INTEGER",
              notNull: true,
              unique: true,
              increment: true,
            }),
          ],
        }),
      ],
    });
    const sql = toMySQL(diagram);

    expect(sql).toContain("NOT NULL");
    expect(sql).toContain("AUTO_INCREMENT");
    expect(sql).toContain("UNIQUE");
  });

  it("should generate PRIMARY KEY clause", () => {
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [
        makeTable({
          fields: [
            makeField({ name: "id", type: "INTEGER", primary: true }),
            makeField({ id: "f2", name: "email", type: "VARCHAR", size: "255" }),
          ],
        }),
      ],
    });
    const sql = toMySQL(diagram);

    expect(sql).toContain("PRIMARY KEY(`id`)");
  });

  it("should generate composite PRIMARY KEY", () => {
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [
        makeTable({
          fields: [
            makeField({
              id: "f1",
              name: "user_id",
              type: "INTEGER",
              primary: true,
            }),
            makeField({
              id: "f2",
              name: "role_id",
              type: "INTEGER",
              primary: true,
            }),
          ],
        }),
      ],
    });
    const sql = toMySQL(diagram);

    expect(sql).toContain("PRIMARY KEY(`user_id`, `role_id`)");
  });

  it("should generate FOREIGN KEY with ALTER TABLE", () => {
    const t1 = makeTable({
      id: "t1",
      name: "orders",
      fields: [makeField({ id: "f1", name: "user_id", type: "INTEGER" })],
    });
    const t2 = makeTable({
      id: "t2",
      name: "users",
      fields: [makeField({ id: "f2", name: "id", type: "INTEGER" })],
    });
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [t1, t2],
      references: [makeReference()],
    });
    const sql = toMySQL(diagram);

    expect(sql).toContain("ALTER TABLE `orders`");
    expect(sql).toContain(
      "ADD FOREIGN KEY(`user_id`) REFERENCES `users`(`id`)",
    );
    expect(sql).toContain("ON UPDATE CASCADE ON DELETE CASCADE");
  });

  it("should generate INDEX statements", () => {
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [
        makeTable({
          indices: [
            { id: 0, name: "idx_col1", fields: ["col1"], unique: false },
          ],
        }),
      ],
    });
    const sql = toMySQL(diagram);

    expect(sql).toContain("CREATE INDEX `idx_col1`");
    expect(sql).toContain("ON `users` (`col1`)");
  });

  it("should generate UNIQUE INDEX", () => {
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [
        makeTable({
          indices: [
            { id: 0, name: "uniq_email", fields: ["email"], unique: true },
          ],
        }),
      ],
    });
    const sql = toMySQL(diagram);

    expect(sql).toContain("CREATE UNIQUE INDEX `uniq_email`");
  });

  it("should handle table and field comments", () => {
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [
        makeTable({
          comment: "User accounts",
          fields: [
            makeField({ name: "id", type: "INTEGER", comment: "Primary key" }),
          ],
        }),
      ],
    });
    const sql = toMySQL(diagram);

    expect(sql).toContain("COMMENT='User accounts'");
    expect(sql).toContain("COMMENT 'Primary key'");
  });

  it("should handle ENUM type with values", () => {
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [
        makeTable({
          fields: [
            makeField({
              name: "status",
              type: "ENUM",
              values: ["active", "inactive", "banned"],
            }),
          ],
        }),
      ],
    });
    const sql = toMySQL(diagram);

    expect(sql).toContain("ENUM('active', 'inactive', 'banned')");
  });

  it("should handle VARCHAR with size", () => {
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [
        makeTable({
          fields: [makeField({ name: "email", type: "VARCHAR", size: "255" })],
        }),
      ],
    });
    const sql = toMySQL(diagram);

    expect(sql).toContain("`email` VARCHAR(255)");
  });

  it("should handle UNSIGNED integer", () => {
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [
        makeTable({
          fields: [
            makeField({
              name: "age",
              type: "INTEGER",
              unsigned: true,
            }),
          ],
        }),
      ],
    });
    const sql = toMySQL(diagram);

    expect(sql).toContain("UNSIGNED");
  });

  it("should handle DEFAULT value", () => {
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [
        makeTable({
          fields: [
            makeField({ name: "status", type: "INTEGER", default: "0" }),
          ],
        }),
      ],
    });
    const sql = toMySQL(diagram);

    expect(sql).toContain("DEFAULT 0");
  });

  it("should handle CHECK constraint", () => {
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [
        makeTable({
          fields: [
            makeField({
              name: "age",
              type: "INTEGER",
              check: "age >= 0",
            }),
          ],
        }),
      ],
    });
    const sql = toMySQL(diagram);

    expect(sql).toContain("CHECK(age >= 0)");
  });

  it("should handle multiple tables", () => {
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [
        makeTable({ id: "t1", name: "users" }),
        makeTable({ id: "t2", name: "posts" }),
      ],
    });
    const sql = toMySQL(diagram);

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `users`");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `posts`");
  });
});

// =====================================================================
// PostgreSQL tests
// =====================================================================
describe("PostgreSQL SQL Export (toPostgres)", () => {
  it("should generate CREATE TABLE with double-quote syntax", () => {
    const diagram = makeDiagram(DB.POSTGRES, {
      tables: [
        makeTable({
          fields: [makeField({ name: "id", type: "INTEGER" })],
        }),
      ],
    });
    const sql = toPostgres(diagram);

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "users"');
    expect(sql).toContain('"id" INTEGER');
  });

  it("should handle GENERATED BY DEFAULT AS IDENTITY for auto-increment", () => {
    const diagram = makeDiagram(DB.POSTGRES, {
      tables: [
        makeTable({
          fields: [
            makeField({
              name: "id",
              type: "INTEGER",
              increment: true,
            }),
          ],
        }),
      ],
    });
    const sql = toPostgres(diagram);

    expect(sql).toContain("GENERATED BY DEFAULT AS IDENTITY");
    expect(sql).not.toContain("AUTO_INCREMENT");
  });

  it("should generate PRIMARY KEY with double quotes", () => {
    const diagram = makeDiagram(DB.POSTGRES, {
      tables: [
        makeTable({
          fields: [
            makeField({ name: "id", type: "INTEGER", primary: true }),
          ],
        }),
      ],
    });
    const sql = toPostgres(diagram);

    expect(sql).toContain('PRIMARY KEY("id")');
  });

  it("should generate CREATE TYPE ... AS ENUM for enums", () => {
    const diagram = makeDiagram(DB.POSTGRES, {
      tables: [],
      enums: [{ id: "e1", name: "status_type", values: ["active", "banned"] }],
    });
    const sql = toPostgres(diagram);

    expect(sql).toContain('CREATE TYPE "status_type" AS ENUM');
    expect(sql).toContain("'active'");
    expect(sql).toContain("'banned'");
  });

  it("should generate COMMENT ON TABLE and COMMENT ON COLUMN", () => {
    const diagram = makeDiagram(DB.POSTGRES, {
      tables: [
        makeTable({
          comment: "User accounts table",
          fields: [
            makeField({
              name: "id",
              type: "INTEGER",
              comment: "Primary identifier",
            }),
          ],
        }),
      ],
    });
    const sql = toPostgres(diagram);

    expect(sql).toContain(
      `COMMENT ON TABLE "users" IS 'User accounts table'`,
    );
    expect(sql).toContain(
      `COMMENT ON COLUMN "users"."id" IS 'Primary identifier'`,
    );
  });

  it("should generate FOREIGN KEY with ALTER TABLE", () => {
    const t1 = makeTable({
      id: "t1",
      name: "orders",
      fields: [makeField({ id: "f1", name: "user_id", type: "INTEGER" })],
    });
    const t2 = makeTable({
      id: "t2",
      name: "users",
      fields: [makeField({ id: "f2", name: "id", type: "INTEGER" })],
    });
    const diagram = makeDiagram(DB.POSTGRES, {
      tables: [t1, t2],
      references: [makeReference()],
    });
    const sql = toPostgres(diagram);

    expect(sql).toContain('ALTER TABLE "orders"');
    expect(sql).toContain(
      'ADD FOREIGN KEY("user_id") REFERENCES "users"("id")',
    );
    expect(sql).toContain("ON UPDATE CASCADE ON DELETE CASCADE");
  });

  it("should handle ARRAY type", () => {
    const diagram = makeDiagram(DB.POSTGRES, {
      tables: [
        makeTable({
          fields: [
            makeField({
              name: "tags",
              type: "TEXT",
              isArray: true,
            }),
          ],
        }),
      ],
    });
    const sql = toPostgres(diagram);

    expect(sql).toContain('"tags" TEXT ARRAY');
  });

  it("should handle INHERITS clause", () => {
    const diagram = makeDiagram(DB.POSTGRES, {
      tables: [
        makeTable({
          name: "admin_users",
          fields: [makeField({ name: "level", type: "INTEGER" })],
          inherits: ["users"],
        }),
      ],
    });
    const sql = toPostgres(diagram);

    expect(sql).toContain('INHERITS ("users")');
  });

  it("should generate CREATE TYPE for custom types", () => {
    const diagram = makeDiagram(DB.POSTGRES, {
      tables: [],
      types: [
        {
          id: "tp1",
          name: "address",
          fields: [
            { name: "street", type: "TEXT" },
            { name: "city", type: "TEXT" },
          ],
          comment: "Mailing address",
        },
      ],
    });
    const sql = toPostgres(diagram);

    expect(sql).toContain("CREATE TYPE address AS");
    expect(sql).toContain("street TEXT");
    expect(sql).toContain("city TEXT");
  });

  it("should generate INDEX with double-quote quoting", () => {
    const diagram = makeDiagram(DB.POSTGRES, {
      tables: [
        makeTable({
          indices: [
            { id: 0, name: "idx_col1", fields: ["col1"], unique: false },
          ],
        }),
      ],
    });
    const sql = toPostgres(diagram);

    expect(sql).toContain('CREATE INDEX "idx_col1"');
    expect(sql).toContain('ON "users"');
  });

  it("should handle NOT NULL and UNIQUE", () => {
    const diagram = makeDiagram(DB.POSTGRES, {
      tables: [
        makeTable({
          fields: [
            makeField({
              name: "email",
              type: "VARCHAR",
              size: "255",
              notNull: true,
              unique: true,
            }),
          ],
        }),
      ],
    });
    const sql = toPostgres(diagram);

    expect(sql).toContain("NOT NULL");
    expect(sql).toContain("UNIQUE");
  });
});

// =====================================================================
// SQLite tests
// =====================================================================
describe("SQLite SQL Export (toSqlite)", () => {
  it("should generate CREATE TABLE with double-quote syntax", () => {
    const diagram = makeDiagram(DB.SQLITE, {
      tables: [
        makeTable({
          fields: [makeField({ name: "id", type: "INTEGER" })],
        }),
      ],
    });
    const sql = toSqlite(diagram);

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "users"');
    expect(sql).toContain('"id" INTEGER');
  });

  it("should handle PRIMARY KEY", () => {
    const diagram = makeDiagram(DB.SQLITE, {
      tables: [
        makeTable({
          fields: [
            makeField({ name: "id", type: "INTEGER", primary: true }),
          ],
        }),
      ],
    });
    const sql = toSqlite(diagram);

    expect(sql).toContain('PRIMARY KEY("id")');
  });

  it("should generate inline FOREIGN KEY (not ALTER TABLE)", () => {
    const t1 = makeTable({
      id: "t1",
      name: "orders",
      fields: [makeField({ id: "f1", name: "user_id", type: "INTEGER" })],
    });
    const t2 = makeTable({
      id: "t2",
      name: "users",
      fields: [makeField({ id: "f2", name: "id", type: "INTEGER" })],
    });
    const diagram = makeDiagram(DB.SQLITE, {
      tables: [t1, t2],
      references: [makeReference()],
    });
    const sql = toSqlite(diagram);

    // SQLite uses inline FK, not ALTER TABLE
    expect(sql).not.toContain("ALTER TABLE");
    expect(sql).toContain('FOREIGN KEY ("user_id") REFERENCES "users"("id")');
    expect(sql).toContain("ON UPDATE CASCADE ON DELETE CASCADE");
  });

  it("should use block comment for table comment", () => {
    const diagram = makeDiagram(DB.SQLITE, {
      tables: [
        makeTable({
          comment: "User table",
          fields: [makeField({ name: "id", type: "INTEGER" })],
        }),
      ],
    });
    const sql = toSqlite(diagram);

    expect(sql).toContain("/* User table */");
    // SQLite does NOT use COMMENT ON or COMMENT=
    expect(sql).not.toContain("COMMENT ON");
    expect(sql).not.toContain("COMMENT=");
  });

  it("should use line comment for field comment", () => {
    const diagram = makeDiagram(DB.SQLITE, {
      tables: [
        makeTable({
          fields: [
            makeField({
              name: "id",
              type: "INTEGER",
              comment: "Primary key",
            }),
          ],
        }),
      ],
    });
    const sql = toSqlite(diagram);

    expect(sql).toContain("-- Primary key");
  });

  it("should handle NOT NULL and UNIQUE", () => {
    const diagram = makeDiagram(DB.SQLITE, {
      tables: [
        makeTable({
          fields: [
            makeField({
              name: "email",
              type: "TEXT",
              notNull: true,
              unique: true,
            }),
          ],
        }),
      ],
    });
    const sql = toSqlite(diagram);

    expect(sql).toContain("NOT NULL");
    expect(sql).toContain("UNIQUE");
  });

  it("should generate INDEX with IF NOT EXISTS", () => {
    const diagram = makeDiagram(DB.SQLITE, {
      tables: [
        makeTable({
          indices: [
            { id: 0, name: "idx_col1", fields: ["col1"], unique: false },
          ],
        }),
      ],
    });
    const sql = toSqlite(diagram);

    expect(sql).toContain('CREATE INDEX IF NOT EXISTS "idx_col1"');
    expect(sql).toContain('ON "users"');
  });

  it("should handle CHECK constraint", () => {
    const diagram = makeDiagram(DB.SQLITE, {
      tables: [
        makeTable({
          fields: [
            makeField({
              name: "age",
              type: "INTEGER",
              check: "age >= 0",
            }),
          ],
        }),
      ],
    });
    const sql = toSqlite(diagram);

    expect(sql).toContain("CHECK(age >= 0)");
  });

  it("should handle DEFAULT value with quoted string", () => {
    const diagram = makeDiagram(DB.SQLITE, {
      tables: [
        makeTable({
          fields: [
            makeField({
              name: "status",
              type: "TEXT",
              default: "active",
            }),
          ],
        }),
      ],
    });
    const sql = toSqlite(diagram);

    expect(sql).toContain("DEFAULT 'active'");
  });

  it("should handle DEFAULT value for integers (no quotes)", () => {
    const diagram = makeDiagram(DB.SQLITE, {
      tables: [
        makeTable({
          fields: [
            makeField({
              name: "count",
              type: "INTEGER",
              default: "0",
            }),
          ],
        }),
      ],
    });
    const sql = toSqlite(diagram);

    expect(sql).toContain("DEFAULT 0");
    expect(sql).not.toContain("DEFAULT '0'");
  });
});

// =====================================================================
// exportSQL router tests
// =====================================================================
describe("exportSQL router", () => {
  it("should dispatch to MySQL exporter", () => {
    const diagram = makeDiagram(DB.MYSQL, {
      tables: [makeTable()],
    });
    const sql = exportSQL(diagram);
    expect(sql).toContain("`users`");
  });

  it("should dispatch to PostgreSQL exporter", () => {
    const diagram = makeDiagram(DB.POSTGRES, {
      tables: [
        makeTable({
          fields: [makeField({ name: "id", type: "INTEGER" })],
        }),
      ],
    });
    const sql = exportSQL(diagram);
    expect(sql).toContain('"users"');
  });

  it("should dispatch to SQLite exporter", () => {
    const diagram = makeDiagram(DB.SQLITE, {
      tables: [
        makeTable({
          fields: [makeField({ name: "id", type: "INTEGER" })],
        }),
      ],
    });
    const sql = exportSQL(diagram);
    expect(sql).toContain('"users"');
  });

  it("should return empty string for unknown database", () => {
    const diagram = makeDiagram("unknown_db", {
      tables: [makeTable()],
    });
    const sql = exportSQL(diagram);
    expect(sql).toBe("");
  });
});

// =====================================================================
// Cross-database comparison tests
// =====================================================================
describe("Cross-database SQL differences", () => {
  const baseTable = makeTable({
    fields: [
      makeField({
        id: "f1",
        name: "id",
        type: "INTEGER",
        primary: true,
        notNull: true,
        increment: true,
      }),
    ],
  });

  it("MySQL uses backticks, PG uses double quotes, SQLite uses double quotes", () => {
    const mysqlSQL = toMySQL(
      makeDiagram(DB.MYSQL, { tables: [baseTable] }),
    );
    const pgSQL = toPostgres(
      makeDiagram(DB.POSTGRES, { tables: [baseTable] }),
    );
    const sqliteSQL = toSqlite(
      makeDiagram(DB.SQLITE, { tables: [baseTable] }),
    );

    expect(mysqlSQL).toContain("`id`");
    expect(pgSQL).toContain('"id"');
    expect(sqliteSQL).toContain('"id"');

    expect(mysqlSQL).not.toContain('"id"');
    expect(pgSQL).not.toContain("`id`");
  });

  it("MySQL uses AUTO_INCREMENT, PG uses GENERATED BY DEFAULT AS IDENTITY", () => {
    const mysqlSQL = toMySQL(
      makeDiagram(DB.MYSQL, { tables: [baseTable] }),
    );
    const pgSQL = toPostgres(
      makeDiagram(DB.POSTGRES, { tables: [baseTable] }),
    );

    expect(mysqlSQL).toContain("AUTO_INCREMENT");
    expect(pgSQL).toContain("GENERATED BY DEFAULT AS IDENTITY");
    expect(pgSQL).not.toContain("AUTO_INCREMENT");
  });

  it("SQLite uses inline FK, MySQL/PG use ALTER TABLE", () => {
    const t1 = makeTable({
      id: "t1",
      name: "orders",
      fields: [makeField({ id: "f1", name: "user_id", type: "INTEGER" })],
    });
    const t2 = makeTable({
      id: "t2",
      name: "users",
      fields: [makeField({ id: "f2", name: "id", type: "INTEGER" })],
    });
    const ref = makeReference();

    const mysqlSQL = toMySQL(
      makeDiagram(DB.MYSQL, { tables: [t1, t2], references: [ref] }),
    );
    const pgSQL = toPostgres(
      makeDiagram(DB.POSTGRES, { tables: [t1, t2], references: [ref] }),
    );
    const sqliteSQL = toSqlite(
      makeDiagram(DB.SQLITE, { tables: [t1, t2], references: [ref] }),
    );

    expect(mysqlSQL).toContain("ALTER TABLE");
    expect(pgSQL).toContain("ALTER TABLE");
    expect(sqliteSQL).not.toContain("ALTER TABLE");
    expect(sqliteSQL).toContain("FOREIGN KEY");
  });
});
