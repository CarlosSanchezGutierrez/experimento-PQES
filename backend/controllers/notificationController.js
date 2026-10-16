const planningRepository = require("../repositories/planningRepository");
const { buildNotifications } = require("../services/notificationService");
const readRepository = require("../repositories/notificationReadRepository");
const { logActivity } = require("../services/auditLogger");

const visibleNotifications = async (user) => buildNotifications({ proposals: await planningRepository.getAll(), user });

const listNotifications = async (req, res) => {
  const reads = new Map((await readRepository.getForUser(req.user.id)).map((item) => [item.notificationId, item.readAt]));
  const notifications = (await visibleNotifications(req.user)).map((item) => ({ ...item, readAt: reads.get(item.id) || null }));
  res.json({ notifications, generatedAt: new Date().toISOString(), persisted: process.env.VERA_NOTIFICATION_STORE === "supabase" });
};

const changeReadState = async (req, res, read) => {
  const notification = (await visibleNotifications(req.user)).find((item) => item.id === req.params.id);
  if (!notification) return res.status(404).json({ message: "Pendiente no encontrado." });
  let readAt = null;
  if (read) readAt = await readRepository.markRead(req.user.id, notification.id);
  else await readRepository.markUnread(req.user.id, notification.id);
  await logActivity({ actor: req.user, action: read ? "NOTIFICATION_READ" : "NOTIFICATION_UNREAD", details: {
    notificationId: notification.id, proposalId: notification.entityId
  } });
  res.json({ notificationId: notification.id, readAt });
};

const markRead = (req, res) => changeReadState(req, res, true);
const markUnread = (req, res) => changeReadState(req, res, false);

module.exports = { listNotifications, markRead, markUnread };
