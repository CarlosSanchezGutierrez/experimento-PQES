const planningRepository = require("../repositories/planningRepository");
const { getDashboardForUser } = require("../services/dashboardService");

const getDashboard = async (req, res) => {
  res.json(getDashboardForUser(req.user, await planningRepository.getAll()));
};

module.exports = { getDashboard };
