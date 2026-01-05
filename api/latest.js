import { z } from "zod";
import { requireApiKey } from "./_auth.js";
import { getSheetsClient } from "./_sheets.js";

const QuerySchema = z.object({
  // Allow either a number or the string "all"
  limit: z
    .union([z.literal("all"), z.coerce.number().int().min(1).max(10000)])
    .optional()
    .default("all"),
});

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  const authCheck = requireApiKey(req);
  if (!authCheck.ok) return res.status(authCheck.status).json(authCheck.body);

  // Parse limit
  const parsed = QuerySchema.safeParse(req.query);
  const limitParam = parsed.success ? parsed.data.limit : "all";

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const sheetName = process.env.SHEET_NAME || "Sheet1";

  const read = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  const rows = read.data.values || [];

  // If limit=all -> return all rows, else last N rows
  const resultRows =
    limitParam === "all" ? rows : rows.slice(-Number(limitParam));

  return res
    .status(200)
    .json({ ok: true, rows: resultRows, totalRows: rows.length });
}
