const { createStore } = require("./supabaseDocumentStore");
const store = createStore("vera_notification_reads");
const keyFor = (userId, notificationId) => `${userId}:${notificationId}`;

const getForUser = async (userId) => (await store.getAll({ user_id: `eq.${userId}` }))
  .filter((item) => item.readAt)
  .map(({ notificationId, readAt }) => ({ notificationId, readAt }));

const markRead = async (userId, notificationId) => {
  const id = keyFor(userId, notificationId);
  const current = await store.findById(id);
  if (current?.readAt) return current.readAt;
  const readAt = new Date().toISOString();
  if (current) await store.mutate(id, { readAt }, current.storageVersion);
  else await store.create({ id, userId, notificationId, readAt }, { user_id: userId });
  return readAt;
};

const markUnread = async (userId, notificationId) => {
  const id = keyFor(userId, notificationId);
  const current = await store.findById(id);
  if (current?.readAt) await store.mutate(id, { readAt: null }, current.storageVersion);
};

module.exports = { getForUser, markRead, markUnread };
