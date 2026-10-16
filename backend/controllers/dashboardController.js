const planningRepository = require("../repositories/planningRepository");
const findingRepository = require("../repositories/findingRepository");
const riskRepository = require("../repositories/riskRepository");
const { getDashboardForUser } = require("../services/dashboardService");

const getDashboard = async (req, res) => {
  const [proposals, findings] = await Promise.all([planningRepository.getAll(), findingRepository.getAll()]);
  let visibleFindings = findings;
  if (req.user.role === "AUDITOR") {
    const ownedRiskIds = new Set((await riskRepository.getAll())
      .filter((risk) => risk.ownerId === req.user.id).map((risk) => risk.id));
    visibleFindings = findings.filter((finding) => ownedRiskIds.has(finding.riskId));
  }
  res.json(getDashboardForUser(req.user, proposals, visibleFindings));
};

module.exports = { getDashboard };
