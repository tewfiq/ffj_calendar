// Minimal, zero-dependency CSV parser tolerant to quoted fields and commas.
// Good enough for V1 import flow. Assumes a single header row.

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
}

export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^\uFEFF/, "") // strip BOM
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === ",") {
      row.push(field)
      field = ""
      i++
      continue
    }
    if (ch === "\n" || ch === "\r") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
      if (ch === "\r" && text[i + 1] === "\n") i++
      i++
      continue
    }
    field += ch
    i++
  }
  // Flush last field / row.
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  // Drop trailing fully-empty rows.
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c.trim() === "")) rows.pop()

  const headers = (rows.shift() ?? []).map((h) => h.trim())
  return { headers, rows }
}

// Heuristic: guess which source column maps to each canonical target field.
export function guessMapping(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  const lower = headers.map((h) => h.toLowerCase().trim())

  const matchers: Record<string, RegExp[]> = {
    title: [/^title$/i, /^subject$/i, /^summary$/i, /^name$/i, /^nom$/i, /^titre$/i, /^sujet$/i, /^objet$/i],
    start_at: [/^start/i, /^begin/i, /^d[ée]but/i, /^from$/i, /^debut/i],
    end_at: [/^end/i, /^finish/i, /^fin$/i, /^to$/i],
    all_day: [/all.?day/i, /^journ[ée]e/i, /^toute.?la.?journ/i],
    location: [/^location$/i, /^lieu$/i, /^place$/i, /^endroit$/i, /^salle$/i],
    description: [/^desc/i, /^notes?$/i, /^details?$/i],
    priority: [/^priority$/i, /^priorit[ée]$/i, /^importance$/i],
    movable: [/^movable$/i, /^flexible$/i, /^d[ée]pla/i],
    category: [/^category$/i, /^cat[ée]gorie$/i, /^tag$/i, /^type$/i],
    timezone: [/time.?zone/i, /^tz$/i, /^fuseau/i],
  }

  for (const [target, regs] of Object.entries(matchers)) {
    const idx = lower.findIndex((h) => regs.some((r) => r.test(h)))
    if (idx >= 0) map[target] = headers[idx]
  }
  return map
}

// Parse a wide range of date strings into ISO. Returns null on failure.
export function parseDateLoose(raw: string, assumeTimezone = "Europe/Paris"): string | null {
  const s = raw.trim()
  if (!s) return null

  // Native: ISO 8601, RFC 2822, etc.
  const direct = new Date(s)
  if (!Number.isNaN(direct.getTime())) return direct.toISOString()

  // dd/mm/yyyy [hh:mm[:ss]]
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (fr) {
    const [, d, m, y, hh = "0", mm = "0", ss = "0"] = fr
    const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:${ss.padStart(2, "0")}`
    const dt = new Date(iso)
    if (!Number.isNaN(dt.getTime())) return dt.toISOString()
  }
  // yyyy-mm-dd hh:mm
  const us = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (us) {
    const [, y, m, d, hh = "0", mm = "0", ss = "0"] = us
    const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:${ss.padStart(2, "0")}`
    const dt = new Date(iso)
    if (!Number.isNaN(dt.getTime())) return dt.toISOString()
  }
  return null
}

export function parseBoolLoose(raw: string): boolean {
  const v = raw.trim().toLowerCase()
  return ["true", "1", "yes", "y", "oui", "vrai"].includes(v)
}
