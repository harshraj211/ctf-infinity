document.addEventListener('DOMContentLoaded', () => {
  const newBtn = document.getElementById('new-challenge-btn');
  const formCard = document.getElementById('challenge-form');
  const cancelBtn = document.getElementById('cancel-form-btn');
  const formEl = document.getElementById('challenge-form-el');
  const formTitle = document.getElementById('form-title');
  const submitBtn = document.getElementById('form-submit-btn');
  const editIdInput = document.getElementById('edit-id');

  function showForm(editing = false) {
    formCard.style.display = 'block';
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function hideForm() {
    formCard.style.display = 'none';
    formEl.reset();
    formEl.action = '/creator/challenges';
    editIdInput.value = '';
    formTitle.textContent = 'New Challenge';
    submitBtn.textContent = 'Create Challenge';
  }

  if (newBtn) newBtn.addEventListener('click', () => showForm(false));
  if (cancelBtn) cancelBtn.addEventListener('click', hideForm);

  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.dataset;
      document.getElementById('f-title').value = d.title;
      document.getElementById('f-category').value = d.category;
      document.getElementById('f-difficulty').value = d.difficulty;
      document.getElementById('f-points').value = d.points;
      document.getElementById('f-description').value = d.description;
      document.getElementById('f-flag').value = d.flag;
      document.getElementById('f-hint').value = d.hint || '';
      editIdInput.value = d.id;
      formEl.action = `/creator/challenges/${d.id}/edit`;
      formTitle.textContent = 'Edit Challenge';
      submitBtn.textContent = 'Save Changes';
      showForm(true);
    });
  });
});
