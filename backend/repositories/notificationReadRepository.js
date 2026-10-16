const reads = new Map();
const keyFor = (userId, notificationId) => `${userId}:${notificationId}`;

const getForUser = (userId) => [...reads.entries()]
  .filter(([key, readAt]) => key.startsWith(`${userId}:`) && readAt)
  .map(([key, readAt]) => ({ notificationId: key.slice(String(userId).length + 1), readAt }));
const markRead = (userId, notificationId) => {
  const key = keyFor(userId, notificationId);
  const readAt = reads.get(key) || new Date().toISOString();
  reads.set(key, readAt);
  return readAt;
};
const markUnread = (userId, notificationId) => { reads.delete(keyFor(userId, notificationId)); };

module.exports = process.env.VERA_NOTIFICATION_STORE === "supabase"
  ? require("./supabaseNotificationReadRepository")
  : { getForUser, markRead, markUnread };
