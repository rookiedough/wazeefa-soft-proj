/* candidate-actions-fixed.js
   Candidate detail actions for Wazeefa.
   Install in index.html AFTER script.js:
   <script src="script.js"></script>
   <script src="candidate-actions-fixed.js"></script>
*/
(function () {
  const NOTES_KEY = "wazeefa_candidate_notes";
  const REJECTED_KEY = "wazeefa_rejected_candidates";

  const $ = (selector) => document.querySelector(selector);

  function toast(message) {
    if (typeof window.showToast === "function") window.showToast(message);
    else alert(message);
  }

  function getJson(key, fallback = {}) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  }

  function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getCurrentCandidate() {
    const name = $("#detail-name")?.textContent?.trim() || "Candidate";
    const role = $("#detail-role")?.textContent?.trim() || "";
    const contactText = $("#detail-contact")?.innerText || "";
    const emailMatch = contactText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const email = emailMatch ? emailMatch[0] : "";
    const id = email || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return { id, name, role, email };
  }

  function ensureModal() {
    if ($("#candidate-action-modal")) return;

    const dialog = document.createElement("dialog");
    dialog.id = "candidate-action-modal";
    dialog.className = "modal candidate-action-modal";
    dialog.innerHTML = `
      <form method="dialog" class="modal__content candidate-action-modal__content">
        <header class="modal__header">
          <h2 id="candidate-action-title">Candidate action</h2>
          <button type="button" class="modal__close" id="candidate-action-close" aria-label="Close">&times;</button>
        </header>
        <div class="modal__body" id="candidate-action-body"></div>
        <footer class="modal__footer" id="candidate-action-footer"></footer>
      </form>
    `;
    document.body.appendChild(dialog);

    $("#candidate-action-close").addEventListener("click", closeModal);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeModal();
    });
  }

  function openModal(title, bodyHtml, footerHtml) {
    ensureModal();
    $("#candidate-action-title").textContent = title;
    $("#candidate-action-body").innerHTML = bodyHtml;
    $("#candidate-action-footer").innerHTML = footerHtml;
    $("#candidate-action-modal").showModal();
  }

  function closeModal() {
    const dialog = $("#candidate-action-modal");
    if (dialog?.open) dialog.close();
  }

  function openSendEmail() {
    const candidate = getCurrentCandidate();
    const subject = `Application update - ${candidate.role || "Wazeefa"}`;
    const message = `Dear ${candidate.name},\n\nThank you for your interest in the ${candidate.role || "role"}. We wanted to share an update regarding your application.\n\nBest regards,\nWazeefa Recruitment Team`;

    openModal(
      `Send email to ${candidate.name}`,
      `
        <div class="form-field">
          <label for="candidate-email-to">To</label>
          <input id="candidate-email-to" type="email" value="${escapeHtml(candidate.email)}" placeholder="candidate@email.com">
        </div>
        <div class="form-field">
          <label for="candidate-email-subject">Subject</label>
          <input id="candidate-email-subject" type="text" value="${escapeHtml(subject)}">
        </div>
        <div class="form-field">
          <label for="candidate-email-body">Message</label>
          <textarea id="candidate-email-body" rows="8">${escapeHtml(message)}</textarea>
        </div>
        <p class="candidate-action-hint">This demo opens your email app with a pre-filled draft. Direct sending needs backend email integration.</p>
      `,
      `
        <button type="button" class="btn btn--outline" id="copy-email-draft-btn">Copy Draft</button>
        <button type="button" class="btn btn--primary" id="open-email-client-btn">Open Email App</button>
      `
    );

    $("#copy-email-draft-btn").addEventListener("click", async () => {
      const draft = `To: ${$("#candidate-email-to").value}\nSubject: ${$("#candidate-email-subject").value}\n\n${$("#candidate-email-body").value}`;
      try {
        await navigator.clipboard.writeText(draft);
        toast("Email draft copied.");
      } catch {
        toast("Could not copy automatically. Please copy it manually.");
      }
    });

    $("#open-email-client-btn").addEventListener("click", () => {
      const to = $("#candidate-email-to").value.trim();
      const subjectValue = $("#candidate-email-subject").value.trim();
      const bodyValue = $("#candidate-email-body").value;

      if (!to) {
        toast("Please enter a recipient email address.");
        return;
      }

      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subjectValue)}&body=${encodeURIComponent(bodyValue)}`;
      closeModal();
    });
  }

  function renderNotePreview() {
    if (!$("#view-candidate-detail.view--active")) return;

    const candidate = getCurrentCandidate();
    const notes = getJson(NOTES_KEY);
    let card = $("#candidate-notes-card");

    if (!notes[candidate.id]) {
      card?.remove();
      return;
    }

    if (!card) {
      card = document.createElement("article");
      card.id = "candidate-notes-card";
      card.className = "card";
      $(".detail-main")?.appendChild(card);
    }

    card.innerHTML = `
      <header class="card__header"><h2>Recruitment Notes</h2></header>
      <div class="card__body"><p class="text-muted candidate-note-preview"></p></div>
    `;
    card.querySelector(".candidate-note-preview").textContent = notes[candidate.id];
  }

  function openNotes() {
    const candidate = getCurrentCandidate();
    const notes = getJson(NOTES_KEY);

    openModal(
      `Notes for ${candidate.name}`,
      `
        <div class="form-field">
          <label for="candidate-note-text">Recruitment notes</label>
          <textarea id="candidate-note-text" rows="9" placeholder="Add notes about this candidate...">${escapeHtml(notes[candidate.id] || "")}</textarea>
        </div>
        <p class="candidate-action-hint">Notes are saved in this browser.</p>
      `,
      `
        <button type="button" class="btn btn--outline" id="clear-note-btn">Clear</button>
        <button type="button" class="btn btn--primary" id="save-note-btn">Save Note</button>
      `
    );

    $("#clear-note-btn").addEventListener("click", () => {
      $("#candidate-note-text").value = "";
    });

    $("#save-note-btn").addEventListener("click", () => {
      const updatedNotes = getJson(NOTES_KEY);
      updatedNotes[candidate.id] = $("#candidate-note-text").value.trim();
      setJson(NOTES_KEY, updatedNotes);
      closeModal();
      renderNotePreview();
      toast("Candidate note saved.");
    });
  }

  function applyRejectedState() {
    if (!$("#view-candidate-detail.view--active")) return;

    const candidate = getCurrentCandidate();
    const rejected = getJson(REJECTED_KEY);
    const badge = $("#detail-status-badge");

    if (rejected[candidate.id] && badge) {
      badge.textContent = "Rejected";
      badge.className = "badge badge--outline candidate-rejected-badge";
    }
  }

  function openReject() {
    const candidate = getCurrentCandidate();

    openModal(
      `Reject ${candidate.name}?`,
      `
        <p class="candidate-action-warning">This will mark the candidate as rejected in this browser.</p>
        <div class="form-field">
          <label for="reject-reason">Reason / note</label>
          <textarea id="reject-reason" rows="6" placeholder="Optional reason for rejection..."></textarea>
        </div>
      `,
      `
        <button type="button" class="btn btn--outline" id="cancel-reject-btn">Cancel</button>
        <button type="button" class="btn btn--danger" id="confirm-reject-btn">Reject Candidate</button>
      `
    );

    $("#cancel-reject-btn").addEventListener("click", closeModal);
    $("#confirm-reject-btn").addEventListener("click", () => {
      const rejected = getJson(REJECTED_KEY);
      rejected[candidate.id] = {
        name: candidate.name,
        email: candidate.email,
        role: candidate.role,
        reason: $("#reject-reason").value.trim(),
        rejectedAt: new Date().toISOString(),
      };
      setJson(REJECTED_KEY, rejected);
      closeModal();
      applyRejectedState();
      toast(`${candidate.name} marked as rejected.`);
    });
  }

  function isCandidateDetailActive() {
    return Boolean($("#view-candidate-detail.view--active"));
  }

  function buttonText(button) {
    return button?.textContent?.trim().toLowerCase();
  }

  // Capture phase is important: it runs BEFORE the existing reject button listener in script.js.
  document.addEventListener(
    "click",
    (event) => {
      if (!isCandidateDetailActive()) return;

      const button = event.target.closest("button");
      if (!button || !button.closest(".action-stack")) return;

      const text = buttonText(button);

      if (text === "send email") {
        event.preventDefault();
        event.stopImmediatePropagation();
        openSendEmail();
      }

      if (text === "add notes") {
        event.preventDefault();
        event.stopImmediatePropagation();
        openNotes();
      }

      if (button.id === "reject-btn" || text === "reject candidate") {
        event.preventDefault();
        event.stopImmediatePropagation();
        openReject();
      }
    },
    true
  );

  function refresh() {
    ensureModal();
    renderNotePreview();
    applyRejectedState();
  }

  document.addEventListener("DOMContentLoaded", refresh);
  window.addEventListener("hashchange", () => setTimeout(refresh, 100));
  document.addEventListener("click", () => setTimeout(refresh, 100));
})();
