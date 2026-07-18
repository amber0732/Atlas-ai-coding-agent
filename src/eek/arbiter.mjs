export function arbitrate(validations) {
  const verified = validations.filter((item) => item.verified && !item.candidate?.error);
  if (!verified.length) return null;

  const ranked = [...verified].sort((left, right) => candidateCost(left.candidate) - candidateCost(right.candidate));
  const selected = ranked[0];
  return {
    selected,
    verifiedCount: verified.length,
    rationale: `Selected specialist ${selected.candidate.specialist || "candidate"} because it has the smallest validated change (${selected.candidate.edits.length} edit${selected.candidate.edits.length === 1 ? "" : "s"}) among the passing candidates.`
  };
}

function candidateCost(candidate) {
  return candidate.edits.reduce((total, edit) => total + edit.path.length + edit.after.length, 0);
}
