import { describe, it, expect, beforeEach } from "vitest";
import { Action, ObjectType } from "../data/constants";

/**
 * Simulates the undo/redo state management from ControlPanel.jsx.
 *
 * The real undo/redo logic lives inside ControlPanel.jsx and is tightly coupled
 * to React Context hooks. This class replicates the same logic as pure functions
 * so we can test stack behavior, element restoration, and data integrity without
 * rendering React components.
 */
class UndoRedoSimulator {
  constructor() {
    this.tables = [];
    this.areas = [];
    this.notes = [];
    this.relationships = [];
    this.types = [];
    this.enums = [];
    this.undoStack = [];
    this.redoStack = [];
  }

  // ---- mutation helpers (mirror context provider functions) ----

  addTable(data, addToHistory = true) {
    const table = data.table || data;
    this.tables.push({ ...table });
    if (addToHistory) {
      this.undoStack.push({
        action: Action.ADD,
        element: ObjectType.TABLE,
        data: { table: { ...table }, index: this.tables.length - 1 },
        message: `Added table ${table.name}`,
      });
      this.redoStack = [];
    }
  }

  deleteTable(id, addToHistory = true) {
    const index = this.tables.findIndex((t) => t.id === id);
    if (index === -1) return;
    const table = this.tables[index];
    const relatedRels = this.relationships.filter(
      (r) => r.startTableId === id || r.endTableId === id,
    );
    this.tables.splice(index, 1);
    relatedRels.forEach((r) => {
      const ri = this.relationships.findIndex((x) => x.id === r.id);
      if (ri !== -1) this.relationships.splice(ri, 1);
    });
    if (addToHistory) {
      this.undoStack.push({
        action: Action.DELETE,
        element: ObjectType.TABLE,
        data: { table: { ...table }, relationship: [...relatedRels], index },
        message: `Deleted table ${table.name}`,
      });
      this.redoStack = [];
    }
  }

  updateTable(id, updates) {
    const table = this.tables.find((t) => t.id === id);
    if (table) Object.assign(table, updates);
  }

  addRelationship(data, addToHistory = true) {
    const rel = data.relationship || data;
    this.relationships.push({ ...rel });
    if (addToHistory) {
      this.undoStack.push({
        action: Action.ADD,
        element: ObjectType.RELATIONSHIP,
        data: { relationship: { ...rel } },
        message: `Added relationship`,
      });
      this.redoStack = [];
    }
  }

  deleteRelationship(id, addToHistory = true) {
    const index = this.relationships.findIndex((r) => r.id === id);
    if (index === -1) return;
    const rel = this.relationships[index];
    this.relationships.splice(index, 1);
    if (addToHistory) {
      this.undoStack.push({
        action: Action.DELETE,
        element: ObjectType.RELATIONSHIP,
        data: { ...rel },
        message: `Deleted relationship`,
      });
      this.redoStack = [];
    }
  }

  addNote(data, addToHistory = true) {
    const note = data || { id: `n${this.notes.length}`, title: "", content: "", x: 0, y: 0 };
    this.notes.push({ ...note });
    if (addToHistory) {
      this.undoStack.push({
        action: Action.ADD,
        element: ObjectType.NOTE,
        data: { ...note },
        message: `Added note`,
      });
      this.redoStack = [];
    }
  }

  deleteNote(id, addToHistory = true) {
    const index = this.notes.findIndex((n) => n.id === id);
    if (index === -1) return;
    const note = this.notes[index];
    this.notes.splice(index, 1);
    if (addToHistory) {
      this.undoStack.push({
        action: Action.DELETE,
        element: ObjectType.NOTE,
        data: { ...note },
        message: `Deleted note`,
      });
      this.redoStack = [];
    }
  }

  updateNote(id, updates) {
    const note = this.notes.find((n) => n.id === id);
    if (note) Object.assign(note, updates);
  }

  addArea(data, addToHistory = true) {
    const area = data || { id: `a${this.areas.length}`, name: "", x: 0, y: 0, width: 200, height: 200 };
    this.areas.push({ ...area });
    if (addToHistory) {
      this.undoStack.push({
        action: Action.ADD,
        element: ObjectType.AREA,
        data: { ...area },
        message: `Added area`,
      });
      this.redoStack = [];
    }
  }

