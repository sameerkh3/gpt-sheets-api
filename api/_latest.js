import { z } from "zod";
import { requireApiKey } from "./_auth.js";
import { getSheetsClient } from "./_sheets.js";

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
});

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  const authCheck = requireApiKey(req);
  if (!authCheck.ok) return res.status(authCheck.status).json(authCheck.body);

  let limit = 10;
  try {
    limit = QuerySchema.parse(req.query).limit;
  } catch {
    // ignore and use default
  }

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const sheetName = process.env.SHEET_NAME;

  // Fetch a wide range; trim on server
  const read = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  const rows = read.data.values || [];
  const latest = rows.slice(-limit);

  return res.status(200).json({ ok: true, rows: latest, totalRows: rows.length });
}
