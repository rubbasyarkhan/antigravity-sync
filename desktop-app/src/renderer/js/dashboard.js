/**
 * Dashboard & Project List Rendering Engine with Real-Time Search, Category Filters,
 * Pagination, Visual Badges (Private/Public/Company/Personal), Personal Toggles & Progress Bar
 */
let searchQuery = '';
let activeFilter = 'all'; // 'all', 'private', 'public', 'company', 'personal'
let currentPage = 1;
const itemsPerPage = 6;

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('project-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      currentPage = 1;
      renderProjects();
    });
  }

  // Filter Pill Event Listeners
  const filterPills = document.querySelectorAll('#repo-filter-bar .filter-pill');
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter || 'all';
      currentPage = 1;
      renderProjects();
    });
  });

  // Pagination Button Handlers
  const btnPrev = document.getElementById('btn-prev-page');
  const btnNext = document.getElementById('btn-next-page');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderProjects();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      currentPage++;
      renderProjects();
    });
  }

  const btnSetupMain = document.getElementById('btn-setup-machine-main');
  if (btnSetupMain) {
    btnSetupMain.addEventListener('click', handleSetupMachine);
  }

  const btnProgressClose = document.getElementById('btn-progress-close');
  if (btnProgressClose) {
    btnProgressClose.addEventListener('click', () => {
      document.getElementById('modal-progress').classList.add('hidden');
      if (window.electronAPI) {
        window.electronAPI.openFolder('~/Projects/');
      }
    });
  }
});

function renderProjects() {
  const companyContainer = document.getElementById('company-projects-list');
  const personalContainer = document.getElementById('personal-projects-list');
  const paginationFooter = document.getElementById('pagination-footer');

  if (!state || !state.workspace) return;

  let assigned = state.workspace.assigned_projects || [];
  let personal = state.workspace.personal_repos || [];

  // Tag type on objects for unified filtering & badge rendering
  assigned = assigned.map((p) => ({ ...p, _type: 'company' }));
  personal = personal.map((p) => ({ ...p, _type: 'personal' }));

  // 1. Filter by Search Query
  if (searchQuery) {
    assigned = assigned.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(searchQuery)) ||
        (p.description && p.description.toLowerCase().includes(searchQuery)) ||
        (p.team && p.team.toLowerCase().includes(searchQuery)) ||
        (p.language && p.language.toLowerCase().includes(searchQuery))
    );

    personal = personal.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(searchQuery)) ||
        (p.repo_url && p.repo_url.toLowerCase().includes(searchQuery)) ||
        (p.language && p.language.toLowerCase().includes(searchQuery))
    );
  }

  // 2. Filter by Category / Visibility Pill
  if (activeFilter === 'private') {
    assigned = assigned.filter((p) => p.is_private);
    personal = personal.filter((p) => p.is_private);
  } else if (activeFilter === 'public') {
    assigned = assigned.filter((p) => !p.is_private);
    personal = personal.filter((p) => !p.is_private);
  } else if (activeFilter === 'company') {
    personal = [];
  } else if (activeFilter === 'personal') {
    assigned = [];
  }

  const totalAssignedCount = assigned.length;
  const totalPersonalCount = personal.length;
  const totalCombinedCount = totalAssignedCount + totalPersonalCount;

  // 3. Apply Pagination across combined list or individual sections
  const totalPages = Math.max(1, Math.ceil(totalCombinedCount / itemsPerPage));
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Combine assigned & personal for unified pagination order
  const allFiltered = [...assigned, ...personal];
  const pageItems = allFiltered.slice(startIndex, endIndex);

  const paginatedAssigned = pageItems.filter((p) => p._type === 'company');
  const paginatedPersonal = pageItems.filter((p) => p._type === 'personal');

  // Render Helper for SVG Badges
  function renderBadges(proj, type) {
    const isPrivate = Boolean(proj.is_private);
    const visBadge = isPrivate
      ? '<span class="badge-vis badge-private"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Private</span>'
      : '<span class="badge-vis badge-public"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> Public</span>';

    const typeBadge =
      type === 'company'
        ? `<span class="badge-vis badge-company"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path></svg> ${escapeHtml(proj.team || 'Company')}</span>`
        : '<span class="badge-vis badge-personal"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Personal</span>';

    const langBadge = proj.language
      ? `<span class="badge-vis badge-lang"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> ${escapeHtml(proj.language)}</span>`
      : '';

    return `${visBadge} ${typeBadge} ${langBadge}`;
  }

  // Render Company Projects Section
  if (paginatedAssigned.length === 0) {
    companyContainer.innerHTML = `<div class="empty-state">${
      totalAssignedCount === 0
        ? searchQuery || activeFilter !== 'all'
          ? 'No company projects match current filters.'
          : `No company projects assigned to @${state.user ? state.user.github_login : ''} yet.`
        : 'No company projects on this page.'
    }</div>`;
  } else {
    companyContainer.innerHTML = paginatedAssigned
      .map((proj) => {
        const isEnabled = state.enabledSlugs ? state.enabledSlugs.has(proj.slug) : false;
        return `
        <div class="project-card">
          <div class="project-details">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
              <h4 style="margin:0">${escapeHtml(proj.name)}</h4>
              ${renderBadges(proj, 'company')}
            </div>
            <p>${escapeHtml(proj.description || 'No description')}</p>
          </div>
          <label class="switch">
            <input type="checkbox" data-type="company" data-slug="${proj.slug}" ${isEnabled ? 'checked' : ''} onchange="handleToggleChange(this)">
            <span class="slider"></span>
          </label>
        </div>
      `;
      })
      .join('');
  }

  // Render Personal Projects Section
  if (paginatedPersonal.length === 0) {
    personalContainer.innerHTML = `<div class="empty-state">${
      totalPersonalCount === 0
        ? searchQuery || activeFilter !== 'all'
          ? 'No personal projects match current filters.'
          : 'No personal projects added.'
        : 'No personal projects on this page.'
    }</div>`;
  } else {
    personalContainer.innerHTML = paginatedPersonal
      .map((proj) => {
        const slug = proj.slug || proj.name;
        const isEnabled = state.enabledPersonalSlugs ? state.enabledPersonalSlugs.has(slug) : false;
        return `
        <div class="project-card">
          <div class="project-details">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
              <h4 style="margin:0">${escapeHtml(proj.name)}</h4>
              ${renderBadges(proj, 'personal')}
            </div>
            <p>${escapeHtml(proj.repo_url)}</p>
          </div>
          <div style="display:flex; align-items:center; gap:12px">
            <button class="btn-secondary" onclick="openShareModal('${slug}', '${proj.repo_url}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Share
            </button>
            <label class="switch">
              <input type="checkbox" data-type="personal" data-slug="${slug}" ${isEnabled ? 'checked' : ''} onchange="handleToggleChange(this)">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      `;
      })
      .join('');
  }

  // 4. Update Pagination Footer UI Controls
  if (paginationFooter) {
    if (totalCombinedCount > 0) {
      paginationFooter.classList.remove('hidden');
      const startDisplay = totalCombinedCount === 0 ? 0 : startIndex + 1;
      const endDisplay = Math.min(endIndex, totalCombinedCount);

      const infoText = document.getElementById('pagination-info');
      if (infoText) {
        infoText.textContent = `Showing ${startDisplay}–${endDisplay} of ${totalCombinedCount} projects`;
      }

      const btnPrev = document.getElementById('btn-prev-page');
      const btnNext = document.getElementById('btn-next-page');

      if (btnPrev) btnPrev.disabled = currentPage === 1;
      if (btnNext) btnNext.disabled = currentPage >= totalPages;

      const pageNumbers = document.getElementById('page-numbers');
      if (pageNumbers) {
        let pagesHtml = '';
        for (let p = 1; p <= totalPages; p++) {
          pagesHtml += `<button class="page-number ${p === currentPage ? 'active' : ''}" onclick="goToPage(${p})">${p}</button>`;
        }
        pageNumbers.innerHTML = pagesHtml;
      }
    } else {
      paginationFooter.classList.add('hidden');
    }
  }
}

