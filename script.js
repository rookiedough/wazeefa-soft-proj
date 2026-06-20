/**
 * Wazeefa Demo App
 * Fixed frontend script with:
 * - Profile menu: Settings + Logout
 * - User management three-dot action menu
 * - Candidate table rendering safety
 * - CV upload integration
 */

const DEFAULT_PASSWORD = "password123";
const USERS_STORAGE_KEY = "wazeefa_users";
const AUTH_STORAGE_KEY = "wazeefa_auth_user";
const UPLOADED_CANDIDATES_KEY = "wazeefa_uploaded_candidates";
const REJECTED_KEY = "wazeefa_rejected_candidates";
const STAGES_KEY = "wazeefa_candidate_stages";
const APP_VIEWS = new Set(["dashboard", "candidates", "candidate-detail", "cv-upload", "users"]);

let CANDIDATES = [];
let users = [];

const state = {
  isAuthenticated: false,
  currentUser: null,
  currentView: "dashboard",
  selectedCandidateId: null,
  selectedFile: null,
  filters: { search: "", role: "", status: "", minScore: 0 }
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function today() {
  return new Date().toLocaleDateString("en-US");
}

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function setJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function showToast(message) {
  const container = $("#toast-container");
  if (!container) {
    console.log(message);
    return;
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function scoreBadgeClass(score) {
  if (score >= 90) return "badge badge--dark";
  if (score >= 80) return "badge";
  return "badge badge--outline";
}

function statusBadgeClass(status) {
  if (["Offer", "Interview", "Active", "Admin", "Hired"].includes(status)) return "badge badge--dark";
  if (["Inactive", "Rejected"].includes(status)) return "badge badge--outline";
  return "badge";
}

async function loadCandidates() {
  try {
    const response = await fetch("candidates.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load candidates.json");
    CANDIDATES = await response.json();
  } catch (error) {
    console.error(error);
    CANDIDATES = [];
    showToast("Could not load candidates.json.");
  }
}

async function loadUsers() {
  const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
  if (savedUsers) {
    try {
      users = JSON.parse(savedUsers);
    } catch {
      users = [];
      localStorage.removeItem(USERS_STORAGE_KEY);
    }
  }

  if (!users.length) {
    try {
      const response = await fetch("users.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load users.json");
      users = await response.json();
    } catch {
      users = [
        {
          id: "u1",
          name: "Admin Manager",
          email: "admin@company.com",
          role: "Admin",
          status: "Active",
          lastLogin: "Never",
          password: DEFAULT_PASSWORD
        }
      ];
    }
  }

  users = users.map((user) => ({ ...user, password: user.password || DEFAULT_PASSWORD }));
  saveUsers();
}

function saveUsers() {
  setJson(USERS_STORAGE_KEY, users);
}

function getCurrentUserFromSession() {
  const saved = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);
    return users.find((user) => user.id === parsed.id) || null;
  } catch {
    return null;
  }
}

function handleLogin(event) {
  event.preventDefault();

  const emailInput = $("#employee-id");
  const passwordInput = $("#password");
  const emailError = $("#employee-id-error");
  const passwordError = $("#password-error");

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  emailError.textContent = "";
  passwordError.textContent = "";
  emailInput.classList.remove("is-invalid");
  passwordInput.classList.remove("is-invalid");

  if (!email) {
    emailError.textContent = "Email is required.";
    emailInput.classList.add("is-invalid");
    return;
  }

  if (!password) {
    passwordError.textContent = "Password is required.";
    passwordInput.classList.add("is-invalid");
    return;
  }

  const user = users.find((item) => item.email.toLowerCase() === email);
  if (!user || user.password !== password) {
    passwordError.textContent = "Invalid email or password. Use a user email and password123.";
    passwordInput.classList.add("is-invalid");
    return;
  }

  if (user.status === "Inactive") {
    passwordError.textContent = "This user account is inactive.";
    passwordInput.classList.add("is-invalid");
    return;
  }

  user.lastLogin = today();
  saveUsers();

  sessionStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role })
  );

  window.location.href = "index.html#dashboard";
}

