const request = async (path = "", method = "GET") => {
  const response = await fetch(`/api/notifications${path}`, {
    method, headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "No se pudo cargar la bandeja.");
  return data;
};

export const getNotifications = request;
export const setNotificationRead = (id, read) => request(`/${encodeURIComponent(id)}/read`, read ? "PUT" : "DELETE");