  deleteArea(id, addToHistory = true) {
    const index = this.areas.findIndex((a) => a.id === id);
    if (index === -1) return;
    const area = this.areas[index];
    this.areas.splice(index, 1);
    if (addToHistory) {
      this.undoStack.push({
        action: Action.DELETE,
        element: ObjectType.AREA,
        data: { ...area },
        message: `Deleted area`,
      });
      this.redoStack = [];
    }
  }

  updateArea(id, updates) {
    const area = this.areas.find((a) => a.id === id);
    if (area) Object.assign(area, updates);
  }

  // Record a MOVE action (simulates Canvas.jsx drag-end)
  recordMove(id, elementType, oldX, oldY, newX, newY) {
    this.undoStack.push({
      action: Action.MOVE,
      element: elementType,
      id,
      x: oldX,
      y: oldY,
      message: `Moved element`,
    });
    this.redoStack = [];
    // Apply the move
    if (elementType === ObjectType.TABLE) {
      this.updateTable(id, { x: newX, y: newY });
    } else if (elementType === ObjectType.AREA) {
      this.updateArea(id, { x: newX, y: newY });
    } else if (elementType === ObjectType.NOTE) {
      this.updateNote(id, { x: newX, y: newY });
    }
  }

  // Record a bulk MOVE action
  recordBulkMove(elements) {
    this.undoStack.push({
      action: Action.MOVE,
      bulk: true,
      message: `Moved elements`,
      elements: elements.map((e) => ({
        id: e.id,
        type: e.type,
        undo: { x: e.oldX, y: e.oldY },
        redo: { x: e.newX, y: e.newY },
      })),
    });
    this.redoStack = [];
    for (const e of elements) {
      if (e.type === ObjectType.TABLE) {
        this.updateTable(e.id, { x: e.newX, y: e.newY });
      } else if (e.type === ObjectType.AREA) {
        this.updateArea(e.id, { x: e.newX, y: e.newY });
      } else if (e.type === ObjectType.NOTE) {
        this.updateNote(e.id, { x: e.newX, y: e.newY });
      }
    }
  }

  // Record an EDIT action for a table field
  recordEditTableField(tid, fid, oldValue, newValue) {
    this.undoStack.push({
      action: Action.EDIT,
      element: ObjectType.TABLE,
      component: "field",
      tid,
      fid,
      undo: oldValue,
      redo: newValue,
      message: `Edited field`,
    });
    this.redoStack = [];
    const table = this.tables.find((t) => t.id === tid);
    if (table) {
      const field = table.fields.find((f) => f.id === fid);
      if (field) Object.assign(field, newValue);
    }
  }

  // Record an EDIT action for a table "self" (rename, comment, etc.)
  recordEditTableSelf(tid, oldValue, newValue) {
    this.undoStack.push({
      action: Action.EDIT,
      element: ObjectType.TABLE,
      component: "self",
      tid,
      undo: oldValue,
      redo: newValue,
      message: `Edited table`,
    });
    this.redoStack = [];
    this.updateTable(tid, newValue);
  }

  // Record an EDIT action for area
  recordEditArea(aid, oldValue, newValue) {
    this.undoStack.push({
      action: Action.EDIT,
      element: ObjectType.AREA,
      aid,
      undo: oldValue,
      redo: newValue,
      message: `Edited area`,
    });
    this.redoStack = [];
    this.updateArea(aid, newValue);
  }

  // ---- undo/redo (mirrors ControlPanel.jsx logic) ----

