/**
 * Share Modal Logic — Share personal projects to GitHub usernames (@username)
 */
let activeShareProject = null;

const modalShare = document.getElementById('modal-share');
const modalProjectName = document.getElementById('modal-share-project-name');
const shareInput = document.getElementById('share-username-input');
const btnShareCancel = document.getElementById('btn-share-cancel');
const btnShareSend = document.getElementById('btn-share-send');

function openShareModal(projectSlug, repoUrl) {
  activeShareProject = { slug: projectSlug, repo_url: repoUrl };
  modalProjectName.textContent = `Project: ${projectSlug}`;
  shareInput.value = '';
  modalShare.classList.remove('hidden');
}

function closeShareModal() {
  activeShareProject = null;
  modalShare.classList.add('hidden');
}

btnShareCancel.addEventListener('click', closeShareModal);

btnShareSend.addEventListener('click', async () => {
  const targetUsername = shareInput.value.trim().replace(/^@/, '');

  if (!targetUsername) {
    alert('Please enter a valid GitHub username.');
    return;
  }

  if (!activeShareProject) return;

  try {
    const res = await fetch(`${SYNC_SERVER_URL}/invites`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to_login: targetUsername,
        project_slug: activeShareProject.slug,
        repo_url: activeShareProject.repo_url,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      alert(`🎉 Invitation sent to @${targetUsername}!`);
      closeShareModal();
    } else {
      alert(`Error: ${data.error || 'Failed to send invitation'}`);
    }
  } catch (err) {
    console.error('Failed to send share invite:', err);
    alert('Failed to connect to sync server.');
  }
});