function handleLogout() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  window.location.href = "login.html";
}

function requireAuth() {
  state.currentUser = getCurrentUserFromSession();
  state.isAuthenticated = Boolean(state.currentUser);

  if (!state.isAuthenticated) {
    window.location.href = "login.html";
    return false;
  }

  return true;
}

function navigate(view, params = {}) {
  if (!requireAuth()) return;
  if (!APP_VIEWS.has(view)) view = "dashboard";
  if (view === "candidate-detail" && params.id) state.selectedCandidateId = params.id;

  state.currentView = view;

  const appShell = $("#app-shell");
  if (appShell) appShell.hidden = false;

  $$(".view").forEach((section) => section.classList.remove("view--active"));
  const activeView = $(`#view-${view}`);
  if (activeView) activeView.classList.add("view--active");

  $$(".nav-link").forEach((link) => {
    const navView = link.dataset.nav;
    link.classList.toggle("is-active", navView === view || (view === "candidate-detail" && navView === "candidates"));
  });

  $("#main-nav")?.classList.remove("is-open");
  $("#nav-toggle")?.setAttribute("aria-expanded", "false");

  if (view === "dashboard") renderDashboard();
  if (view === "candidates") renderCandidatesTable();
  if (view === "candidate-detail") renderCandidateDetail();
  if (view === "users") renderUsersTable();

  history.replaceState({ view, params }, "", `#${view}${params.id ? "/" + params.id : ""}`);
}

function parseHash() {
  const hash = location.hash.replace(/^#/, "") || "dashboard";
  const [view, id] = hash.split("/");
  navigate(APP_VIEWS.has(view) ? view : "dashboard", { id });
}

function getUploadedCandidates() {
  return getJson(UPLOADED_CANDIDATES_KEY, []);
}

function saveUploadedCandidates(candidates) {
  setJson(UPLOADED_CANDIDATES_KEY, candidates);
}

function getAllCandidates() {
  return [...CANDIDATES, ...getUploadedCandidates()];
}

function getRejectedCandidates() {
  return getJson(REJECTED_KEY, {});
}

function getCandidateDisplayStatus(candidate) {
  if (getRejectedCandidates()[candidate.id]) return "Rejected";
  const stages = getJson(STAGES_KEY, {});
  return stages[candidate.id] || candidate.status || "Review";
}

function setCandidateStage(candidateId, stage) {
  const stages = getJson(STAGES_KEY, {});
  stages[candidateId] = stage;
  setJson(STAGES_KEY, stages);
}

function renderDashboard() {
  const allCandidates = getAllCandidates();

  const avatar = $("#logout-btn");
  if (avatar && state.currentUser) {
    avatar.textContent = state.currentUser.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    avatar.title = `Open profile menu for ${state.currentUser.name}`;
    avatar.setAttribute("aria-haspopup", "menu");
    avatar.setAttribute("aria-expanded", "false");
  }
  ensureProfileMenu();

  if ($("#stat-candidates")) $("#stat-candidates").textContent = allCandidates.length;
  if ($("#stat-interview")) $("#stat-interview").textContent = allCandidates.filter((c) => getCandidateDisplayStatus(c) === "Interview").length;
  if ($("#stat-offers")) $("#stat-offers").textContent = allCandidates.filter((c) => getCandidateDisplayStatus(c) === "Offer").length;
  if ($("#stat-users")) $("#stat-users").textContent = users.length;
}

function getUniqueValues(key) {
  return [...new Set(getAllCandidates().map((c) => c[key]).filter(Boolean))].sort();
}

function populateFilterOptions() {
  const roleSelect = $("#filter-role");
  const statusSelect = $("#filter-status");
  if (!roleSelect || !statusSelect) return;

  roleSelect.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());
  statusSelect.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());

  getUniqueValues("role").forEach((role) => roleSelect.append(new Option(role, role)));
  getUniqueValues("status").forEach((status) => statusSelect.append(new Option(status, status)));
}