  undo() {
    if (this.undoStack.length === 0) return;
    const a = this.undoStack.pop();

    if (a.bulk) {
      for (const element of a.elements) {
        if (element.type === ObjectType.TABLE) {
          this.updateTable(element.id, element.undo);
        } else if (element.type === ObjectType.AREA) {
          this.updateArea(element.id, element.undo);
        } else if (element.type === ObjectType.NOTE) {
          this.updateNote(element.id, element.undo);
        }
      }
      this.redoStack.push(a);
      return;
    }

    if (a.action === Action.ADD) {
      if (a.element === ObjectType.TABLE) {
        this.deleteTable(a.data.table.id, false);
      } else if (a.element === ObjectType.AREA) {
        this.deleteArea(this.areas[this.areas.length - 1].id, false);
      } else if (a.element === ObjectType.NOTE) {
        this.deleteNote(this.notes[this.notes.length - 1].id, false);
      } else if (a.element === ObjectType.RELATIONSHIP) {
        this.deleteRelationship(a.data.relationship.id, false);
      }
      this.redoStack.push(a);
    } else if (a.action === Action.MOVE) {
      if (a.element === ObjectType.TABLE) {
        const t = this.tables.find((t) => t.id === a.id);
        this.redoStack.push({ ...a, x: t.x, y: t.y });
        this.updateTable(a.id, { x: a.x, y: a.y });
      } else if (a.element === ObjectType.AREA) {
        const ar = this.areas.find((x) => x.id === a.id);
        this.redoStack.push({ ...a, x: ar.x, y: ar.y });
        this.updateArea(a.id, { x: a.x, y: a.y });
      } else if (a.element === ObjectType.NOTE) {
        const n = this.notes.find((x) => x.id === a.id);
        this.redoStack.push({ ...a, x: n.x, y: n.y });
        this.updateNote(a.id, { x: a.x, y: a.y });
      }
    } else if (a.action === Action.DELETE) {
      if (a.element === ObjectType.TABLE) {
        a.data.relationship.forEach((r) => this.addRelationship(r, false));
        this.addTable(a.data, false);
      } else if (a.element === ObjectType.RELATIONSHIP) {
        this.addRelationship(a.data, false);
      } else if (a.element === ObjectType.NOTE) {
        this.addNote(a.data, false);
      } else if (a.element === ObjectType.AREA) {
        this.addArea(a.data, false);
      }
      this.redoStack.push(a);
    } else if (a.action === Action.EDIT) {
      if (a.element === ObjectType.AREA) {
        this.updateArea(a.aid, a.undo);
      } else if (a.element === ObjectType.NOTE) {
        this.updateNote(a.nid, a.undo);
      } else if (a.element === ObjectType.TABLE) {
        if (a.component === "field") {
          const table = this.tables.find((t) => t.id === a.tid);
          const field = table.fields.find((f) => f.id === a.fid);
          Object.assign(field, a.undo);
        } else if (a.component === "self") {
          this.updateTable(a.tid, a.undo);
        }
      }
      this.redoStack.push(a);
    }
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const a = this.redoStack.pop();

    if (a.bulk) {
      for (const element of a.elements) {
        if (element.type === ObjectType.TABLE) {
          this.updateTable(element.id, element.redo);
        } else if (element.type === ObjectType.AREA) {
          this.updateArea(element.id, element.redo);
        } else if (element.type === ObjectType.NOTE) {
          this.updateNote(element.id, element.redo);
        }
      }
      this.undoStack.push(a);
      return;
    }

    if (a.action === Action.ADD) {
      if (a.element === ObjectType.TABLE) {
        this.addTable(a.data, false);
      } else if (a.element === ObjectType.AREA) {
        this.addArea(null, false);
      } else if (a.element === ObjectType.NOTE) {
        this.addNote(null, false);
      } else if (a.element === ObjectType.RELATIONSHIP) {
        this.addRelationship(a.data, false);
      }
      this.undoStack.push(a);
    } else if (a.action === Action.MOVE) {
      if (a.element === ObjectType.TABLE) {
        const t = this.tables.find((t) => t.id === a.id);
        this.undoStack.push({ ...a, x: t.x, y: t.y });
        this.updateTable(a.id, { x: a.x, y: a.y });
      } else if (a.element === ObjectType.AREA) {
        const ar = this.areas.find((x) => x.id === a.id);
        this.undoStack.push({ ...a, x: ar.x, y: ar.y });
        this.updateArea(a.id, { x: a.x, y: a.y });
      } else if (a.element === ObjectType.NOTE) {
        const n = this.notes.find((x) => x.id === a.id);
        this.undoStack.push({ ...a, x: n.x, y: n.y });
        this.updateNote(a.id, { x: a.x, y: a.y });
      }
    } else if (a.action === Action.DELETE) {
      if (a.element === ObjectType.TABLE) {
        this.deleteTable(a.data.table.id, false);
      } else if (a.element === ObjectType.RELATIONSHIP) {
        this.deleteRelationship(a.data.relationship.id, false);
      } else if (a.element === ObjectType.NOTE) {
        this.deleteNote(a.data.id, false);
      } else if (a.element === ObjectType.AREA) {
        this.deleteArea(a.data.id, false);
      }
      this.undoStack.push(a);
    } else if (a.action === Action.EDIT) {
      if (a.element === ObjectType.AREA) {
        this.updateArea(a.aid, a.redo);
      } else if (a.element === ObjectType.NOTE) {
        this.updateNote(a.nid, a.redo);
      } else if (a.element === ObjectType.TABLE) {
        if (a.component === "field") {
          const table = this.tables.find((t) => t.id === a.tid);
          const field = table.fields.find((f) => f.id === a.fid);
          Object.assign(field, a.redo);
        } else if (a.component === "self") {
          this.updateTable(a.tid, a.redo);
        }
      }
      this.undoStack.push(a);
    }
  }
}

