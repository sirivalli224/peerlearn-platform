
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, BookOpen, CalendarDays, Star,
  Search, Plus, ArrowUpRight, RefreshCw, GraduationCap,
  Clock, Sparkles, CheckCircle2, Link as LinkIcon,
  TrendingUp, MessageSquare, Filter, LogIn, LogOut, UserPlus
} from "lucide-react";
import "./App.css";

const API = "http://localhost:5000/api";

const navigation = [
  { name: "Dashboard" , icon: LayoutDashboard },
  { name: "Find Peers", icon: Users },
  { name: "Resources", icon: BookOpen },
  { name: "Tutoring", icon: CalendarDays },
  { name: "Reviews", icon: Star },
];

function App() {
  const [section, setSection] = useState("Dashboard");
  const [authMode, setAuthMode] = useState("login");
  const [authUser, setAuthUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [peers, setPeers] = useState([]);
  const [resources, setResources] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [peerSearch, setPeerSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [resourceSearch, setResourceSearch] = useState("");

  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceSubject, setResourceSubject] = useState("");
  const [resourceLink, setResourceLink] = useState("");

  const [requestPeer, setRequestPeer] = useState("");
  const [requestSubject, setRequestSubject] = useState("");

  const [reviewPeer, setReviewPeer] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");

  async function handleAuth(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const isSignup = authMode === "signup";

    try {
      const response = await fetch(`${API}/auth/${isSignup ? "signup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isSignup ? { name: authName.trim() } : {}),
          email: authEmail.trim(),
          password: authPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Authentication failed.");

      if (isSignup) {
        setMessage("Account created successfully! Please log in.");
        setAuthMode("login");
        setAuthPassword("");
        return;
      }

      localStorage.setItem("peerlearn_token", result.token);
      setAuthUser(result.user);
      setAuthPassword("");
      setError("");
      setMessage(`Welcome back, ${result.user.name}!`);
      await loadData(true);
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("peerlearn_token");
    setAuthUser(null);
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
    setSection("Dashboard");
    setMessage("");
    setError("");
  }

  async function checkLogin() {
    const token = localStorage.getItem("peerlearn_token");
    if (!token) {
      setAuthChecking(false);
      return;
    }

    try {
      const response = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        localStorage.removeItem("peerlearn_token");
        return;
      }

      setAuthUser(await response.json());
      await loadData(true);
    } catch (err) {
      setError("Unable to connect to the server. Please check that the backend is running.");
    } finally {
      setAuthChecking(false);
    }
  }

  async function loadData(showLoader = false) {
    if (showLoader) setLoading(true);

    try {
      setError("");

      const endpoints = [
        `${API}/peers`,
        `${API}/resources`,
        `${API}/requests`,
        `${API}/reviews`,
      ];

      const responses = await Promise.all(
        endpoints.map(url => fetch(url))
      );

      if (responses.some(response => !response.ok)) {
        throw new Error("Unable to load data. Check that your backend is running.");
      }

      const [p, r, t, v] = await Promise.all(
        responses.map(response => response.json())
      );

      setPeers(p);
      setResources(r);
      setRequests(t);
      setReviews(v);
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkLogin();
  }, []);

  async function sendData(path, method, data) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || result.error || "Unable to save your information."
        );
      }

      setMessage("Saved successfully!");
      await loadData();
      return true;
    } catch (err) {
      setError(err.message || "Something went wrong.");
      return false;
    }
  }

  const subjects = [
    "All",
    ...new Set(peers.map(peer => peer.subject).filter(Boolean)),
  ];

  const filteredPeers = peers.filter(peer => {
    const query = peerSearch.toLowerCase();

    const matchesSearch = [
      peer.name,
      peer.subject,
      peer.skill,
    ].some(value => (value || "").toLowerCase().includes(query));

    const matchesSubject =
      subjectFilter === "All" || peer.subject === subjectFilter;

    return matchesSearch && matchesSubject;
  });

  const filteredResources = resources.filter(resource =>
    `${resource.title || ""} ${resource.subject || ""}`
      .toLowerCase()
      .includes(resourceSearch.toLowerCase())
  );

  async function addResource(e) {
    e.preventDefault();

    const saved = await sendData("/resources", "POST", {
      title: resourceTitle.trim(),
      subject: resourceSubject.trim(),
      link: resourceLink.trim(),
    });

    if (saved) {
      setResourceTitle("");
      setResourceSubject("");
      setResourceLink("");
    }
  }

  async function requestTutoring(e) {
    e.preventDefault();

    if (!requestPeer || !requestSubject.trim()) {
      setError("Please select a student and enter a subject.");
      return;
    }

    const saved = await sendData("/requests", "POST", {
      peer: requestPeer,
      subject: requestSubject.trim(),
    });

    if (saved) {
      setRequestPeer("");
      setRequestSubject("");
    }
  }

  async function addReview(e) {
    e.preventDefault();

    if (!reviewPeer || !reviewComment.trim()) {
      setError("Please select a student and write a review.");
      return;
    }

    const saved = await sendData("/reviews", "POST", {
      peer: reviewPeer,
      rating: Number(reviewRating),
      comment: reviewComment.trim(),
    });

    if (saved) {
      setReviewPeer("");
      setReviewRating("5");
      setReviewComment("");
    }
  }

  function openTutoring(peer) {
    setRequestPeer(peer.name);
    setRequestSubject(peer.subject || "");
    setSection("Tutoring");
    setMessage("");
    setError("");
  }

  function PeerCards({ items }) {
    if (loading) return <div className="empty-state">Loading students...</div>;

    if (!items.length) {
      return (
        <div className="empty-state">
          <Users size={30} />
          <h3>No students found</h3>
          <p>Try another name, skill, or subject.</p>
        </div>
      );
    }

    return (
      <div className="peer-grid">
        {items.map(peer => (
          <article className="peer-card" key={peer._id}>
            <div className="peer-card-top">
              <div className="avatar">
                {(peer.name || "S").charAt(0).toUpperCase()}
              </div>
              <span className="online-label">
                <span className="status-dot" /> Learning peer
              </span>
            </div>

            <h3>{peer.name}</h3>
            <p className="peer-subject">{peer.subject}</p>

            <div className="peer-tags">
              <span className="tag">{peer.skill}</span>
            </div>

            <div className="peer-rating">
              <Star size={16} fill="currentColor" />
              <strong>{Number(peer.rating || 0).toFixed(1)}</strong>
              <span>peer rating</span>
            </div>

            <button
              className="primary-button full-button"
              onClick={() => openTutoring(peer)}
            >
              Request tutoring <ArrowUpRight size={16} />
            </button>
          </article>
        ))}
      </div>
    );
  }

  return (
    <>
      {authChecking ? (
        <div className="auth-loading">
          <div className="auth-loading-logo"><GraduationCap size={32} /></div>
          <p>Loading PeerLearn...</p>
        </div>
      ) : !authUser ? (
        <div className="auth-page">
          <div className="auth-decoration auth-decoration-one" />
          <div className="auth-decoration auth-decoration-two" />
          <div className="auth-card">
            <div className="auth-logo"><GraduationCap size={34} /></div>
            <h1>PeerLearn</h1>
            <p className="auth-subtitle">Learn together. Grow together.</p>

            <div className="auth-tabs">
              <button type="button" className={authMode === "login" ? "selected" : ""}
                onClick={() => { setAuthMode("login"); setError(""); setMessage(""); }}>
                <LogIn size={17} /> Login
              </button>
              <button type="button" className={authMode === "signup" ? "selected" : ""}
                onClick={() => { setAuthMode("signup"); setError(""); setMessage(""); }}>
                <UserPlus size={17} /> Sign up
              </button>
            </div>

            <h2>{authMode === "signup" ? "Create your account" : "Welcome back!"}</h2>
            <p className="auth-description">
              {authMode === "signup" ? "Join your student learning community." : "Log in to continue your learning journey."}
            </p>

            {error && <div className="notice error auth-notice">{error}</div>}
            {message && <div className="notice success auth-notice">{message}</div>}

            <form className="auth-form" onSubmit={handleAuth}>
              {authMode === "signup" && (
                <label>Full name
                  <input value={authName} onChange={e => setAuthName(e.target.value)}
                    placeholder="Enter your full name" autoComplete="name" required />
                </label>
              )}
              <label>Email address
                <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                  placeholder="you@example.com" autoComplete="email" required />
              </label>
              <label>Password
                <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)}
                  placeholder="At least 8 characters" minLength={8}
                  autoComplete={authMode === "signup" ? "new-password" : "current-password"} required />
              </label>
              <button className="primary-button auth-submit" type="submit">
                {authMode === "signup" ? "Create account" : "Login"}
                <ArrowUpRight size={17} />
              </button>
            </form>

            <p className="auth-switch">
              {authMode === "signup" ? "Already have an account?" : "New to PeerLearn?"}{" "}
              <button type="button" onClick={() => {
                setAuthMode(authMode === "signup" ? "login" : "signup");
                setError(""); setMessage("");
              }}>{authMode === "signup" ? "Login" : "Sign up"}</button>
            </p>
            <div className="auth-bottom-note"><Users size={15} /> A better way to learn together</div>
          </div>
        </div>
      ) : (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <GraduationCap size={25} />
          </div>
          <div>
            <h2>PeerLearn</h2>
            <span>Learn together</span>
          </div>
        </div>

        <div className="nav-heading">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${section === item.name ? "active" : ""}`}
                onClick={() => {
                  setSection(item.name);
                  setError("");
                  setMessage("");
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>
                {item.name === "Tutoring" && requests.length > 0 && (
                  <span className="nav-count">{requests.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-promo">
            <div className="promo-icon"><Sparkles size={19} /></div>
            <h3>Grow together</h3>
            <p>Every peer has something valuable to teach.</p>
            <button onClick={() => setSection("Find Peers")}>
              Explore peers <ArrowUpRight size={15} />
            </button>
          </div>

          <div className="sidebar-footer">
            <div className="mini-avatar">P</div>
            <div>
              <strong>{authUser.name}</strong>
              <span>Learning community</span>
              <button className="logout-button" onClick={handleLogout}>
                <LogOut size={15} /> Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="page-heading">
            <span className="eyebrow">YOUR LEARNING SPACE</span>
            <h1>{section}</h1>
            <p>
              {section === "Dashboard"
                ? "Your journey to learning something new starts here."
                : `Explore and manage your ${section.toLowerCase()} workspace.`}
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={() => loadData(true)}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="notice error">
            {error}
            <button onClick={() => setError("")}>Dismiss</button>
          </div>
        )}

        {message && (
          <div className="notice success">
            <CheckCircle2 size={18} />
            {message}
            <button onClick={() => setMessage("")}>Dismiss</button>
          </div>
        )}

        {section === "Dashboard" && (
          <>
            <section className="hero-card">
              <div className="hero-copy">
                <span className="hero-label">
                  <Sparkles size={14} /> YOUR NEXT CHAPTER STARTS HERE
                </span>
                <h2>Learn better, <br />together. 💜</h2>
                <p>
                  Find your people, exchange knowledge, and turn
                  the skills you want to learn into skills you own.
                </p>
                <button
                  className="hero-button"
                  onClick={() => setSection("Find Peers")}
                >
                  Find learning partners <ArrowUpRight size={17} />
                </button>
              </div>

              <div className="hero-art">
                <div className="art-orbit orbit-one" />
                <div className="art-orbit orbit-two" />
                <div className="art-cap">
                  <GraduationCap size={76} strokeWidth={1.3} />
                </div>
                <div className="art-bubble bubble-one"><BookOpen size={23} /></div>
                <div className="art-bubble bubble-two"><Star size={22} /></div>
                <div className="art-bubble bubble-three"><Users size={23} /></div>
              </div>
            </section>

            <div className="section-title-row">
              <div>
                <h2>Your learning overview</h2>
                <p>A snapshot of your PeerLearn community.</p>
              </div>
              <span className="live-chip"><span className="status-dot" /> Live data</span>
            </div>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon purple"><Users size={21} /></div>
                <span className="stat-label">Learning peers</span>
                <strong className="stat-number">{peers.length}</strong>
                <span className="stat-foot">Students to learn with</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue"><BookOpen size={21} /></div>
                <span className="stat-label">Resources shared</span>
                <strong className="stat-number">{resources.length}</strong>
                <span className="stat-foot">Materials in the library</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange"><CalendarDays size={21} /></div>
                <span className="stat-label">Tutoring requests</span>
                <strong className="stat-number">{requests.length}</strong>
                <span className="stat-foot">Learning connections started</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon pink"><Star size={21} /></div>
                <span className="stat-label">Reviews received</span>
                <strong className="stat-number">{reviews.length}</strong>
                <span className="stat-foot">Community feedback</span>
              </div>
            </section>

            <section className="content-section">
              <div className="section-title-row">
                <div>
                  <h2>People you can learn with</h2>
                  <p>Discover a peer who knows what you want to learn.</p>
                </div>
                <button className="text-button" onClick={() => setSection("Find Peers")}>
                  View all <ArrowUpRight size={16} />
                </button>
              </div>
              <PeerCards items={peers.slice(0, 4)} />
            </section>

            <section className="content-section">
              <div className="section-title-row">
                <div>
                  <h2>Recently shared resources</h2>
                  <p>Explore materials from your learning community.</p>
                </div>
                <button className="text-button" onClick={() => setSection("Resources")}>
                  Browse library <ArrowUpRight size={16} />
                </button>
              </div>

              {resources.length ? (
                <div className="resource-grid">
                  {resources.slice(0, 3).map(resource => (
                    <article className="resource-card" key={resource._id}>
                      <div className="resource-icon"><BookOpen size={21} /></div>
                      <span className="tag">{resource.subject}</span>
                      <h3>{resource.title}</h3>
                      {resource.link ? (
                        <a href={resource.link} target="_blank" rel="noreferrer">
                          Open resource <ArrowUpRight size={15} />
                        </a>
                      ) : (
                        <span className="muted-text">Shared learning material</span>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <BookOpen size={28} />
                  <h3>Your library starts here</h3>
                  <p>Share the first resource with your learning community.</p>
                  <button className="primary-button" onClick={() => setSection("Resources")}>
                    Add a resource <Plus size={16} />
                  </button>
                </div>
              )}
            </section>

            <section className="content-section">
              <div className="section-title-row">
                <div>
                  <h2>Recent tutoring activity</h2>
                  <p>Keep track of learning connections you've started.</p>
                </div>
                <button className="text-button" onClick={() => setSection("Tutoring")}>
                  View requests <ArrowUpRight size={16} />
                </button>
              </div>

              {requests.length ? (
                requests.slice(0, 4).map(request => (
                  <div className="activity-row" key={request._id}>
                    <div className="activity-icon"><CalendarDays size={19} /></div>
                    <div className="activity-info">
                      <strong>{request.peer}</strong>
                      <span>{request.subject}</span>
                    </div>
                    <span className={`status-badge ${(request.status || "pending").toLowerCase()}`}>
                      {request.status || "Pending"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-inline">
                  <Clock size={18} />
                  No tutoring activity yet. Find a peer to get started.
                </div>
              )}
            </section>
          </>
        )}

        {section === "Find Peers" && (
          <section className="content-section">
            <div className="page-intro-card">
              <div className="intro-icon"><Users size={25} /></div>
              <div>
                <h2>Find your learning partner</h2>
                <p>Search by student name, subject, or skill to discover your next learning connection.</p>
              </div>
            </div>

            <div className="search-toolbar">
              <div className="search-field">
                <Search size={19} />
                <input
                  placeholder="Search names, subjects, or skills..."
                  value={peerSearch}
                  onChange={e => setPeerSearch(e.target.value)}
                />
              </div>

              <div className="filter-field">
                <Filter size={17} />
                <select
                  value={subjectFilter}
                  onChange={e => setSubjectFilter(e.target.value)}
                >
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>
                      {subject === "All" ? "All subjects" : subject}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="results-row">
              <span><strong>{filteredPeers.length}</strong> students found</span>
              {(peerSearch || subjectFilter !== "All") && (
                <button className="text-button" onClick={() => {
                  setPeerSearch("");
                  setSubjectFilter("All");
                }}>
                  Clear filters
                </button>
              )}
            </div>

            <PeerCards items={filteredPeers} />
          </section>
        )}

        {section === "Resources" && (
          <section className="content-section">
            <div className="page-intro-card">
              <div className="intro-icon blue"><BookOpen size={25} /></div>
              <div>
                <h2>Your community learning library</h2>
                <p>Share notes, tutorials, and useful links to help everyone learn faster.</p>
              </div>
            </div>

            <div className="form-panel">
              <div className="form-heading">
                <div>
                  <h2>Share a resource</h2>
                  <p>Add useful material to the community library.</p>
                </div>
                <div className="form-heading-icon"><Plus size={21} /></div>
              </div>

              <form className="app-form" onSubmit={addResource}>
                <label>
                  Resource title
                  <input
                    placeholder="e.g. Python Programming Notes"
                    value={resourceTitle}
                    onChange={e => setResourceTitle(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Subject
                  <input
                    placeholder="e.g. Python, AI & ML"
                    value={resourceSubject}
                    onChange={e => setResourceSubject(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Resource URL <span className="optional">(optional)</span>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={resourceLink}
                    onChange={e => setResourceLink(e.target.value)}
                  />
                </label>

                <button className="primary-button" type="submit">
                  <Plus size={17} /> Publish resource
                </button>
              </form>
            </div>

            <div className="section-title-row resource-library-heading">
              <div>
                <h2>Resource library</h2>
                <p>{resources.length} resources shared by the community.</p>
              </div>
            </div>

            <div className="search-field resource-search-field">
              <Search size={18} />
              <input
                placeholder="Search the resource library..."
                value={resourceSearch}
                onChange={e => setResourceSearch(e.target.value)}
              />
            </div>

            {filteredResources.length ? (
              <div className="resource-grid">
                {filteredResources.map(resource => (
                  <article className="resource-card" key={resource._id}>
                    <div className="resource-icon"><BookOpen size={21} /></div>
                    <span className="tag">{resource.subject}</span>
                    <h3>{resource.title}</h3>
                    <p>Community-shared learning material</p>
                    {resource.link ? (
                      <a href={resource.link} target="_blank" rel="noreferrer">
                        Open resource <ArrowUpRight size={15} />
                      </a>
                    ) : (
                      <span className="muted-text"><LinkIcon size={14} /> No link provided</span>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Search size={28} />
                <h3>No matching resources</h3>
                <p>Try another search or publish a new resource.</p>
              </div>
            )}
          </section>
        )}

        {section === "Tutoring" && (
          <section className="content-section">
            <div className="page-intro-card">
              <div className="intro-icon orange"><CalendarDays size={25} /></div>
              <div>
                <h2>Make learning a team effort</h2>
                <p>Request help from a peer and track your tutoring requests here.</p>
              </div>
            </div>

            <div className="form-panel">
              <div className="form-heading">
                <div>
                  <h2>New tutoring request</h2>
                  <p>Choose a student and the subject you want to learn.</p>
                </div>
                <div className="form-heading-icon orange"><CalendarDays size={21} /></div>
              </div>

              <form className="app-form" onSubmit={requestTutoring}>
                <label>
                  Choose a peer
                  <select
                    value={requestPeer}
                    onChange={e => setRequestPeer(e.target.value)}
                    required
                  >
                    <option value="">Select a student</option>
                    {peers.map(peer => (
                      <option key={peer._id} value={peer.name}>{peer.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Subject you want to learn
                  <input
                    placeholder="e.g. React, Python, Machine Learning"
                    value={requestSubject}
                    onChange={e => setRequestSubject(e.target.value)}
                    required
                  />
                </label>

                <button className="primary-button" type="submit">
                  <CalendarDays size={17} /> Send tutoring request
                </button>
              </form>
            </div>

            <div className="section-title-row resource-library-heading">
              <div>
                <h2>Your tutoring requests</h2>
                <p>Review the current status of each request.</p>
              </div>
              <span className="count-chip">{requests.length} total</span>
            </div>

            {requests.length ? (
              <div className="request-list">
                {requests.map(request => (
                  <article className="request-card" key={request._id}>
                    <div className="request-avatar"><GraduationCap size={23} /></div>
                    <div className="request-details">
                      <h3>{request.peer}</h3>
                      <p>{request.subject}</p>
                      <span className="request-id">Tutoring request</span>
                    </div>
                    <span className={`status-badge ${(request.status || "pending").toLowerCase()}`}>
                      {request.status || "Pending"}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <CalendarDays size={28} />
                <h3>No requests yet</h3>
                <p>Send your first tutoring request to get started.</p>
              </div>
            )}
          </section>
        )}

        {section === "Reviews" && (
          <section className="content-section">
            <div className="page-intro-card">
              <div className="intro-icon pink"><Star size={25} /></div>
              <div>
                <h2>Celebrate learning together</h2>
                <p>Share constructive feedback and recognize helpful learning peers.</p>
              </div>
            </div>

            <div className="form-panel">
              <div className="form-heading">
                <div>
                  <h2>Write a review</h2>
                  <p>Tell the community about your learning experience.</p>
                </div>
                <div className="form-heading-icon pink"><MessageSquare size={21} /></div>
              </div>

              <form className="app-form" onSubmit={addReview}>
                <label>
                  Student
                  <select
                    value={reviewPeer}
                    onChange={e => setReviewPeer(e.target.value)}
                    required
                  >
                    <option value="">Select a student</option>
                    {peers.map(peer => (
                      <option key={peer._id} value={peer.name}>{peer.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Your rating
                  <select
                    value={reviewRating}
                    onChange={e => setReviewRating(e.target.value)}
                  >
                    {[5, 4, 3, 2, 1].map(rating => (
                      <option key={rating} value={rating}>
                        {"★".repeat(rating)} ({rating}/5)
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Your feedback
                  <textarea
                    placeholder="What did you learn? How was the experience?"
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    required
                  />
                </label>

                <button className="primary-button" type="submit">
                  <Star size={17} /> Submit review
                </button>
              </form>
            </div>

            <div className="section-title-row resource-library-heading">
              <div>
                <h2>Community feedback</h2>
                <p>{reviews.length} reviews shared so far.</p>
              </div>
            </div>

            {reviews.length ? (
              <div className="review-grid">
                {reviews.map(review => (
                  <article className="review-card" key={review._id}>
                    <div className="review-stars">
                      {"★".repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}
                      <span>{Number(review.rating || 0)}/5</span>
                    </div>
                    <p>"{review.comment}"</p>
                    <div className="review-person">
                      <div className="avatar small">
                        {(review.peer || "S").charAt(0).toUpperCase()}
                      </div>
                      <strong>{review.peer}</strong>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Star size={28} />
                <h3>No reviews yet</h3>
                <p>Share feedback to help build a supportive learning community.</p>
              </div>
            )}
          </section>
        )}

        <footer className="app-footer">
          <span>© {new Date().getFullYear()} PeerLearn</span>
          <span>Built for learners, powered by community <span className="footer-heart">♥</span></span>
        </footer>
      </main>
    </div>
      )}
    </>
  );
}

export default App;
