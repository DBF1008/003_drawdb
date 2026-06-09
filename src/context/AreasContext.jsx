import { Toast } from "@douyinfe/semi-ui";
import { createContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { Action, ObjectType, defaultBlue } from "../data/constants";
import { useSelect, useTransform, useUndoRedo, useCollab } from "../hooks";
import { nanoid } from "nanoid";

export const AreasContext = createContext(null);

export default function AreasContextProvider({ children }) {
  const { t } = useTranslation();
  const [areas, setAreas] = useState([]);
  const { transform } = useTransform();
  const { selectedElement, setSelectedElement } = useSelect();
  const { setUndoStack, setRedoStack } = useUndoRedo();
  const { emitDelta, isApplyingRemoteRef } = useCollab();
  const shouldEmit = () => !isApplyingRemoteRef?.current;

  const addArea = (data, addToHistory = true) => {
    const id = nanoid();
    const width = 200;
    const height = 200;
    const newArea = {
      id,
      name: `area_${id}`,
      x: transform.pan.x - width / 2,
      y: transform.pan.y - height / 2,
      width,
      height,
      color: defaultBlue,
      locked: false,
    };
    if (data) {
      setAreas((prev) => {
        const temp = prev.slice();
        temp.splice(data.index ?? prev.length, 0, data.area);
        return temp;
      });
    } else {
      setAreas((prev) => [...prev, newArea]);
    }
    if (addToHistory) {
      setUndoStack((prev) => [
        ...prev,
        {
          data: data || { area: newArea, index: areas.length },
          action: Action.ADD,
          element: ObjectType.AREA,
          message: t("add_area"),
        },
      ]);
      setRedoStack([]);
    }
    if (shouldEmit()) {
      const created = data?.area ?? newArea;
      emitDelta({
        target: "area",
        action: "create",
        entityId: created.id,
        data: [created],
      });
    }
  };

  const deleteArea = (id, addToHistory = true) => {
    if (addToHistory) {
      const deletedArea = areas.find((a) => a.id === id);
      const deletedAreaIndex = areas.findIndex((a) => a.id === id);
      Toast.success(t("area_deleted"));
      setUndoStack((prev) => [
        ...prev,
        {
          action: Action.DELETE,
          element: ObjectType.AREA,
          data: { area: deletedArea, index: deletedAreaIndex },
          message: t("delete_area", { areaName: deletedArea.name }),
        },
      ]);
      setRedoStack([]);
    }
    setAreas((prev) => prev.filter((e) => e.id !== id));
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
        target: "area",
        action: "delete",
        entityId: id,
        data: [id],
      });
    }
  };

  const updateArea = (id, values) => {
    setAreas((prev) =>
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
        target: "area",
        action: "update",
        entityId: id,
        data: [id, values],
      });
    }
  };

  return (
    <AreasContext.Provider
      value={{
        areas,
        setAreas,
        updateArea,
        addArea,
        deleteArea,
        areasCount: areas.length,
      }}
    >
      {children}
    </AreasContext.Provider>
  );
}