// =====================================================================
// Tests
// =====================================================================

describe("Undo/Redo - Stack basics", () => {
  let sim;

  beforeEach(() => {
    sim = new UndoRedoSimulator();
  });

  it("undo on empty stack should be a no-op", () => {
    sim.undo();
    expect(sim.undoStack).toHaveLength(0);
    expect(sim.redoStack).toHaveLength(0);
  });

  it("redo on empty stack should be a no-op", () => {
    sim.redo();
    expect(sim.undoStack).toHaveLength(0);
    expect(sim.redoStack).toHaveLength(0);
  });

  it("an action should push to undoStack and clear redoStack", () => {
    sim.addTable({ id: "t1", name: "users", x: 0, y: 0, fields: [] });
    expect(sim.undoStack).toHaveLength(1);
    expect(sim.redoStack).toHaveLength(0);
  });

  it("undo should transfer action from undoStack to redoStack", () => {
    sim.addTable({ id: "t1", name: "users", x: 0, y: 0, fields: [] });
    sim.undo();
    expect(sim.undoStack).toHaveLength(0);
    expect(sim.redoStack).toHaveLength(1);
  });

  it("new action after undo should clear redoStack", () => {
    sim.addTable({ id: "t1", name: "users", x: 0, y: 0, fields: [] });
    sim.undo();
    expect(sim.redoStack).toHaveLength(1);
    sim.addTable({ id: "t2", name: "posts", x: 0, y: 0, fields: [] });
    expect(sim.redoStack).toHaveLength(0);
  });
});

describe("Undo/Redo - ADD table", () => {
  let sim;

  beforeEach(() => {
    sim = new UndoRedoSimulator();
  });

  it("undo ADD should remove the table", () => {
    sim.addTable({ id: "t1", name: "users", x: 0, y: 0, fields: [] });
    expect(sim.tables).toHaveLength(1);

    sim.undo();
    expect(sim.tables).toHaveLength(0);
  });

  it("redo after undo ADD should restore the table", () => {
    sim.addTable({ id: "t1", name: "users", x: 0, y: 0, fields: [] });
    sim.undo();
    expect(sim.tables).toHaveLength(0);

    sim.redo();
    expect(sim.tables).toHaveLength(1);
    expect(sim.tables[0].name).toBe("users");
  });

  it("undo ADD should preserve other tables", () => {
    sim.addTable({ id: "t1", name: "users", x: 0, y: 0, fields: [] });
    sim.addTable({ id: "t2", name: "posts", x: 0, y: 0, fields: [] });
    expect(sim.tables).toHaveLength(2);

    sim.undo(); // undo adding "posts"
    expect(sim.tables).toHaveLength(1);
    expect(sim.tables[0].name).toBe("users");
  });
});

describe("Undo/Redo - DELETE table", () => {
  let sim;

  beforeEach(() => {
    sim = new UndoRedoSimulator();
    sim.addTable({
      id: "t1",
      name: "users",
      x: 10,
      y: 20,
      fields: [{ id: "f1", name: "id", type: "INT" }],
    });
  });

  it("undo DELETE should restore the table with its data", () => {
    sim.deleteTable("t1");
    expect(sim.tables).toHaveLength(0);

    sim.undo();
    expect(sim.tables).toHaveLength(1);
    expect(sim.tables[0].name).toBe("users");
    expect(sim.tables[0].fields).toHaveLength(1);
    expect(sim.tables[0].fields[0].name).toBe("id");
  });

  it("undo DELETE should also restore related relationships", () => {
    sim.addTable({ id: "t2", name: "posts", x: 0, y: 0, fields: [{ id: "f2", name: "user_id", type: "INT" }] });
    sim.addRelationship({
      id: "r1",
      startTableId: "t1",
      startFieldId: "f1",
      endTableId: "t2",
      endFieldId: "f2",
    });
    expect(sim.relationships).toHaveLength(1);

    sim.deleteTable("t1");
    expect(sim.tables).toHaveLength(1); // only t2 remains
    expect(sim.relationships).toHaveLength(0); // relationship deleted too

    sim.undo();
    expect(sim.tables).toHaveLength(2);
    expect(sim.relationships).toHaveLength(1);
    expect(sim.relationships[0].id).toBe("r1");
  });

  it("redo after undo DELETE should re-delete the table", () => {
    sim.deleteTable("t1");
    sim.undo();
    expect(sim.tables).toHaveLength(1);

    sim.redo();
    expect(sim.tables).toHaveLength(0);
  });
});

