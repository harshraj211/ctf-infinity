// Category filter on dashboard
document.addEventListener('DOMContentLoaded', () => {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const grid = document.getElementById('challenge-grid');

  if (filterBtns.length && grid) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const cat = btn.dataset.cat;
        grid.querySelectorAll('.challenge-card').forEach(card => {
          if (cat === 'all' || card.dataset.cat === cat) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }
});
