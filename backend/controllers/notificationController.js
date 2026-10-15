const planningRepository = require("../repositories/planningRepository");
const { buildNotifications } = require("../services/notificationService");

const listNotifications = async (req, res) => {
  const notifications = buildNotifications({ proposals: await planningRepository.getAll(), user: req.user });
  res.json({ notifications, generatedAt: new Date().toISOString(), persisted: false });
};

module.exports = { listNotifications };