describe("Undo/Redo - MOVE", () => {
  let sim;

  beforeEach(() => {
    sim = new UndoRedoSimulator();
    sim.addTable({ id: "t1", name: "users", x: 10, y: 20, fields: [] });
  });

  it("undo MOVE should restore original position", () => {
    sim.recordMove("t1", ObjectType.TABLE, 10, 20, 100, 200);
    expect(sim.tables[0].x).toBe(100);
    expect(sim.tables[0].y).toBe(200);

    sim.undo();
    expect(sim.tables[0].x).toBe(10);
    expect(sim.tables[0].y).toBe(20);
  });

  it("redo MOVE should restore moved position", () => {
    sim.recordMove("t1", ObjectType.TABLE, 10, 20, 100, 200);
    sim.undo();
    expect(sim.tables[0].x).toBe(10);

    sim.redo();
    expect(sim.tables[0].x).toBe(100);
    expect(sim.tables[0].y).toBe(200);
  });

  it("multiple undo/redo moves should maintain correct positions", () => {
    sim.recordMove("t1", ObjectType.TABLE, 10, 20, 50, 60);
    sim.recordMove("t1", ObjectType.TABLE, 50, 60, 100, 120);
    expect(sim.tables[0].x).toBe(100);

    sim.undo(); // back to 50,60
    expect(sim.tables[0].x).toBe(50);
    expect(sim.tables[0].y).toBe(60);

    sim.undo(); // back to 10,20
    expect(sim.tables[0].x).toBe(10);
    expect(sim.tables[0].y).toBe(20);

    sim.redo(); // forward to 50,60
    expect(sim.tables[0].x).toBe(50);
    expect(sim.tables[0].y).toBe(60);
  });
});

describe("Undo/Redo - Bulk MOVE", () => {
  let sim;

  beforeEach(() => {
    sim = new UndoRedoSimulator();
    sim.addTable({ id: "t1", name: "users", x: 10, y: 20, fields: [] });
    sim.addTable({ id: "t2", name: "posts", x: 30, y: 40, fields: [] });
  });

  it("undo bulk MOVE should restore all elements to original positions", () => {
    sim.recordBulkMove([
      { id: "t1", type: ObjectType.TABLE, oldX: 10, oldY: 20, newX: 100, newY: 200 },
      { id: "t2", type: ObjectType.TABLE, oldX: 30, oldY: 40, newX: 300, newY: 400 },
    ]);

    expect(sim.tables[0].x).toBe(100);
    expect(sim.tables[1].x).toBe(300);

    sim.undo();
    expect(sim.tables[0].x).toBe(10);
    expect(sim.tables[0].y).toBe(20);
    expect(sim.tables[1].x).toBe(30);
    expect(sim.tables[1].y).toBe(40);
  });

  it("redo bulk MOVE should re-apply all moves", () => {
    sim.recordBulkMove([
      { id: "t1", type: ObjectType.TABLE, oldX: 10, oldY: 20, newX: 100, newY: 200 },
      { id: "t2", type: ObjectType.TABLE, oldX: 30, oldY: 40, newX: 300, newY: 400 },
    ]);
    sim.undo();
    sim.redo();

    expect(sim.tables[0].x).toBe(100);
    expect(sim.tables[0].y).toBe(200);
    expect(sim.tables[1].x).toBe(300);
    expect(sim.tables[1].y).toBe(400);
  });
});

