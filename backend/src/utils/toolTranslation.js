const TOOL_TRANSLATIONS = [
  { pattern: /shell|terminal|bash|command/i, title: "Operational research", message: "Gathering and validating live operating data." },
  { pattern: /browser|navigate|click|scrape|linkedin|search/i, title: "Market scan", message: "Reviewing external web sources for business signals." },
  { pattern: /spreadsheet|sheet|csv|excel/i, title: "Data review", message: "Inspecting business data and reconciling metrics." },
  { pattern: /database|mongo|sql|query/i, title: "Database analysis", message: "Reading internal records and comparing historical performance." },
  { pattern: /file|document|pdf|report/i, title: "Document review", message: "Reviewing supporting documents and extracting decision points." },
];

export function translateToolEvent(payload = {}) {
  const raw = JSON.stringify(payload);
  const matched = TOOL_TRANSLATIONS.find((entry) => entry.pattern.test(raw));

  if (matched) {
    return matched;
  }

  return {
    title: "Specialist workflow",
    message: "Using connected tools to gather and validate business context.",
  };
}

