import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react';
import { ApiError, ImageRecord, request, Session } from './api';
import { navigate, Route, useRoute } from './router';

const inspiration = [
  { title: 'Arquitectura imposible', category: 'ARQUITECTURA', image: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=3840&q=80', prompt: 'Arquitectura futurista y minimalista, edificio escultórico de hormigón blanco en el desierto, luz dorada de la mañana, fotografía editorial' },
  { title: 'Naturaleza etérea', category: 'NATURALEZA', image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=3840&q=80', prompt: 'Lago alpino entre montañas, niebla suave al amanecer, reflejos perfectos, fotografía de paisaje cinematográfica' },
  { title: 'Retrato editorial', category: 'RETRATO', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=3840&q=80', prompt: 'Retrato editorial artístico, luz suave lateral, composición elegante, colores cálidos, textura de película analógica' },
  { title: 'Mundos abstractos', category: 'ARTE DIGITAL', image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=3840&q=80', prompt: 'Composición abstracta de formas orgánicas, tonos violetas y naranja, iluminación dramática, arte digital contemporáneo' }
];

function ProtectedRoute({ session, loading, children }: { session: Session | null; loading: boolean; children: ReactNode }) {
  useEffect(() => { if (!loading && !session) navigate('/login'); }, [session, loading]);
  if (loading) return <div className="route-loading">Comprobando sesión…</div>;
  return session ? <>{children}</> : null;
}

function Landing({ onCreate }: { onCreate: (prompt?: string) => void }) {
  return <>
    <div className="hero"><div className="hero-content"><div className="eyebrow"><span className="spark">✦</span> IMAGINACIÓN SIN LÍMITES <span className="eyebrow-line" /></div><h1>Una nueva forma<br />de <em>imaginar.</em></h1><p>De una idea a una imagen extraordinaria. Crea, explora y da vida a tu visión con FLUX.2-pro.</p><button className="primary-btn" onClick={() => onCreate()}>Empezar a crear <span>↗</span></button><div className="hero-foot"><span>✧</span> POTENCIADO POR FLUX.2-PRO <i /> GENERACIÓN EN ALTA RESOLUCIÓN</div></div><div className="hero-art" aria-hidden="true"><div className="art-orb" /><span className="art-label">THE ART OF POSSIBILITY<br /><b>01 / ∞</b></span></div></div>
    <div className="section-head"><div><span className="overline">INSPIRACIÓN</span><h2>Explora posibilidades <span>↗</span></h2><p>Ideas para comenzar tu próxima creación.</p></div><span className="count">04 IMÁGENES</span></div>
    <div className="inspiration-grid">{inspiration.map((item) => <button className="inspiration-card" key={item.title} onClick={() => onCreate(item.prompt)}><img src={item.image} alt={item.title} loading="lazy" /><div className="inspiration-overlay"><small>{item.category}</small><strong>{item.title}</strong><span>↗</span></div></button>)}</div>
    <div className="feature-strip"><div><span>◇</span><strong>Alta resolución</strong><small>Hasta 2048 × 2048 px</small></div><div><span>✳</span><strong>Control creativo</strong><small>Prompts, dimensiones y seed</small></div><div><span>▣</span><strong>Referencias visuales</strong><small>Guía el resultado con tus imágenes</small></div><div><span>♧</span><strong>Biblioteca privada</strong><small>Tus creaciones, solo para ti</small></div></div>
  </>;
}

function AuthPage({ mode, onSuccess }: { mode: 'login' | 'register'; onSuccess: (session: Session) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const session = await request<Session>(`/api/${mode}`, { method: 'POST', body: JSON.stringify({ email, password }) });
      onSuccess(session);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error de acceso.'); }
    finally { setBusy(false); }
  }
  return <div className="auth-page"><div className="auth-card"><div className="auth-mark">F<span>✦</span></div><span className="overline">TU ESPACIO CREATIVO</span><h2>{mode === 'register' ? 'Empieza a imaginar.' : 'Bienvenido de nuevo.'}</h2><p>{mode === 'register' ? 'Crea una cuenta para guardar tu trabajo.' : 'Accede para crear y guardar tus imágenes.'}</p><form onSubmit={submit}><label htmlFor="auth-email">Correo electrónico</label><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" /><label htmlFor="auth-password">Contraseña</label><input id="auth-password" type="password" minLength={12} maxLength={128} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 12 caracteres" /><button className="generate-btn" disabled={busy}>{busy ? 'Procesando…' : mode === 'register' ? 'Crear cuenta ↗' : 'Iniciar sesión ↗'}</button><p className="form-message" role="alert">{message}</p></form><button className="auth-switch" onClick={() => navigate(mode === 'register' ? '/login' : '/register')}>{mode === 'register' ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Crear cuenta'}</button></div></div>;
}

function CreatePage({ session, initialPrompt }: { session: Session; initialPrompt: string }) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [seed, setSeed] = useState('');
  const [reference1, setReference1] = useState<File | null>(null);
  const [reference2, setReference2] = useState<File | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [resultSeed, setResultSeed] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { if (initialPrompt) setPrompt(initialPrompt); }, [initialPrompt]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (width * height > 4_194_304) { setMessage('La combinación de dimensiones es demasiado grande.'); return; }
    const form = new FormData(); form.set('prompt', prompt); form.set('width', String(width)); form.set('height', String(height)); form.set('seed', seed);
    if (reference1) form.set('reference1', reference1); if (reference2) form.set('reference2', reference2);
    setBusy(true); setMessage('Generando imagen. Esto puede tomar varios minutos…');
    try {
      const result = await request<{ id: string; seed: number }>('/api/generate', { method: 'POST', body: form }, session.csrf);
      setImageId(result.id); setResultSeed(result.seed); setMessage('Imagen creada y guardada en tu biblioteca.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error de generación.'); }
    finally { setBusy(false); }
  }
  const imageUrl = imageId ? `/api/images/${encodeURIComponent(imageId)}/file` : '';
  return <><div className="page-heading"><div><span className="overline">ESTUDIO DE CREACIÓN</span><h1>Hazlo <em>real.</em></h1><p>Describe tu idea. Nosotros la convertimos en imagen.</p></div><span className="heading-index">01 — CREATE</span></div><div className="workspace-grid"><form className="form-panel" onSubmit={submit}><div className="panel-top"><span>✳</span><strong>Nueva generación</strong><small>FLUX.2-PRO</small></div><label htmlFor="prompt">Tu visión <span className="required">*</span></label><textarea id="prompt" maxLength={2000} required placeholder="Una arquitectura brutalista de mármol rosa entre nubes al atardecer, fotografía editorial, luz cinematográfica..." value={prompt} onChange={e => setPrompt(e.target.value)} /><div className="field-hint"><span>Sé específico con estilo, luz y composición.</span><span>{prompt.length} / 2000</span></div><div className="divider" /><div className="two-fields"><div><label htmlFor="width">Ancho</label><select id="width" value={width} onChange={e => setWidth(Number(e.target.value))}>{[1024, 1536, 2048, 768, 512].map(x => <option key={x} value={x}>{x} px</option>)}</select></div><div><label htmlFor="height">Alto</label><select id="height" value={height} onChange={e => setHeight(Number(e.target.value))}>{[1024, 1536, 2048, 768, 512].map(x => <option key={x} value={x}>{x} px</option>)}</select></div></div><label htmlFor="seed">Seed <span className="optional">OPCIONAL</span></label><input id="seed" inputMode="numeric" placeholder="Aleatoria si se deja vacío" value={seed} onChange={e => setSeed(e.target.value)} /><p className="input-note">Usa una seed para recrear una imagen similar.</p><div className="divider" /><label>Imágenes de referencia <span className="optional">OPCIONAL · MÁX. 6 MB CADA UNA</span></label><div className="two-fields uploads"><label className="upload" htmlFor="reference1"><span>＋</span><strong>Referencia 1</strong><small>{reference1?.name || 'JPG o PNG'}</small><input id="reference1" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setReference1(e.target.files?.[0] || null)} /></label><label className="upload" htmlFor="reference2"><span>＋</span><strong>Referencia 2</strong><small>{reference2?.name || 'JPG o PNG'}</small><input id="reference2" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setReference2(e.target.files?.[0] || null)} /></label></div><button className="generate-btn" disabled={busy}><span>✦</span> {busy ? 'Generando…' : 'Generar imagen'} <span>↗</span></button><p className="form-message" role="status">{message}</p></form><div className="result-panel"><div className="result-heading"><span>VISTA PREVIA</span><span>RESULTADO / 01</span></div><div className="result-frame">{imageId ? <img src={imageUrl} alt="Imagen generada" /> : <div className="empty-result"><div className="empty-symbol">✳</div><h3>Tu próxima obra<br />comienza aquí.</h3><p>Configura tu idea y presiona generar para ver el resultado.</p></div>}</div><div className="result-bottom"><span>{imageId ? `${width} × ${height} PX · SEED ${resultSeed}` : 'ESPERANDO TU IDEA'}</span>{imageId && <a href={imageUrl} download={`flux-${imageId}.png`}>Descargar imagen ↓</a>}</div></div></div></>;
}

function LibraryPage({ session }: { session: Session }) {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [message, setMessage] = useState('Cargando biblioteca…');
  useEffect(() => { request<{ images: ImageRecord[] }>('/api/images').then(data => { setImages(data.images); setMessage(''); }).catch(error => setMessage(error.message)); }, [session.email]);
  return <><div className="page-heading"><div><span className="overline">TU COLECCIÓN</span><h1>Mi <em>biblioteca.</em></h1><p>Un archivo privado de tus ideas hechas imagen.</p></div><span className="heading-index">{images.length} CREACIONES</span></div><div className="library-grid">{images.map(item => <article className="library-card" key={item.id}><img src={`/api/images/${encodeURIComponent(item.id)}/file`} alt={item.prompt} loading="lazy" /><div className="library-info"><strong>{item.prompt}</strong><small>{item.width} × {item.height} · Seed {item.seed}</small><a href={`/api/images/${encodeURIComponent(item.id)}/file`} download={`flux-${item.id}.png`}>Abrir imagen ↗</a></div></article>)}</div>{!images.length && <div className="library-empty"><span>▦</span><h2>Un lienzo en blanco.</h2><p>{message || 'Tus generaciones aparecerán aquí cuando crees la primera.'}</p><button className="primary-btn" onClick={() => navigate('/app/create')}>Crear mi primera imagen ↗</button></div>}</>;
}

export function App() {
  const route = useRoute();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const refresh = useCallback(async () => {
    try { setSession(await request<Session>('/api/me')); } catch { setSession(null); } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!loading && session && (route === '/login' || route === '/register')) navigate('/app/create');
  }, [loading, session, route]);
  function goCreate(value = '') { setPrompt(value); navigate('/app/create'); setMenuOpen(false); }
  async function logout() {
    if (session) { try { await request('/api/logout', { method: 'POST' }, session.csrf); } catch (error) { if (!(error instanceof ApiError && error.status === 401)) return; } }
    setSession(null); setAccountOpen(false); navigate('/');
  }
  const nav = (path: Route) => { navigate(path); setMenuOpen(false); };
  return <div className="shell"><aside className={`sidebar ${menuOpen ? 'mobile-open' : ''}`}><a className="brand" href="/" onClick={e => { e.preventDefault(); nav('/'); }}><span className="brand-icon">F<span>✦</span></span><span>FLUX<span className="brand-light">STUDIO</span><small>CREATIVE WORKSPACE</small></span></a><div className="side-label">WORKSPACE</div><nav aria-label="Principal"><button className={`nav-link ${route === '/' ? 'active' : ''}`} onClick={() => nav('/')}><span>◈</span> Explorar</button><button className={`nav-link ${route === '/app/create' ? 'active' : ''}`} onClick={() => goCreate()}><span>✳</span> Crear imagen</button><button className={`nav-link ${route === '/app/library' ? 'active' : ''}`} onClick={() => nav('/app/library')}><span>▦</span> Mi biblioteca</button></nav><div className="sidebar-bottom"><div className="side-card"><span className="side-card-icon">✦</span><strong>Tu espacio creativo</strong><p>Genera imágenes con FLUX.2-pro y guarda tus resultados en una biblioteca privada.</p><button onClick={() => goCreate()}>Comenzar a crear <span>↗</span></button></div><div className="side-footer">FLUX STUDIO <span>© 2026</span></div></div></aside><div className="content-wrap"><header className="topbar"><button className="mobile-brand" onClick={() => setMenuOpen(!menuOpen)}>☰ <strong>FLUX STUDIO</strong></button><div className="breadcrumb">Workspace <span>/</span> <strong>{route === '/app/create' ? 'Crear imagen' : route === '/app/library' ? 'Mi biblioteca' : route === '/' ? 'Explorar' : 'Cuenta'}</strong></div><div className="top-actions"><span className="status-dot" /><span className="status-label">CREATIVE MODE</span><button className="avatar" aria-label="Cuenta" onClick={() => session ? setAccountOpen(!accountOpen) : nav('/login')}>{session?.email[0].toUpperCase() || '?'}</button></div></header><main>{route === '/' && <Landing onCreate={goCreate} />}{(route === '/login' || route === '/register') && <AuthPage mode={route === '/login' ? 'login' : 'register'} onSuccess={setSession} />}{route === '/app/create' && <ProtectedRoute session={session} loading={loading}><CreatePage session={session!} initialPrompt={prompt} /></ProtectedRoute>}{route === '/app/library' && <ProtectedRoute session={session} loading={loading}><LibraryPage session={session!} /></ProtectedRoute>}</main><footer className="main-footer"><span>FLUX STUDIO <b>✦</b> DALE FORMA A TUS IDEAS</span><span>CREADO PARA IMAGINAR MÁS ALLÁ</span></footer></div>{accountOpen && session && <div className="account-menu"><span>{session.email}</span><button onClick={logout}>Cerrar sesión ↗</button></div>}</div>;
}