describe("Undo/Redo - EDIT", () => {
  let sim;

  beforeEach(() => {
    sim = new UndoRedoSimulator();
    sim.addTable({
      id: "t1",
      name: "users",
      x: 0,
      y: 0,
      fields: [
        { id: "f1", name: "id", type: "INT", notNull: false },
        { id: "f2", name: "email", type: "VARCHAR", notNull: false },
      ],
    });
  });

  it("undo field EDIT should restore old field value", () => {
    sim.recordEditTableField("t1", "f1", { name: "id" }, { name: "user_id" });
    expect(sim.tables[0].fields[0].name).toBe("user_id");

    sim.undo();
    expect(sim.tables[0].fields[0].name).toBe("id");
  });

  it("redo field EDIT should re-apply the edit", () => {
    sim.recordEditTableField("t1", "f1", { name: "id" }, { name: "user_id" });
    sim.undo();
    sim.redo();
    expect(sim.tables[0].fields[0].name).toBe("user_id");
  });

  it("undo table self EDIT should restore old table properties", () => {
    sim.recordEditTableSelf("t1", { name: "users" }, { name: "accounts" });
    expect(sim.tables[0].name).toBe("accounts");

    sim.undo();
    expect(sim.tables[0].name).toBe("users");
  });

  it("redo table self EDIT should re-apply table rename", () => {
    sim.recordEditTableSelf("t1", { name: "users" }, { name: "accounts" });
    sim.undo();
    sim.redo();
    expect(sim.tables[0].name).toBe("accounts");
  });

  it("editing a field should not affect other fields", () => {
    sim.recordEditTableField(
      "t1",
      "f1",
      { notNull: false },
      { notNull: true },
    );
    expect(sim.tables[0].fields[0].notNull).toBe(true);
    expect(sim.tables[0].fields[1].notNull).toBe(false);

    sim.undo();
    expect(sim.tables[0].fields[0].notNull).toBe(false);
    expect(sim.tables[0].fields[1].notNull).toBe(false);
  });
});

describe("Undo/Redo - EDIT area", () => {
  let sim;

  beforeEach(() => {
    sim = new UndoRedoSimulator();
    sim.addArea({ id: "a1", name: "Zone A", x: 0, y: 0, width: 200, height: 200 });
  });

  it("undo area EDIT should restore old name", () => {
    sim.recordEditArea("a1", { name: "Zone A" }, { name: "Zone B" });
    expect(sim.areas[0].name).toBe("Zone B");

    sim.undo();
    expect(sim.areas[0].name).toBe("Zone A");
  });

  it("redo area EDIT should re-apply the name change", () => {
    sim.recordEditArea("a1", { name: "Zone A" }, { name: "Zone B" });
    sim.undo();
    sim.redo();
    expect(sim.areas[0].name).toBe("Zone B");
  });
});

