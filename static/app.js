const $ = (s) => document.querySelector(s);
let csrf = null;
let userEmail = null;
let authMode = 'login';

const inspiration = [
  {title:'Arquitectura imposible', category:'ARQUITECTURA', image:'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=3840&q=80', prompt:'Arquitectura futurista y minimalista, edificio escultórico de hormigón blanco en el desierto, luz dorada de la mañana, fotografía editorial'},
  {title:'Naturaleza etérea', category:'NATURALEZA', image:'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=3840&q=80', prompt:'Lago alpino entre montañas, niebla suave al amanecer, reflejos perfectos, fotografía de paisaje cinematográfica'},
  {title:'Retrato editorial', category:'RETRATO', image:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=3840&q=80', prompt:'Retrato editorial artístico, luz suave lateral, composición elegante, colores cálidos, textura de película analógica'},
  {title:'Mundos abstractos', category:'ARTE DIGITAL', image:'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=3840&q=80', prompt:'Composición abstracta de formas orgánicas, tonos violetas y naranja, iluminación dramática, arte digital contemporáneo'}
];

function showView(view) {
  if (view !== 'discover' && !csrf) { openAuth(); return; }
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === `${view}-view`));
  document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  $('#page-name').textContent = {discover:'Explorar', create:'Crear imagen', library:'Mi biblioteca'}[view];
  $('.sidebar').classList.remove('mobile-open');
  if (view === 'library') loadLibrary();
  history.replaceState(null, '', view === 'discover' ? '/' : `/#${view}`);
}
function openAuth() { $('#auth-modal').hidden = false; $('#auth-email').focus(); }
function closeAuth() { $('#auth-modal').hidden = true; $('#auth-message').textContent = ''; }
function setAuthMode(mode) {
  authMode = mode;
  $('#auth-title').textContent = mode === 'register' ? 'Empieza a imaginar.' : 'Bienvenido de nuevo.';
  $('#auth-subtitle').textContent = mode === 'register' ? 'Crea una cuenta para guardar tu trabajo.' : 'Accede para crear y guardar tus imágenes.';
  $('#auth-submit').textContent = mode === 'register' ? 'Crear cuenta ↗' : 'Iniciar sesión ↗';
  $('#auth-switch').innerHTML = mode === 'register' ? '¿Ya tienes cuenta? <strong>Inicia sesión</strong>' : '¿No tienes cuenta? <strong>Crear cuenta</strong>';
  $('#auth-password').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
  $('#auth-message').textContent = '';
}
async function api(path, options = {}) {
  const headers = {...options.headers};
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (csrf && options.method && options.method !== 'GET') headers['X-CSRF-Token'] = csrf;
  const response = await fetch(path, {...options, headers, credentials:'same-origin'});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'La solicitud no se pudo completar.');
  return data;
}
function setUser(data) {
  csrf = data.csrf;
  userEmail = data.email;
  $('#account-email').textContent = userEmail || '';
  $('#account-btn').textContent = userEmail ? userEmail[0].toUpperCase() : '?';
}
async function loadLibrary() {
  if (!csrf) return;
  try {
    const data = await api('/api/images');
    $('#library-grid').replaceChildren();
    $('#library-count').textContent = `${data.images.length} CREACIONES`;
    $('#library-empty').hidden = data.images.length > 0;
    for (const item of data.images) {
      const card = document.createElement('article'); card.className = 'library-card';
      const img = document.createElement('img'); img.src = `/api/images/${encodeURIComponent(item.id)}/file`; img.alt = item.prompt; img.loading = 'lazy';
      const info = document.createElement('div'); info.className = 'library-info';
      const title = document.createElement('strong'); title.textContent = item.prompt;
      const meta = document.createElement('small'); meta.textContent = `${item.width} × ${item.height} · Seed ${item.seed}`;
      const link = document.createElement('a'); link.href = img.src; link.download = `flux-${item.id}.png`; link.textContent = 'Abrir imagen ↗';
      info.append(title, meta, link); card.append(img, info); $('#library-grid').append(card);
    }
  } catch (error) { $('#library-empty').hidden = false; $('#library-empty').querySelector('p').textContent = error.message; }
}

