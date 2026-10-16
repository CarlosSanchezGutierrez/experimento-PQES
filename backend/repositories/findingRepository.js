const findings = [];

const getAll = () => findings.map((item) => ({ ...item, createdBy: { ...item.createdBy } }));
const create = (data) => {
  const next = findings.reduce((max, item) => Math.max(max, Number(item.id.slice(4)) || 0), 0) + 1;
  const finding = { ...data, id: `FDG-${String(next).padStart(3, "0")}`, status: "OPEN", createdAt: new Date().toISOString() };
  findings.unshift(finding);
  return { ...finding, createdBy: { ...finding.createdBy } };
};

module.exports = process.env.VERA_RISK_CONTROL_STORE === "supabase"
  ? require("./supabaseFindingRepository")
  : { getAll, create };
