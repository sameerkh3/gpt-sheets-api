import { z } from "zod";
import { requireApiKey } from "./_auth.js";
import { getSheetsClient } from "./_sheets.js";

const QuerySchema = z.object({
  // Fetch all rows in pages:
  offset: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),

  // Optional: keep old behavior (latest N rows) if you still want it sometimes
  limit: z
    .union([z.literal("all"), z.coerce.number().int().min(1).max(10000)])
    .optional(),
});

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  const authCheck = requireApiKey(req);
  if (!authCheck.ok) return res.status(authCheck.status).json(authCheck.body);

  const parsed = QuerySchema.safeParse(req.query);
  const { offset, pageSize, limit } = parsed.success
    ? parsed.data
    : { offset: 0, pageSize: 100, limit: undefined };

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const sheetName = process.env.SHEET_NAME || "Sheet1";

  const read = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  const rows = read.data.values || [];
  const totalRows = rows.length;

  // Mode A: latest N rows (backwards compatible)
  if (typeof limit === "number") {
    const latest = rows.slice(-limit);
    return res.status(200).json({
      ok: true,
      mode: "latest",
      rows: latest,
      totalRows,
    });
  }

  // Mode B: paginated "all rows"
  const slice = rows.slice(offset, offset + pageSize);
  const nextOffset = offset + pageSize < totalRows ? offset + pageSize : null;

  return res.status(200).json({
    ok: true,
    mode: "paged",
    rows: slice,
    totalRows,
    offset,
    pageSize,
    nextOffset,
    hasMore: nextOffset !== null,
  });
}
