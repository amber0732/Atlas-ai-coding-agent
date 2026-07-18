const COMPLEX_MARKERS = [
  /race condition/i,
  /deadlock/i,
  /intermittent/i,
  /concurren/i,
  /distributed/i,
  /payment/i,
  /authentication|authorization|access control/i,
  /migration/i,
  /data loss/i,
  /production outage/i,
  /multiple services/i
];

const TRIVIAL_MARKERS = [
  /missing import/i,
  /cannot find name/i,
  /is not defined/i,
  /syntax error/i,
  /typo/i,
  /misspelled/i,
  /null check/i
];

export function triage(bugReport) {
  const text = String(bugReport || "").trim();
  if (!text) {
    throw new Error("A bug report is required for triage.");
  }

  const complexReasons = COMPLEX_MARKERS.filter((marker) => marker.test(text)).map(String);
  const trivialReasons = TRIVIAL_MARKERS.filter((marker) => marker.test(text)).map(String);
  const level = complexReasons.length
    ? "complex"
    : trivialReasons.length && text.length < 700
      ? "trivial"
      : "standard";

  return {
    level,
    specialistCount: level === "trivial" ? 1 : level === "standard" ? 2 : 3,
    reasons: level === "complex" ? complexReasons : trivialReasons,
    route: level === "trivial" ? "fast_path" : "full_pipeline"
  };
}