$('#inspiration-grid').replaceChildren(...inspiration.map((item, index) => {
  const card = document.createElement('button'); card.className = 'inspiration-card'; card.type = 'button';
  const img = document.createElement('img'); img.src = item.image; img.alt = item.title; img.loading = 'lazy';
  const overlay = document.createElement('div'); overlay.className = 'inspiration-overlay';
  const cat = document.createElement('small'); cat.textContent = item.category;
  const title = document.createElement('strong'); title.textContent = item.title;
  const arrow = document.createElement('span'); arrow.textContent = '↗';
  overlay.append(cat, title, arrow); card.append(img, overlay);
  card.addEventListener('click', () => { $('#prompt').value = item.prompt; $('#prompt-count').textContent = `${item.prompt.length} / 2000`; showView('create'); });
  return card;
}));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
['hero-create','side-create','empty-create'].forEach(id => $(`#${id}`).addEventListener('click', () => showView('create')));
$('#menu-toggle').addEventListener('click', () => $('.sidebar').classList.toggle('mobile-open'));
$('#modal-close').addEventListener('click', closeAuth);
$('#auth-modal').addEventListener('click', e => { if (e.target.id === 'auth-modal') closeAuth(); });
$('#auth-switch').addEventListener('click', () => setAuthMode(authMode === 'login' ? 'register' : 'login'));
$('#account-btn').addEventListener('click', () => { if (!csrf) openAuth(); else $('#account-menu').hidden = !$('#account-menu').hidden; });
$('#logout-btn').addEventListener('click', async () => { try { await api('/api/logout', {method:'POST'}); } finally { setUser({email:null, csrf:null}); $('#account-menu').hidden = true; showView('discover'); } });
$('#prompt').addEventListener('input', e => $('#prompt-count').textContent = `${e.target.value.length} / 2000`);
['reference1','reference2'].forEach(id => $(`#${id}`).addEventListener('change', e => $(`#${id}-name`).textContent = e.target.files[0]?.name || 'JPG o PNG'));
$('#auth-form').addEventListener('submit', async e => {
  e.preventDefault(); $('#auth-message').textContent = ''; $('#auth-submit').disabled = true;
  try { const data = await api(`/api/${authMode}`, {method:'POST', body:JSON.stringify({email:$('#auth-email').value, password:$('#auth-password').value})}); setUser(data); $('#auth-form').reset(); closeAuth(); showView(location.hash === '#library' ? 'library' : 'create'); }
  catch (error) { $('#auth-message').textContent = error.message; }
  finally { $('#auth-submit').disabled = false; }
});
$('#generate-form').addEventListener('submit', async e => {
  e.preventDefault(); if (!csrf) { openAuth(); return; }
  const width = Number($('#width').value), height = Number($('#height').value);
  if (width * height > 4194304) { $('#generate-message').textContent = 'La combinación de ancho y alto es demasiado grande.'; return; }
  const form = new FormData(e.target); $('#generate-btn').disabled = true; $('#generate-message').textContent = 'Generando imagen. Esto puede tomar varios minutos…';
  try {
    const data = await api('/api/generate', {method:'POST', body:form});
    const imageUrl = `/api/images/${encodeURIComponent(data.id)}/file`;
    const img = document.createElement('img'); img.src = imageUrl; img.alt = $('#prompt').value;
    $('#result-frame').replaceChildren(img); $('#result-meta').textContent = `${width} × ${height} PX · SEED ${data.seed}`;
    $('#download-link').href = imageUrl; $('#download-link').hidden = false; $('#generate-message').textContent = 'Imagen creada y guardada en tu biblioteca.';
  } catch (error) { $('#generate-message').textContent = error.message; }
  finally { $('#generate-btn').disabled = false; }
});
(async () => { try { setUser(await api('/api/me')); } catch { setUser({email:null,csrf:null}); } const view = location.hash.slice(1); if (['create','library'].includes(view)) showView(view); })();
