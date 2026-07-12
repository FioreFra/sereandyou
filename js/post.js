(function () {
  'use strict';

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function mediaHtml(images, altText) {
    if (!images || !images.length) return 'foto outfit';
    return `<img src="${escapeHtml(images[0])}" alt="${escapeHtml(altText)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">`;
  }

  function renderNotFound() {
    document.querySelector('.looks-wrap').innerHTML =
      '<p style="padding:24px 0;font:400 15px \'DM Sans\',sans-serif;color:rgba(0,0,0,.6);">Nessun post disponibile al momento. <a href="index.html">Torna alla home</a>.</p>';
  }

  function renderPost(postId, post, looks) {
    document.title = `${post.nome} — Sere&You`;
    document.getElementById('crumb-current').textContent = post.nome;
    document.getElementById('post-title').textContent = post.nome;
    document.getElementById('post-caption').textContent = post.caption;

    const postLooks = window.SereYouData.looksForPost(looks, postId);
    const ids = Object.keys(postLooks);
    const grid = document.getElementById('looks-grid');
    const countEl = document.getElementById('looks-count');

    countEl.textContent = ids.length ? `${ids.length} look in questo post` : '';

    if (!ids.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;padding:32px;font:400 14px \'DM Sans\',sans-serif;color:rgba(0,0,0,.6);">Nessun look pubblicato per questo post al momento.</p>';
      return;
    }

    grid.innerHTML = ids.map((id) => {
      const look = postLooks[id];
      return `
        <a href="look.html?id=${encodeURIComponent(id)}" class="look-card">
          <div class="look-card__media placeholder-img">
            ${mediaHtml(look.immagini, look.nome)}
          </div>
          <div class="look-card__body">
            <span class="tag">${escapeHtml(look.occasione)}</span>
            <h3 class="look-card__title">${escapeHtml(look.nome)}</h3>
            <span class="link-underline look-card__link">Guarda il look →</span>
          </div>
        </a>`;
    }).join('');
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.SereYouData.loadData().then(({ posts, looks }) => {
      const ids = Object.keys(posts);
      if (!ids.length) {
        renderNotFound();
        return;
      }
      const requestedId = new URLSearchParams(location.search).get('id');
      const postId = (requestedId && posts[requestedId]) ? requestedId : ids[0];
      renderPost(postId, posts[postId], looks);
    });
  });
})();