function getFilteredCandidates() {
  const { search, role, status, minScore } = state.filters;
  const query = search.toLowerCase();

  return getAllCandidates().filter((candidate) => {
    const name = candidate.name || "";
    const email = candidate.email || "";
    const candidateRole = candidate.role || "";
    const candidateStatus = getCandidateDisplayStatus(candidate);
    const candidateScore = Number(candidate.score || 0);

    const matchesSearch = !query || name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
    const matchesRole = !role || candidateRole === role;
    const matchesStatus = !status || candidateStatus === status;
    const matchesScore = candidateScore >= minScore;

    return matchesSearch && matchesRole && matchesStatus && matchesScore;
  });
}

function renderCandidatesTable() {
  const tbody = $("#candidates-table-body");
  const count = $("#candidate-count");
  if (!tbody || !count) return;

  const filtered = getFilteredCandidates();
  count.textContent = filtered.length;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted">No candidates match your filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((c) => {
      const displayStatus = getCandidateDisplayStatus(c);
      return `
        <tr>
          <td class="candidate-name-cell">${escapeHtml(c.name || "Unknown")}</td>
          <td class="candidate-email-cell text-muted">${escapeHtml(c.email || "")}</td>
          <td class="candidate-role-cell">${escapeHtml(c.role || "")}</td>
          <td><span class="${scoreBadgeClass(Number(c.score || 0))}">${Number(c.score || 0)}</span></td>
          <td><span class="${statusBadgeClass(displayStatus)}">${escapeHtml(displayStatus)}</span></td>
          <td class="text-muted candidate-date-cell">${escapeHtml(c.applied || "")}</td>
          <td><button type="button" class="table-action" data-view-candidate="${escapeHtml(c.id)}">View</button></td>
        </tr>
      `;
    })
    .join("");
}

function handleFiltersChange() {
  state.filters.search = $("#filter-search").value.trim();
  state.filters.role = $("#filter-role").value;
  state.filters.status = $("#filter-status").value;
  state.filters.minScore = Number($("#filter-score").value);
  $("#score-value").textContent = state.filters.minScore;
  renderCandidatesTable();
}

function resetFilters() {
  state.filters = { search: "", role: "", status: "", minScore: 0 };
  $("#filter-search").value = "";
  $("#filter-role").value = "";
  $("#filter-status").value = "";
  $("#filter-score").value = "0";
  $("#score-value").textContent = "0";
  renderCandidatesTable();
}

function getCandidateById(id) {
  const allCandidates = getAllCandidates();
  return allCandidates.find((candidate) => candidate.id === id) || allCandidates[0];
}

function getCurrentCandidate() {
  return getCandidateById(state.selectedCandidateId);
}

function renderCandidateDetail() {
  const candidate = getCurrentCandidate();
  if (!candidate) return;

  state.selectedCandidateId = candidate.id;

  $("#detail-name").textContent = candidate.name || "Unknown Candidate";
  $("#detail-role").textContent = candidate.role || "";
  $("#detail-summary").textContent = candidate.summary || "";
  $("#detail-score").textContent = Number(candidate.score || 0);

  const displayStatus = getCandidateDisplayStatus(candidate);
  const statusBadge = $("#detail-status-badge");
  statusBadge.textContent = displayStatus;
  statusBadge.className = statusBadgeClass(displayStatus);

  $("#detail-contact").innerHTML = `
    <div class="info-item"><p class="info-item__label">Email</p><p class="info-item__value">${escapeHtml(candidate.email || "")}</p></div>
    <div class="info-item"><p class="info-item__label">Phone</p><p class="info-item__value">${escapeHtml(candidate.phone || "")}</p></div>
    <div class="info-item"><p class="info-item__label">Location</p><p class="info-item__value">${escapeHtml(candidate.location || "")}</p></div>
    <div class="info-item"><p class="info-item__label">Applied</p><p class="info-item__value">${escapeHtml(candidate.applied || "")}</p></div>
  `;

  $("#detail-experience").innerHTML = `
    <div class="info-item">
      <p class="info-item__label">Experience</p>
      <p class="info-item__value text-muted multiline-text">${escapeHtml(candidate.experience || "")}</p>
    </div>
    <div class="info-item">
      <p class="info-item__label">Education</p>
      <p class="info-item__value text-muted multiline-text">${escapeHtml(candidate.education || "")}</p>
    </div>
  `;

  const skills = Array.isArray(candidate.skills) ? candidate.skills : [];
  $("#detail-skills").innerHTML = skills.map((skill) => `<span class="badge">${escapeHtml(skill)}</span>`).join("");

  const timeline = Array.isArray(candidate.timeline) ? candidate.timeline : [];
  $("#detail-timeline").innerHTML = timeline
    .map(
      (item) => `
        <li>
          <div>
            <p class="timeline__title">${escapeHtml(item.title || "Timeline item")}</p>
            <p class="timeline__date">${escapeHtml(item.date || "")}</p>
          </div>
        </li>
      `
    )
    .join("");

  const breakdown = Array.isArray(candidate.breakdown) ? candidate.breakdown : [];
  $("#detail-breakdown").innerHTML = breakdown
    .map(
      (item) => `
        <div class="progress-item">
          <div class="progress-item__header">
            <span>${escapeHtml(item.label || "")}</span>
            <span>${Number(item.value || 0)}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar__fill" style="width: ${Number(item.value || 0)}%"></div>
          </div>
        </div>
      `
    )
    .join("");
}