describe("Undo/Redo - Data integrity across multiple operations", () => {
  let sim;

  beforeEach(() => {
    sim = new UndoRedoSimulator();
  });

  it("full cycle: add → edit → move → undo all → redo all", () => {
    // Step 1: Add table
    sim.addTable({
      id: "t1",
      name: "users",
      x: 0,
      y: 0,
      fields: [{ id: "f1", name: "id", type: "INT" }],
    });
    expect(sim.tables).toHaveLength(1);

    // Step 2: Edit table name
    sim.recordEditTableSelf("t1", { name: "users" }, { name: "accounts" });
    expect(sim.tables[0].name).toBe("accounts");

    // Step 3: Move table
    sim.recordMove("t1", ObjectType.TABLE, 0, 0, 50, 50);
    expect(sim.tables[0].x).toBe(50);

    expect(sim.undoStack).toHaveLength(3);

    // Undo all 3 steps
    sim.undo(); // undo move
    expect(sim.tables[0].x).toBe(0);
    expect(sim.tables[0].name).toBe("accounts");

    sim.undo(); // undo edit
    expect(sim.tables[0].name).toBe("users");

    sim.undo(); // undo add
    expect(sim.tables).toHaveLength(0);
    expect(sim.undoStack).toHaveLength(0);
    expect(sim.redoStack).toHaveLength(3);

    // Redo all 3 steps
    sim.redo(); // redo add
    expect(sim.tables).toHaveLength(1);
    expect(sim.tables[0].name).toBe("users");

    sim.redo(); // redo edit
    expect(sim.tables[0].name).toBe("accounts");

    sim.redo(); // redo move
    expect(sim.tables[0].x).toBe(50);

    expect(sim.undoStack).toHaveLength(3);
    expect(sim.redoStack).toHaveLength(0);
  });

  it("interleaving operations on multiple element types", () => {
    sim.addTable({ id: "t1", name: "users", x: 0, y: 0, fields: [] });
    sim.addNote({ id: "n1", title: "Note 1", content: "Hello", x: 0, y: 0 });
    sim.addArea({ id: "a1", name: "Area 1", x: 0, y: 0, width: 200, height: 200 });

    expect(sim.tables).toHaveLength(1);
    expect(sim.notes).toHaveLength(1);
    expect(sim.areas).toHaveLength(1);

    // Undo area add
    sim.undo();
    expect(sim.areas).toHaveLength(0);
    expect(sim.notes).toHaveLength(1);
    expect(sim.tables).toHaveLength(1);

    // Undo note add
    sim.undo();
    expect(sim.notes).toHaveLength(0);
    expect(sim.tables).toHaveLength(1);

    // Redo note
    sim.redo();
    expect(sim.notes).toHaveLength(1);

    // Redo area
    sim.redo();
    expect(sim.areas).toHaveLength(1);
  });

  it("deep undo/redo cycle should not corrupt data", () => {
    // Add 5 tables
    for (let i = 0; i < 5; i++) {
      sim.addTable({
        id: `t${i}`,
        name: `table_${i}`,
        x: i * 10,
        y: i * 20,
        fields: [{ id: `f${i}`, name: `col_${i}`, type: "INT" }],
      });
    }
    expect(sim.tables).toHaveLength(5);
    expect(sim.undoStack).toHaveLength(5);

    // Undo all 5
    for (let i = 0; i < 5; i++) {
      sim.undo();
    }
    expect(sim.tables).toHaveLength(0);
    expect(sim.undoStack).toHaveLength(0);
    expect(sim.redoStack).toHaveLength(5);

    // Redo all 5
    for (let i = 0; i < 5; i++) {
      sim.redo();
    }
    expect(sim.tables).toHaveLength(5);
    expect(sim.undoStack).toHaveLength(5);
    expect(sim.redoStack).toHaveLength(0);

    // Verify data integrity: each table has correct name and fields
    for (let i = 0; i < 5; i++) {
      const t = sim.tables.find((t) => t.id === `t${i}`);
      expect(t).toBeDefined();
      expect(t.name).toBe(`table_${i}`);
      expect(t.fields[0].name).toBe(`col_${i}`);
    }
  });

  it("undo after branching (new action after undo) should discard redo history", () => {
    sim.addTable({ id: "t1", name: "users", x: 0, y: 0, fields: [] });
    sim.addTable({ id: "t2", name: "posts", x: 0, y: 0, fields: [] });
    sim.addTable({ id: "t3", name: "comments", x: 0, y: 0, fields: [] });

    sim.undo(); // remove comments
    sim.undo(); // remove posts
    expect(sim.redoStack).toHaveLength(2);

    // New action — should discard redo stack
    sim.addTable({ id: "t4", name: "tags", x: 0, y: 0, fields: [] });
    expect(sim.redoStack).toHaveLength(0);
    expect(sim.tables).toHaveLength(2);
    expect(sim.tables[0].name).toBe("users");
    expect(sim.tables[1].name).toBe("tags");

    // Can no longer redo posts or comments
    sim.redo();
    expect(sim.tables).toHaveLength(2); // no change
  });
});

describe("Undo/Redo - Relationship lifecycle", () => {
  let sim;

  beforeEach(() => {
    sim = new UndoRedoSimulator();
    sim.addTable({ id: "t1", name: "users", x: 0, y: 0, fields: [{ id: "f1", name: "id" }] });
    sim.addTable({ id: "t2", name: "orders", x: 0, y: 0, fields: [{ id: "f2", name: "user_id" }] });
  });

  it("undo ADD relationship should remove it", () => {
    sim.addRelationship({
      id: "r1",
      startTableId: "t1",
      startFieldId: "f1",
      endTableId: "t2",
      endFieldId: "f2",
    });
    expect(sim.relationships).toHaveLength(1);

    sim.undo();
    expect(sim.relationships).toHaveLength(0);
  });

  it("redo ADD relationship should restore it", () => {
    sim.addRelationship({
      id: "r1",
      startTableId: "t1",
      startFieldId: "f1",
      endTableId: "t2",
      endFieldId: "f2",
    });
    sim.undo();
    sim.redo();
    expect(sim.relationships).toHaveLength(1);
    expect(sim.relationships[0].id).toBe("r1");
  });
});
