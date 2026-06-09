import { useCallback, useRef } from "react";
import { ObjectType, Tab, noteWidth } from "../data/constants";
import { useTransform, useSelect, useDiagram, useAreas, useNotes, useSettings } from "./index";
import { getTableHeight } from "../utils/utils";

export default function useNavigateToElement() {
  const { transform, setTransform } = useTransform();
  const { setSelectedElement, setHighlightedElement } = useSelect();
  const { tables, relationships } = useDiagram();
  const { areas } = useAreas();
  const { notes } = useNotes();
  const { settings } = useSettings();
  const animFrameRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const navigateTo = useCallback(
    ({ type, id, fieldId = null }) => {
      let targetX, targetY, elementWidth, elementHeight;

      if (type === ObjectType.TABLE) {
        const table = tables.find((t) => t.id === id);
        if (!table) return;
        elementWidth = settings.tableWidth;
        elementHeight = getTableHeight(
          table,
          settings.tableWidth,
          settings.showComments,
          relationships,
        );
        targetX = table.x + elementWidth / 2;
        targetY = table.y + elementHeight / 2;
      } else if (type === ObjectType.AREA) {
        const area = areas.find((a) => a.id === id);
        if (!area) return;
        elementWidth = area.width;
        elementHeight = area.height;
        targetX = area.x + elementWidth / 2;
        targetY = area.y + elementHeight / 2;
      } else if (type === ObjectType.NOTE) {
        const note = notes.find((n) => n.id === id);
        if (!note) return;
        elementWidth = note.width ?? noteWidth;
        elementHeight = note.height ?? 88;
        targetX = note.x + elementWidth / 2;
        targetY = note.y + elementHeight / 2;
      } else {
        return;
      }

      // Compute target zoom: element should be ~40% of viewport width
      const sw = window.innerWidth;
      let targetZoom = sw / (elementWidth * 2.5);
      targetZoom = Math.max(0.5, Math.min(2.0, targetZoom));

      const targetTransform = {
        zoom: targetZoom,
        pan: { x: targetX, y: targetY },
      };

      // Cancel any in-progress animation
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      // Clear any existing highlight timer
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }

      const startTransform = { ...transformRef.current };
      const startTime = performance.now();
      const duration = 400;

      const lerp = (a, b, t) => a + (b - a) * t;
      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        setTransform({
          zoom: lerp(startTransform.zoom, targetTransform.zoom, eased),
          pan: {
            x: lerp(startTransform.pan.x, targetTransform.pan.x, eased),
            y: lerp(startTransform.pan.y, targetTransform.pan.y, eased),
          },
        });

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          animFrameRef.current = null;

          // Select the element
          setSelectedElement({
            element: type,
            id: id,
            openDialogue: false,
            openCollapse: false,
            currentTab:
              type === ObjectType.TABLE
                ? Tab.TABLES
                : type === ObjectType.AREA
                  ? Tab.AREAS
                  : Tab.NOTES,
            open: false,
            openFromToolbar: false,
          });

          // Highlight the element
          setHighlightedElement({
            element: type,
            id: id,
            fieldId: fieldId,
          });

          // Clear highlight after 1.5s
          highlightTimerRef.current = setTimeout(() => {
            setHighlightedElement({
              element: ObjectType.NONE,
              id: -1,
              fieldId: null,
            });
            highlightTimerRef.current = null;
          }, 1500);
        }
      };

      animFrameRef.current = requestAnimationFrame(step);
    },
    [
      tables,
      areas,
      notes,
      relationships,
      settings.tableWidth,
      settings.showComments,
      setTransform,
      setSelectedElement,
      setHighlightedElement,
    ],
  );

  return navigateTo;
}