function handleCandidateAction(action) {
  const candidate = getCurrentCandidate();
  if (!candidate) return;

  if (action === "schedule") {
    setCandidateStage(candidate.id, "Interview");
    showToast(`Interview scheduled for ${candidate.name}.`);
    renderCandidateDetail();
    renderDashboard();
  }
  if (action === "next-stage") {
    const flow = ["Review", "Screening", "Interview", "Offer", "Hired"];
    const current = getCandidateDisplayStatus(candidate);
    const index = flow.indexOf(current);
    const next = flow[Math.min(index + 1, flow.length - 1)] || "Screening";
    setCandidateStage(candidate.id, next);
    showToast(`${candidate.name} moved to ${next}.`);
    renderCandidateDetail();
    renderDashboard();
  }
}

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

function isValidCvFile(file) {
  return ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
}

function setSelectedFile(file) {
  state.selectedFile = file;
  const status = $("#upload-status");
  const processBtn = $("#upload-process-btn");
  if (!status || !processBtn) return;

  if (file) {
    status.textContent = `Selected: ${file.name} (${Math.round(file.size / 1024)} KB)`;
    processBtn.disabled = false;
  } else {
    status.textContent = "";
    processBtn.disabled = true;
  }
}

function handleFileSelect(fileList) {
  const file = fileList?.[0];
  if (!file) return;

  if (!isValidCvFile(file)) {
    showToast("Please upload a .pdf, .doc, or .docx file.");
    return;
  }

  setSelectedFile(file);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function processUpload() {
  if (!state.selectedFile) return;

  const file = state.selectedFile;
  const processBtn = $("#upload-process-btn");
  if (processBtn) processBtn.disabled = true;

  showToast(`Processing ${file.name}…`);

  try {
    const dataBase64 = await fileToBase64(file);
    const response = await fetch("/api/process-cv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataBase64
      })
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      console.error("Non-JSON API response:", text);
      throw new Error("Server returned a non-JSON response.");
    }

    if (!response.ok) {
      throw new Error(result.error || result.detail || "CV processing failed.");
    }

    const uploadedCandidates = getUploadedCandidates();
    uploadedCandidates.push(result);
    saveUploadedCandidates(uploadedCandidates);

    populateFilterOptions();
    showToast(`${result.name || "Candidate"} processed successfully.`);

    setSelectedFile(null);
    const input = $("#cv-file-input");
    if (input) input.value = "";

    navigate("candidates");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not process CV.");
  } finally {
    if (processBtn) processBtn.disabled = false;
  }
}

function cancelUpload() {
  setSelectedFile(null);
  const input = $("#cv-file-input");
  const zone = $("#upload-zone");
  if (input) input.value = "";
  if (zone) zone.classList.remove("is-dragover");
}

