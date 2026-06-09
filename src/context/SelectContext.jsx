import { createContext, useState } from "react";
import { ObjectType, Tab } from "../data/constants";

export const SelectContext = createContext(null);

export default function SelectContextProvider({ children }) {
  const [selectedElement, setSelectedElement] = useState({
    element: ObjectType.NONE,
    id: -1,
    openDialogue: false,
    openCollapse: false,
    currentTab: Tab.TABLES,
    open: false, // open popover or sidesheet when sidebar is disabled
    openFromToolbar: false, // this is to handle triggering onClickOutside when sidebar is disabled
  });
  const [bulkSelectedElements, setBulkSelectedElements] = useState([]);
  const [highlightedElement, setHighlightedElement] = useState({
    element: ObjectType.NONE,
    id: -1,
    fieldId: null,
  });

  return (
    <SelectContext.Provider
      value={{
        selectedElement,
        setSelectedElement,
        bulkSelectedElements,
        setBulkSelectedElements,
        highlightedElement,
        setHighlightedElement,
      }}
    >
      {children}
    </SelectContext.Provider>
  );
}
