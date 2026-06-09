import {
  tableColorStripHeight,
  tableFieldHeight,
  tableHeaderHeight,
} from "../../data/constants";

const FIELD_BORDER_WIDTH = 1;
const COMMENT_LINE_HEIGHT = 16;
const COMMENT_PADDING_BOTTOM = 12;
const TABLE_COMMENT_MAX_LINES = 5;
const FIELD_COMMENT_MAX_LINES = 2;
const TABLE_COMMENT_INSET = 28;
const FIELD_COMMENT_INSET = 40;
const AVG_CHAR_WIDTH = 7;

function estimateCommentHeight(comment, containerWidth, inset, maxLines) {
  if (!comment) return 0;

  const contentWidth = containerWidth - inset;
  if (contentWidth <= 0) return COMMENT_LINE_HEIGHT + COMMENT_PADDING_BOTTOM;

  const paragraphs = comment.split("\n");
  let lines = 0;

  for (const paragraph of paragraphs) {
    if (lines >= maxLines) break;
    if (!paragraph) {
      lines++;
      continue;
    }
    const lineWidth = paragraph.length * AVG_CHAR_WIDTH;
    lines += Math.max(1, Math.ceil(lineWidth / contentWidth));
    if (lines > maxLines) {
      lines = maxLines;
    }
  }

  lines = Math.max(1, Math.min(maxLines, lines));
  return lines * COMMENT_LINE_HEIGHT + COMMENT_PADDING_BOTTOM;
}

/**
 * Estimates table height without DOM access.
 * Uses a character-width heuristic for comment height instead of canvas measurement.
 *
 * @param {Object} table - Table object with .fields array and optional .comment
 * @param {number} [tableWidth=220] - Width of the table
 * @returns {number} Estimated height in pixels
 */
export function estimateTableHeight(table, tableWidth = 220) {
  let fieldsHeight = 0;
  const fields = table.fields ?? [];

  for (const field of fields) {
    fieldsHeight +=
      tableFieldHeight +
      FIELD_BORDER_WIDTH +
      estimateCommentHeight(
        field?.comment,
        tableWidth,
        FIELD_COMMENT_INSET,
        FIELD_COMMENT_MAX_LINES,
      );
  }

  const tableCommentHeight = estimateCommentHeight(
    table.comment,
    tableWidth,
    TABLE_COMMENT_INSET,
    TABLE_COMMENT_MAX_LINES,
  );

  return (
    tableColorStripHeight + tableHeaderHeight + fieldsHeight + tableCommentHeight
  );
}