function renderUsersTable() {
  const tbody = $("#users-table-body");
  const count = $("#user-count");
  if (!tbody || !count) return;

  count.textContent = users.length;
  tbody.innerHTML = users
    .map(
      (u) => `
        <tr>
          <td>${escapeHtml(u.name)}</td>
          <td class="text-muted user-email-cell">${escapeHtml(u.email)}</td>
          <td><span class="${statusBadgeClass(u.role)}">${escapeHtml(u.role)}</span></td>
          <td><span class="${statusBadgeClass(u.status)}">${escapeHtml(u.status)}</span></td>
          <td class="text-muted">${escapeHtml(u.lastLogin || "Never")}</td>
          <td class="actions-cell">
            <button type="button" class="table-action action-menu-trigger" data-user-menu="${escapeHtml(u.id)}" aria-label="Open actions for ${escapeHtml(u.name)}">•••</button>
            <div class="action-menu" id="user-menu-${escapeHtml(u.id)}" hidden>
              <button type="button" data-user-action="reset-password" data-user-id="${escapeHtml(u.id)}">Reset password</button>
              <button type="button" data-user-action="toggle-status" data-user-id="${escapeHtml(u.id)}">${u.status === "Active" ? "Deactivate" : "Activate"}</button>
              <button type="button" class="danger" data-user-action="remove" data-user-id="${escapeHtml(u.id)}">Remove user</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function closeAllUserMenus() {
  $$(".action-menu").forEach((menu) => {
    menu.hidden = true;
  });
}

function toggleUserMenu(userId) {
  const menu = $(`#user-menu-${CSS.escape(userId)}`);
  if (!menu) return;
  const wasHidden = menu.hidden;
  closeAllUserMenus();
  menu.hidden = !wasHidden;
}

function resetUserPassword(userId) {
  const user = users.find((u) => u.id === userId);
  if (!user) return;
  user.password = DEFAULT_PASSWORD;
  saveUsers();
  showToast(`${user.name}'s password was reset to ${DEFAULT_PASSWORD}.`);
}

function toggleUserStatus(userId) {
  const user = users.find((u) => u.id === userId);
  if (!user) return;
  if (state.currentUser?.id === userId) {
    showToast("You cannot deactivate your own account while logged in.");
    return;
  }
  user.status = user.status === "Active" ? "Inactive" : "Active";
  saveUsers();
  renderUsersTable();
  renderDashboard();
  showToast(`${user.name} is now ${user.status}.`);
}

function removeUser(userId) {
  const user = users.find((u) => u.id === userId);
  if (!user) return;

  if (state.currentUser?.id === userId) {
    showToast("You cannot remove the user you are currently logged in as.");
    return;
  }

  if (!confirm(`Remove ${user.name}?`)) return;

  users = users.filter((u) => u.id !== userId);
  saveUsers();
  renderUsersTable();
  renderDashboard();
  showToast(`${user.name} removed.`);
}

function openAddUserModal() {
  const form = $("#add-user-form");
  if (form) form.reset();
  $("#user-name-error").textContent = "";
  $("#user-email-error").textContent = "";
  $("#add-user-modal").showModal();
}

function closeAddUserModal() {
  $("#add-user-modal").close();
}

function handleAddUser(event) {
  event.preventDefault();

  const name = $("#user-name").value.trim();
  const email = $("#user-email").value.trim().toLowerCase();
  const role = $("#user-role").value;
  let valid = true;

  $("#user-name-error").textContent = "";
  $("#user-email-error").textContent = "";

  if (!name) {
    $("#user-name-error").textContent = "Name is required.";
    valid = false;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    $("#user-email-error").textContent = "Enter a valid email address.";
    valid = false;
  }

  if (users.some((u) => u.email.toLowerCase() === email)) {
    $("#user-email-error").textContent = "A user with this email already exists.";
    valid = false;
  }

  if (!valid) return;

  users.push({
    id: `u${Date.now()}`,
    name,
    email,
    role,
    status: "Active",
    lastLogin: "Never",
    password: DEFAULT_PASSWORD
  });

  saveUsers();
  closeAddUserModal();
  renderUsersTable();
  renderDashboard();
  showToast(`${name} added. Default password is ${DEFAULT_PASSWORD}.`);
}

function ensureProfileMenu() {
  const actions = $(".app-header__actions");
  const avatar = $("#logout-btn");
  if (!actions || !avatar || !state.currentUser) return;

  let menu = $("#profile-menu");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "profile-menu";
    menu.className = "profile-menu";
    menu.hidden = true;
    menu.setAttribute("role", "menu");
    actions.appendChild(menu);
  }

  menu.innerHTML = `
    <div class="profile-menu__header">
      <p class="profile-menu__name">${escapeHtml(state.currentUser.name || "User")}</p>
      <p class="profile-menu__email">${escapeHtml(state.currentUser.email || "")}</p>
    </div>
    <button type="button" role="menuitem" id="profile-settings-btn">Settings</button>
    <button type="button" role="menuitem" class="danger" id="profile-logout-btn">Logout</button>
  `;

  $("#profile-settings-btn").addEventListener("click", () => {
    closeProfileMenu();
    openSettingsModal();
  });
  $("#profile-logout-btn").addEventListener("click", () => {
    closeProfileMenu();
    handleLogout();
  });
}

