import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const initialAuthForm = {
  name: "",
  email: "",
  password: "",
  role: "customer"
};

const shopFormDefaults = {
  name: "",
  description: "",
  category: "",
  averageServiceTime: 5,
  queuePrefix: "SQ"
};

const formatDate = (value) =>
  new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });

function App() {
  const [mode, setMode] = useState("login");
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [shopForm, setShopForm] = useState(shopFormDefaults);
  const [token, setToken] = useState(localStorage.getItem("smartqueue_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("smartqueue_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopStatus, setSelectedShopStatus] = useState(null);
  const [myTokens, setMyTokens] = useState([]);
  const [ownerView, setOwnerView] = useState({ shop: null, queueItems: [] });
  const [analytics, setAnalytics] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedShop = useMemo(
    () => shops.find((shop) => shop._id === selectedShopId) || null,
    [shops, selectedShopId]
  );

  const persistSession = (sessionToken, sessionUser) => {
    setToken(sessionToken);
    setUser(sessionUser);
    localStorage.setItem("smartqueue_token", sessionToken);
    localStorage.setItem("smartqueue_user", JSON.stringify(sessionUser));
  };

  const clearFeedback = () => {
    setMessage("");
    setError("");
  };

  const loadPublicData = async (preferredShopId) => {
    const { shops: availableShops } = await api.getShops();
    setShops(availableShops);

    const fallbackShopId =
      preferredShopId ||
      selectedShopId ||
      (availableShops.length ? availableShops[0]._id : "");

    setSelectedShopId(fallbackShopId);

    if (fallbackShopId) {
      const queueStatus = await api.getQueueStatus(fallbackShopId);
      setSelectedShopStatus(queueStatus);
    } else {
      setSelectedShopStatus(null);
    }
  };

  const loadCustomerData = async () => {
    if (!token || user?.role !== "customer") {
      return;
    }

    const data = await api.getMyTokens(token);
    setMyTokens(data.tokens);
  };

  const loadOwnerData = async () => {
    if (!token || user?.role !== "admin") {
      return;
    }

    try {
      const shopData = await api.getOwnerShop(token);
      setOwnerView(shopData);
      setSelectedShopId(shopData.shop._id);

      const [queueStatus, analyticsData] = await Promise.all([
        api.getQueueStatus(shopData.shop._id),
        api.getAnalytics(token, shopData.shop._id)
      ]);

      setSelectedShopStatus(queueStatus);
      setAnalytics(analyticsData);
    } catch (_requestError) {
      setOwnerView({ shop: null, queueItems: [] });
      setAnalytics(null);
    }
  };

  const refreshAll = async (preferredShopId) => {
    setLoading(true);

    try {
      await loadPublicData(preferredShopId);
      await loadCustomerData();
      await loadOwnerData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    refreshAll(selectedShopId);
  }, [user?.role]);

  useEffect(() => {
    if (!token) {
      return;
    }

    api
      .me(token)
      .then(({ user: sessionUser }) => {
        setUser(sessionUser);
        localStorage.setItem("smartqueue_user", JSON.stringify(sessionUser));
      })
      .catch(() => {
        handleLogout();
      });
  }, [token]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const action = mode === "register" ? api.register : api.login;
      const payload =
        mode === "register"
          ? authForm
          : { email: authForm.email, password: authForm.password };

      const response = await action(payload);
      persistSession(response.token, response.user);
      setAuthForm(initialAuthForm);
      setMessage(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    setMyTokens([]);
    setOwnerView({ shop: null, queueItems: [] });
    setAnalytics(null);
    localStorage.removeItem("smartqueue_token");
    localStorage.removeItem("smartqueue_user");
  };

  const handleCreateShop = async (event) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const response = await api.createShop(token, shopForm);
      setMessage(response.message);
      setShopForm(shopFormDefaults);
      await refreshAll(response.shop._id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQueue = async () => {
    if (!selectedShopId) {
      setError("Select a shop before joining the queue.");
      return;
    }

    clearFeedback();
    setLoading(true);

    try {
      const response = await api.joinQueue(token, selectedShopId);
      setMessage(`${response.message} Your token is ${response.queueItem.tokenLabel}.`);
      await refreshAll(selectedShopId);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCallNext = async () => {
    if (!ownerView.shop) {
      return;
    }

    clearFeedback();
    setLoading(true);

    try {
      const response = await api.callNext(token, ownerView.shop._id);
      setMessage(response.message);
      await refreshAll(ownerView.shop._id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQueueAction = async (queueId, status) => {
    clearFeedback();
    setLoading(true);

    try {
      const response = await api.updateQueueStatus(token, queueId, status);
      setMessage(response.message);
      await refreshAll(ownerView.shop?._id || selectedShopId);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShopStatusToggle = async () => {
    if (!ownerView.shop) {
      return;
    }

    clearFeedback();
    setLoading(true);

    try {
      const nextStatus = ownerView.shop.status === "open" ? "closed" : "open";
      const response = await api.toggleShopStatus(token, nextStatus);
      setMessage(response.message);
      await refreshAll(ownerView.shop._id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShopSelection = async (event) => {
    const nextId = event.target.value;
    setSelectedShopId(nextId);

    if (!nextId) {
      setSelectedShopStatus(null);
      return;
    }

    const data = await api.getQueueStatus(nextId);
    setSelectedShopStatus(data);
  };

  const activeCustomerToken = myTokens.find((item) => ["waiting", "called"].includes(item.status));

  return (
    <div className="app-shell">
      <aside className="hero-panel">
        <div className="hero-top">
          <div className="brand-chip">SmartQueue</div>
          <div className="hero-tag">Virtual Queue Platform</div>
        </div>
        <div>
          <h1>Virtual queue management built for smoother customer flow.</h1>
          <p>
            Customers join digitally, shops call the next visitor from a live dashboard,
            and both sides stay updated without standing in a physical line.
          </p>
        </div>

        <div className="hero-ribbon">
          <span>Live status</span>
          <strong>{selectedShopStatus?.nextToken || "Queues ready for customers"}</strong>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <span>Digital tokens</span>
            <strong>{selectedShopStatus?.summary?.total || 0}</strong>
          </div>
          <div className="stat-card">
            <span>Waiting now</span>
            <strong>{selectedShopStatus?.summary?.waiting || 0}</strong>
          </div>
          <div className="stat-card">
            <span>Live shops</span>
            <strong>{shops.length}</strong>
          </div>
        </div>
      </aside>

      <main className="content-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Queue operations</p>
            <h2>{user ? `Welcome, ${user.name}` : "Professional queue experience"}</h2>
            <p className="topbar-copy">
              Run a cleaner virtual queue for customers and shop owners with live token tracking.
            </p>
          </div>

          <div className="topbar-actions">
            <button className="ghost-button" onClick={() => refreshAll(selectedShopId)} disabled={loading}>
              Refresh
            </button>
            {user ? (
              <button className="ghost-button" onClick={handleLogout}>
                Logout
              </button>
            ) : null}
          </div>
        </header>

        {message ? <div className="feedback success">{message}</div> : null}
        {error ? <div className="feedback error">{error}</div> : null}

        {!user ? (
          <section className="card auth-card">
            <div className="toggle-row">
              <button className={mode === "login" ? "tab active" : "tab"} onClick={() => setMode("login")}>
                Login
              </button>
              <button className={mode === "register" ? "tab active" : "tab"} onClick={() => setMode("register")}>
                Register
              </button>
            </div>

            <form className="form-grid" onSubmit={handleAuthSubmit}>
              {mode === "register" ? (
                <label>
                  Full name
                  <input
                    value={authForm.name}
                    onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                    placeholder="Aarav Sharma"
                  />
                </label>
              ) : null}

              <label>
                Email
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                  placeholder="you@example.com"
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  placeholder="Enter password"
                />
              </label>

              {mode === "register" ? (
                <label>
                  Register as
                  <select
                    value={authForm.role}
                    onChange={(event) => setAuthForm({ ...authForm, role: event.target.value })}
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Shop owner</option>
                  </select>
                </label>
              ) : null}

              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? "Please wait..." : mode === "login" ? "Login to SmartQueue" : "Create account"}
              </button>
            </form>
          </section>
        ) : null}

        <section className="layout-grid">
          <section className="card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Public queue board</p>
                <h3>Available shops</h3>
              </div>

              <select value={selectedShopId} onChange={handleShopSelection}>
                <option value="">Select a shop</option>
                {shops.map((shop) => (
                  <option key={shop._id} value={shop._id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedShop ? (
              <div className="shop-preview">
                <h4>{selectedShop.name}</h4>
                <p>{selectedShop.description}</p>
                <div className="pill-row">
                  <span className="pill">{selectedShop.category}</span>
                  <span className="pill">Prefix {selectedShop.queuePrefix}</span>
                  <span className={`pill ${selectedShop.status === "open" ? "pill-open" : "pill-closed"}`}>
                    {selectedShop.status}
                  </span>
                </div>
              </div>
            ) : (
              <p className="muted">Create a shop or select one to view live queue status.</p>
            )}

            <div className="metrics-grid">
              <div className="metric-card">
                <span>Currently serving</span>
                <strong>
                  {selectedShopStatus?.currentlyServing
                    ? `${selectedShop?.queuePrefix}-${String(selectedShopStatus.currentlyServing).padStart(3, "0")}`
                    : "Idle"}
                </strong>
              </div>
              <div className="metric-card">
                <span>Next token</span>
                <strong>{selectedShopStatus?.nextToken || "Waiting for customers"}</strong>
              </div>
              <div className="metric-card">
                <span>Waiting customers</span>
                <strong>{selectedShopStatus?.summary?.waiting || 0}</strong>
              </div>
            </div>

            <div className="queue-list">
              {(selectedShopStatus?.queue || []).slice(0, 6).map((item) => (
                <div key={item._id} className="queue-item">
                  <div>
                    <strong>{item.tokenLabel}</strong>
                    <p>{item.customer?.name || "Customer"}</p>
                  </div>
                  <span className={`status-badge status-${item.status}`}>{item.status}</span>
                </div>
              ))}
            </div>

            {user?.role === "customer" ? (
              <button className="primary-button" onClick={handleJoinQueue} disabled={loading || !selectedShopId}>
                Join selected queue
              </button>
            ) : null}
          </section>

          {user?.role === "customer" ? (
            <section className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Customer view</p>
                  <h3>Your tokens</h3>
                </div>
              </div>

              {activeCustomerToken ? (
                <div className="highlight-card">
                  <span>Active token</span>
                  <strong>{activeCustomerToken.tokenLabel}</strong>
                  <p>
                    {activeCustomerToken.shop?.name} - Estimated wait {activeCustomerToken.estimatedWaitMinutes} min
                  </p>
                  <span className={`status-badge status-${activeCustomerToken.status}`}>
                    {activeCustomerToken.status}
                  </span>
                </div>
              ) : (
                <p className="muted">You do not have an active token right now.</p>
              )}

              <div className="history-list">
                {myTokens.map((item) => (
                  <div key={item._id} className="history-item">
                    <div>
                      <strong>{item.tokenLabel}</strong>
                      <p>{item.shop?.name}</p>
                      <small>{formatDate(item.createdAt)}</small>
                    </div>
                    <div className="history-actions">
                      <span className={`status-badge status-${item.status}`}>{item.status}</span>
                      {["waiting", "called"].includes(item.status) ? (
                        <button className="ghost-button" onClick={() => handleQueueAction(item._id, "cancelled")}>
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {user?.role === "admin" ? (
            !ownerView.shop ? (
              <section className="card">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Owner setup</p>
                    <h3>Create your shop</h3>
                  </div>
                </div>

                <form className="form-grid" onSubmit={handleCreateShop}>
                  <label>
                    Shop name
                    <input
                      value={shopForm.name}
                      onChange={(event) => setShopForm({ ...shopForm, name: event.target.value })}
                      placeholder="CityCare Clinic"
                    />
                  </label>

                  <label>
                    Description
                    <textarea
                      value={shopForm.description}
                      onChange={(event) => setShopForm({ ...shopForm, description: event.target.value })}
                      placeholder="Fast virtual queue for appointments and walk-ins."
                    />
                  </label>

                  <label>
                    Category
                    <input
                      value={shopForm.category}
                      onChange={(event) => setShopForm({ ...shopForm, category: event.target.value })}
                      placeholder="Clinic"
                    />
                  </label>

                  <label>
                    Average service time
                    <input
                      type="number"
                      min="1"
                      value={shopForm.averageServiceTime}
                      onChange={(event) => setShopForm({ ...shopForm, averageServiceTime: event.target.value })}
                    />
                  </label>

                  <label>
                    Token prefix
                    <input
                      value={shopForm.queuePrefix}
                      onChange={(event) => setShopForm({ ...shopForm, queuePrefix: event.target.value })}
                      placeholder="SQ"
                    />
                  </label>

                  <button className="primary-button" type="submit" disabled={loading}>
                    Create shop
                  </button>
                </form>
              </section>
            ) : (
              <>
                <section className="card">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Owner dashboard</p>
                      <h3>{ownerView.shop.name}</h3>
                    </div>

                    <button className="ghost-button" onClick={handleShopStatusToggle}>
                      Mark as {ownerView.shop.status === "open" ? "closed" : "open"}
                    </button>
                  </div>

                  <div className="metrics-grid">
                    <div className="metric-card">
                      <span>Status</span>
                      <strong>{ownerView.shop.status}</strong>
                    </div>
                    <div className="metric-card">
                      <span>Serving now</span>
                      <strong>
                        {ownerView.shop.currentlyServingToken
                          ? `${ownerView.shop.queuePrefix}-${String(ownerView.shop.currentlyServingToken).padStart(3, "0")}`
                          : "Idle"}
                      </strong>
                    </div>
                    <div className="metric-card">
                      <span>Average service</span>
                      <strong>{ownerView.shop.averageServiceTime} min</strong>
                    </div>
                  </div>

                  <button className="primary-button" onClick={handleCallNext} disabled={loading}>
                    Call next token
                  </button>

                  <div className="history-list">
                    {ownerView.queueItems.map((item) => (
                      <div key={item._id} className="history-item">
                        <div>
                          <strong>{item.tokenLabel}</strong>
                          <p>{item.customer?.name || "Customer"}</p>
                          <small>{formatDate(item.createdAt)}</small>
                        </div>
                        <div className="owner-actions">
                          <span className={`status-badge status-${item.status}`}>{item.status}</span>
                          {item.status === "called" ? (
                            <>
                              <button className="ghost-button" onClick={() => handleQueueAction(item._id, "served")}>
                                Mark served
                              </button>
                              <button className="ghost-button" onClick={() => handleQueueAction(item._id, "skipped")}>
                                Skip
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="card">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Daily analytics</p>
                      <h3>Today&apos;s performance</h3>
                    </div>
                  </div>

                  <div className="metrics-grid">
                    <div className="metric-card">
                      <span>Total customers</span>
                      <strong>{analytics?.metrics?.totalCustomersToday || 0}</strong>
                    </div>
                    <div className="metric-card">
                      <span>Served</span>
                      <strong>{analytics?.metrics?.served || 0}</strong>
                    </div>
                    <div className="metric-card">
                      <span>Avg. service time</span>
                      <strong>{analytics?.metrics?.averageServiceTimeMinutes || 0} min</strong>
                    </div>
                  </div>
                </section>
              </>
            )
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default App;
