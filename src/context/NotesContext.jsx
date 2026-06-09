import { createContext, useState, useCallback } from "react";
import {
  Action,
  ObjectType,
  defaultNoteTheme,
  noteWidth,
} from "../data/constants";
import { useUndoRedo, useTransform, useSelect, useCollab } from "../hooks";
import { Toast } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";

export const NotesContext = createContext(null);

export default function NotesContextProvider({ children }) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState([]);
  const { transform } = useTransform();
  const { setUndoStack, setRedoStack } = useUndoRedo();
  const { selectedElement, setSelectedElement } = useSelect();
  const { emitDelta, isApplyingRemoteRef } = useCollab();
  const shouldEmit = () => !isApplyingRemoteRef?.current;

  const addNote = (data, addToHistory = true) => {
    const id = nanoid();
    const height = 88;
    const newNote = {
      id,
      x: transform.pan.x,
      y: transform.pan.y - height / 2,
      title: `note_${id}`,
      content: "",
      locked: false,
      color: defaultNoteTheme,
      height,
      width: noteWidth,
    };
    if (data) {
      setNotes((prev) => {
        const temp = prev.slice();
        temp.splice(data.index ?? prev.length, 0, data.note);
        return temp;
      });
    } else {
      setNotes((prev) => [...prev, newNote]);
    }
    if (addToHistory) {
      setUndoStack((prev) => [
        ...prev,
        {
          data: data || { note: newNote, index: notes.length },
          action: Action.ADD,
          element: ObjectType.NOTE,
          message: t("add_note"),
        },
      ]);
      setRedoStack([]);
    }
    if (shouldEmit()) {
      const created = data?.note ?? newNote;
      emitDelta({
        target: "note",
        action: "create",
        entityId: created.id,
        data: [created],
      });
    }
  };

  const deleteNote = (id, addToHistory = true) => {
    if (addToHistory) {
      const deletedNote = notes.find((n) => n.id === id);
      const deletedNoteIndex = notes.findIndex((n) => n.id === id);
      Toast.success(t("note_deleted"));
      setUndoStack((prev) => [
        ...prev,
        {
          action: Action.DELETE,
          element: ObjectType.NOTE,
          data: { note: deletedNote, index: deletedNoteIndex },
          message: t("delete_note", { noteTitle: deletedNote.title }),
        },
      ]);
      setRedoStack([]);
    }
    setNotes((prev) => prev.filter((e) => e.id !== id));
    if (id === selectedElement.id) {
      setSelectedElement((prev) => ({
        ...prev,
        element: ObjectType.NONE,
        id: -1,
        open: false,
      }));
    }
    if (shouldEmit()) {
      emitDelta({
        target: "note",
        action: "delete",
        entityId: id,
        data: [id],
      });
    }
  };

  const updateNote = useCallback(
    (id, values) => {
      setNotes((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            return {
              ...t,
              ...values,
            };
          }
          return t;
        }),
      );
      if (shouldEmit()) {
        emitDelta({
          target: "note",
          action: "update",
          entityId: id,
          data: [id, values],
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [emitDelta],
  );

  return (
    <NotesContext.Provider
      value={{
        notes,
        setNotes,
        updateNote,
        addNote,
        deleteNote,
        notesCount: notes.length,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}