function toggleProfileMenu() {
  ensureProfileMenu();
  const menu = $("#profile-menu");
  const avatar = $("#logout-btn");
  if (!menu) return;

  const wasHidden = menu.hidden;
  menu.hidden = !wasHidden;
  avatar?.setAttribute("aria-expanded", String(wasHidden));
}

function closeProfileMenu() {
  const menu = $("#profile-menu");
  const avatar = $("#logout-btn");
  if (menu) menu.hidden = true;
  avatar?.setAttribute("aria-expanded", "false");
}

function ensureSimpleDialog() {
  let dialog = $("#simple-action-modal");
  if (dialog) return dialog;

  dialog = document.createElement("dialog");
  dialog.id = "simple-action-modal";
  dialog.className = "modal profile-settings-modal";
  dialog.innerHTML = `
    <form method="dialog" class="modal__content">
      <header class="modal__header">
        <h2 id="simple-action-title">Settings</h2>
        <button type="button" class="modal__close" id="simple-action-close" aria-label="Close">&times;</button>
      </header>
      <div class="modal__body" id="simple-action-body"></div>
      <footer class="modal__footer">
        <button type="button" class="btn btn--primary" id="simple-action-ok">Close</button>
      </footer>
    </form>
  `;
  document.body.appendChild(dialog);
  $("#simple-action-close").addEventListener("click", () => dialog.close());
  $("#simple-action-ok").addEventListener("click", () => dialog.close());
  return dialog;
}

function openSettingsModal() {
  const dialog = ensureSimpleDialog();
  $("#simple-action-title").textContent = "Settings";
  $("#simple-action-body").innerHTML = `
    <div class="settings-grid">
      <div class="settings-item"><strong>Name</strong><span>${escapeHtml(state.currentUser?.name || "Not available")}</span></div>
      <div class="settings-item"><strong>Email</strong><span>${escapeHtml(state.currentUser?.email || "Not available")}</span></div>
      <div class="settings-item"><strong>Role</strong><span>${escapeHtml(state.currentUser?.role || "Not available")}</span></div>
    </div>
    <p class="candidate-action-hint" style="margin-top:1rem;">Settings are display-only in this frontend demo.</p>
  `;
  dialog.showModal();
}

function handleCandidateActionClick(event) {
  const button = event.target.closest("button");
  if (!button || !button.closest(".action-stack")) return;

  const label = button.textContent.trim().toLowerCase();
  if (label === "send email") {
    event.preventDefault();
    showToast("Email draft action is available in the demo flow.");
  }
  if (label === "download resume") {
    event.preventDefault();
    showToast("Resume download is a placeholder action in this demo.");
  }
  if (label === "add notes") {
    event.preventDefault();
    showToast("Notes action is a placeholder action in this demo.");
  }
  if (button.id === "reject-btn" || label === "reject candidate") {
    event.preventDefault();
    const candidate = getCurrentCandidate();
    if (!candidate) return;
    const rejected = getRejectedCandidates();
    rejected[candidate.id] = { name: candidate.name, rejectedAt: new Date().toISOString() };
    setJson(REJECTED_KEY, rejected);
    showToast(`${candidate.name} marked as rejected.`);
    renderCandidateDetail();
    renderDashboard();
  }
}