function goToPage(page) {
  currentPage = page;
  renderProjects();
}

async function handleToggleChange(checkbox) {
  const slug = checkbox.dataset.slug;
  const type = checkbox.dataset.type;

  if (type === 'personal') {
    if (!state.enabledPersonalSlugs) state.enabledPersonalSlugs = new Set();
    if (checkbox.checked) {
      state.enabledPersonalSlugs.add(slug);
    } else {
      state.enabledPersonalSlugs.delete(slug);
    }
  } else {
    if (!state.enabledSlugs) state.enabledSlugs = new Set();
    if (checkbox.checked) {
      state.enabledSlugs.add(slug);
    } else {
      state.enabledSlugs.delete(slug);
    }
  }

  // Persist updated toggles to sync server
  try {
    await fetch(`${SYNC_SERVER_URL}/workspace`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        enabled_slugs: Array.from(state.enabledSlugs),
        personal_repos: state.workspace ? (state.workspace.personal_repos || []) : [],
      }),
    });
  } catch (err) {
    console.error('Failed to save toggle state:', err);
  }
}

async function handleSetupMachine() {
  const assigned = state.workspace ? (state.workspace.assigned_projects || []) : [];
  const personal = state.workspace ? (state.workspace.personal_repos || []) : [];

  const selectedCompany = assigned.filter(
    (p) => state.enabledSlugs && state.enabledSlugs.has(p.slug)
  );

  const selectedPersonal = personal.filter(
    (p) => state.enabledPersonalSlugs && state.enabledPersonalSlugs.has(p.slug || p.name)
  );

  const allSelected = [...selectedCompany, ...selectedPersonal];

  if (allSelected.length === 0) {
    alert('Please toggle ON at least one project to set up your machine.');
    return;
  }

  // Open Progress Modal Overlay
  const modalProgress = document.getElementById('modal-progress');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressStepText = document.getElementById('progress-step-text');
  const progressLogList = document.getElementById('progress-log-list');
  const btnProgressClose = document.getElementById('btn-progress-close');

  modalProgress.classList.remove('hidden');
  btnProgressClose.classList.add('hidden');
  progressBarFill.style.width = '5%';
  progressStepText.textContent = 'Verifying system environment...';
  progressLogList.innerHTML = '<div>> Verifying Node.js, Python, and Git installation...</div>';

  if (window.electronAPI) {
    try {
      // 1. Verify system environment binaries
      if (window.electronAPI.verifyEnv) {
        const env = await window.electronAPI.verifyEnv();
        progressLogList.innerHTML += `<div style="color:#60a5fa">> Node.js: ${env.node ? env.nodeVersion : 'Not Installed'}</div>`;
        progressLogList.innerHTML += `<div style="color:#60a5fa">> Python: ${env.python ? env.pythonVersion : 'Not Installed'}</div>`;
        progressLogList.innerHTML += `<div style="color:#60a5fa">> Git: ${env.git ? env.gitVersion : 'Not Installed'}</div>`;
      }

      progressLogList.innerHTML += '<div>> Target directory: ~/Projects/</div>';

      let completedCount = 0;

      for (let i = 0; i < allSelected.length; i++) {
        const proj = allSelected[i];
        const pct = Math.round(((i + 1) / allSelected.length) * 90);
        progressBarFill.style.width = `${pct}%`;

        progressStepText.textContent = `Processing & installing dependencies (${i + 1}/${allSelected.length}): ${proj.name}...`;

        // Yield UI thread to keep Electron responsive and paint DOM updates
        await new Promise((r) => setTimeout(r, 50));

        // Execute Git & Dependency Installation
        const result = await window.electronAPI.cloneProject(proj.repo_url, proj.name);
        completedCount++;

        const resItem = result && result[0] ? result[0] : { status: 'done' };
        const isError = resItem.status === 'error';

        const statusTag = isError ? '[ERROR]' : '[OK]';
        const statusMsg = isError
          ? `Error: ${resItem.error}`
          : resItem.message || 'Cloned, dependencies installed & Antigravity AI ready';

        progressLogList.innerHTML += `<div style="color:${isError ? '#f87171' : '#4ade80'}">${statusTag} ${proj.name}: ${statusMsg}</div>`;
        progressLogList.scrollTop = progressLogList.scrollHeight;
        await new Promise((r) => setTimeout(r, 50));
      }

      // Provision ~/.gemini/config/ & trigger sync logger
      progressBarFill.style.width = '100%';
      progressStepText.textContent = 'Provisioning ~/.gemini/config/ rules & workspace manifests...';
      await window.electronAPI.setupMachine(allSelected, state.workspace);
      if (window.electronAPI.syncNow) {
        await window.electronAPI.syncNow();
      }

      progressStepText.textContent = 'All selected projects & dependencies set up successfully!';
      progressLogList.innerHTML += `<div style="color:#4ade80; font-weight:bold; margin-top:8px">> Setup complete! ${completedCount} project(s) ready in ~/Projects/</div>`;
      progressLogList.innerHTML += `<div style="color:#60a5fa">> Dependencies installed & .agents rules written for Antigravity AI chat.</div>`;
      btnProgressClose.classList.remove('hidden');

      renderProjects();
    } catch (err) {
      console.error('Setup machine error:', err);
      progressStepText.textContent = '❌ Setup encountered an error.';
      progressLogList.innerHTML += `<div style="color:#f87171">> Error: ${err.message}</div>`;
      btnProgressClose.classList.remove('hidden');
    }
  }
}

