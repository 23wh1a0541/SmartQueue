const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const request = async (path, options = {}) => {
  const { token, headers, ...fetchOptions } = options;

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
      }
    });
  } catch (_error) {
    throw new Error(
      `Unable to reach the SmartQueue server at ${API_URL}. Make sure the backend is running and accessible.`
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
};

export const api = {
  register: (payload) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  login: (payload) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  me: (token) =>
    request("/auth/me", {
      token
    }),
  getShops: () => request("/shops"),
  createShop: (token, payload) =>
    request("/shops", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  getOwnerShop: (token) =>
    request("/shops/mine", {
      token
    }),
  toggleShopStatus: (token, status) =>
    request("/shops/mine/status", {
      method: "PATCH",
      token,
      body: JSON.stringify({ status })
    }),
  joinQueue: (token, shopId) =>
    request("/queue/join", {
      method: "POST",
      token,
      body: JSON.stringify({ shopId })
    }),
  getQueueStatus: (shopId) => request(`/queue/status/${shopId}`),
  getMyTokens: (token) =>
    request("/queue/my-tokens", {
      token
    }),
  callNext: (token, shopId) =>
    request("/queue/call-next", {
      method: "POST",
      token,
      body: JSON.stringify({ shopId })
    }),
  updateQueueStatus: (token, queueId, status) =>
    request(`/queue/${queueId}/status`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status })
    }),
  getAnalytics: (token, shopId) =>
    request(`/queue/analytics/${shopId}`, {
      token
    })
};