function initEventListeners() {
  $("#login-form")?.addEventListener("submit", handleLogin);
  $("#logout-btn")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleProfileMenu();
  });

  $$('[data-nav]').forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(el.dataset.nav);
    });
  });

  $("#nav-toggle")?.addEventListener("click", () => {
    const nav = $("#main-nav");
    const expanded = nav.classList.toggle("is-open");
    $("#nav-toggle").setAttribute("aria-expanded", String(expanded));
  });

  $("#candidates-table-body")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-view-candidate]");
    if (btn) navigate("candidate-detail", { id: btn.dataset.viewCandidate });
  });

  const filtersForm = $("#filters-form");
  if (filtersForm) {
    filtersForm.addEventListener("input", handleFiltersChange);
    filtersForm.addEventListener("change", handleFiltersChange);
    filtersForm.addEventListener("reset", (event) => {
      event.preventDefault();
      resetFilters();
    });
  }

  $("#schedule-interview-btn")?.addEventListener("click", () => handleCandidateAction("schedule"));
  $("#next-stage-btn")?.addEventListener("click", () => handleCandidateAction("next-stage"));
  $(".action-stack")?.addEventListener("click", handleCandidateActionClick);

  const uploadZone = $("#upload-zone");
  const fileInput = $("#cv-file-input");
  if (uploadZone && fileInput) {
    uploadZone.addEventListener("click", () => fileInput.click());
    uploadZone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fileInput.click();
      }
    });
    fileInput.addEventListener("change", () => handleFileSelect(fileInput.files));
    uploadZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      uploadZone.classList.add("is-dragover");
    });
    uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("is-dragover"));
    uploadZone.addEventListener("drop", (event) => {
      event.preventDefault();
      uploadZone.classList.remove("is-dragover");
      handleFileSelect(event.dataTransfer.files);
    });
  }

  $("#upload-process-btn")?.addEventListener("click", processUpload);
  $("#upload-cancel-btn")?.addEventListener("click", cancelUpload);
  $("#add-user-btn")?.addEventListener("click", openAddUserModal);
  $("#close-user-modal")?.addEventListener("click", closeAddUserModal);
  $("#cancel-user-btn")?.addEventListener("click", closeAddUserModal);
  $("#add-user-form")?.addEventListener("submit", handleAddUser);

  $("#users-table-body")?.addEventListener("click", (event) => {
    const menuButton = event.target.closest("[data-user-menu]");
    if (menuButton) {
      event.preventDefault();
      event.stopPropagation();
      toggleUserMenu(menuButton.dataset.userMenu);
      return;
    }

    const actionButton = event.target.closest("[data-user-action]");
    if (!actionButton) return;
    event.preventDefault();
    event.stopPropagation();

    const userId = actionButton.dataset.userId;
    const action = actionButton.dataset.userAction;
    closeAllUserMenus();

    if (action === "reset-password") resetUserPassword(userId);
    if (action === "toggle-status") toggleUserStatus(userId);
    if (action === "remove") removeUser(userId);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".actions-cell")) closeAllUserMenus();
    if (!event.target.closest(".app-header__actions")) closeProfileMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProfileMenu();
      closeAllUserMenus();
    }
  });

  window.addEventListener("hashchange", parseHash);
}

async function init() {
  await loadCandidates();
  await loadUsers();

  initEventListeners();

  const isLoginPage = Boolean($("#login-form"));
  if (isLoginPage) {
    if (getCurrentUserFromSession()) window.location.href = "index.html#dashboard";
    return;
  }

  if (!requireAuth()) return;

  populateFilterOptions();
  parseHash();
}

document.addEventListener("DOMContentLoaded", init);