function renderInvites(invites = []) {
  const invitesContainer = document.getElementById('invites-list');
  const badge = document.getElementById('invite-badge');

  if (invites.length > 0) {
    badge.textContent = invites.length;
    badge.classList.remove('hidden');

    invitesContainer.innerHTML = invites
      .map(
        (inv) => `
        <div class="project-card">
          <div class="project-details">
            <h4>Shared Project from @${escapeHtml(inv.from_login)}</h4>
            <p>Project: ${escapeHtml(inv.project_slug)} • ${escapeHtml(inv.repo_url)}</p>
          </div>
          <div style="display:flex; gap:8px">
            <button class="btn-primary" onclick="handleInviteAction(${inv.id}, 'accept')">Accept & Sync</button>
            <button class="btn-secondary" onclick="handleInviteAction(${inv.id}, 'decline')">Decline</button>
          </div>
        </div>
      `
      )
      .join('');
  } else {
    badge.classList.add('hidden');
    invitesContainer.innerHTML = '<div class="empty-state">No pending invitations.</div>';
  }
}

async function handleInviteAction(inviteId, action) {
  try {
    const res = await fetch(`${SYNC_SERVER_URL}/invites/${inviteId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${state.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });

    if (res.ok) {
      fetchWorkspace();
    }
  } catch (err) {
    console.error('Failed to update invite:', err);
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
