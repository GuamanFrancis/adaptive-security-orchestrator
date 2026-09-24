import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, CatalogItem, GenerateResult, ImageRecord, request, Session } from './api';
import { prepareReference, urlToFile } from './image';
import { navigate, Route, useRoute } from './router';

// Presets de plataforma y resolución
interface AspectPreset {
  name: string;
  ratio: string;
  width: number;
  height: number;
  icon: string;
}

const ASPECT_PRESETS: AspectPreset[] = [
  { name: 'Cuadrado', ratio: '1:1', width: 1024, height: 1024, icon: '■' },
  { name: 'Retrato IG', ratio: '4:5', width: 1024, height: 1280, icon: '▯' },
  { name: 'Story / Reel', ratio: '9:16', width: 1024, height: 1792, icon: '📱' },
  { name: 'YouTube / Cine', ratio: '16:9', width: 1792, height: 1024, icon: '🖥' },
  { name: 'X / Twitter', ratio: '16:9', width: 1536, height: 864, icon: '🖼' },
  { name: 'Wallpaper', ratio: '9:19.5', width: 1024, height: 1984, icon: '📲' },
  { name: 'Cuadrado HD', ratio: '1:1 HD', width: 1536, height: 1536, icon: '🌟' },
  { name: '4K Master', ratio: 'Ultra HD', width: 2048, height: 2048, icon: '💎' },
];

// Opciones del Director Creativo
const SCENE_OPTIONS = [
  { label: 'Automático / Ninguno', value: '' },
  { label: 'Cafetería Escandinava', value: 'in an aesthetic scandinavian coffee shop, natural window light, candid lifestyle moment' },
  { label: 'Callejón Neón Shinjuku', value: 'in a rain-slicked Tokyo neon alley at night, glowing vertical signs, cinematic reflections' },
  { label: 'Estudio Editorial Minimalista', value: 'in a minimalist high-end photo studio, cyclorama backdrop, soft diffused rim light' },
  { label: 'Villa Desértica Brutalista', value: 'minimalist brutalist concrete architecture in white desert, turquoise pool reflections' },
  { label: 'Terraza al Atardecer (Golden Hour)', value: 'on an open city rooftop terrace during golden hour, warm sunset backlighting' },
  { label: 'Bosque Etéreo con Niebla', value: 'in an ancient misty alpine forest, sunbeams piercing through tall pines, ethereal mood' },
  { label: 'Estación Espacial Futurista', value: 'inside a sleek futuristic orbital station, panoramic view of an azure planet below' },
  { label: 'Restaurante Exclusivo', value: 'in an elegant fine-dining restaurant, soft warm ambient lighting, candid luxury vibe' },
];

const CAMERA_OPTIONS = [
  { label: 'Automático / Ninguno', value: '' },
  { label: '85mm f/1.4 Retrato Editorial (Bokeh Suave)', value: 'captured on 85mm f/1.4 lens, shallow depth of field, creamy bokeh, tack sharp subject' },
  { label: 'Móvil Realista Casual (Influencer Lifestyle)', value: 'phone camera look, natural exposure, subtle imperfections, realistic authentic lifestyle' },
  { label: 'Cine 35mm Anamórfico (Look Película)', value: '35mm anamorphic cinema lens, subtle horizontal lens flares, 35mm film grain texture' },
  { label: 'Gran Angular 24mm (Espacio & Arquitectura)', value: '24mm wide angle lens, dramatic perspective, architectural digest composition' },
  { label: 'Hasselblad H6D-100c Formato Medio', value: 'medium format Hasselblad photography, supreme dynamic range, micro-detail clarity' },
];

const LIGHTING_OPTIONS = [
  { label: 'Automático / Ninguno', value: '' },
  { label: 'Luz Natural de Ventana', value: 'soft natural window light, organic shadows, true-to-life color fidelity' },
  { label: 'Golden Hour (Atardecer Cálido)', value: 'golden hour sunlight, warm amber rim highlights, cinematic glow' },
  { label: 'Neón Cyberpunk Bicolor', value: 'cyberpunk dual lighting with electric cyan and magenta accents, deep shadows' },
  { label: 'Claroscuro Dramático (Studio)', value: 'dramatic chiaroscuro lighting, deep rich blacks, sculptural high-contrast highlights' },
  { label: 'Luz Difusa Nublada', value: 'overcast soft diffused daylight, gentle skin tones, no harsh specular glare' },
];

const VIBE_OPTIONS = [
  { label: 'Automático / Ninguno', value: '' },
  { label: 'Candid Auténtico (Espontáneo)', value: 'candid unposed shot, natural micro-expressions, authentic emotion' },
  { label: 'Influencer Casual Chic', value: 'influencer casual chic aesthetic, effortless elegance, modern social media look' },
  { label: 'Moda Editorial Alta Costura', value: 'vogue high-fashion editorial, avant-garde elegance, sophisticated composition' },
  { label: 'Cyber Noir Tecnológico', value: 'cyber noir atmosphere, moody introspection, technological realism' },
];

const OUTFIT_OPTIONS = [
  { label: 'Automático / Mantener Guía', value: '' },
  { label: 'Streetwear Moderno Oversize', value: 'wearing trendy oversized streetwear hoodie and designer cargo pants' },
  { label: 'Smart Casual Oficina Elegante', value: 'wearing tailored blazer, crisp white shirt, minimalist accessories' },
  { label: 'Date Night / Gala Sofisticada', value: 'wearing elegant evening silk attire, discreet luxury jewelry' },
  { label: 'Sport / Gym Fit Técnico', value: 'wearing sleek premium athletic performance activewear' },
  { label: 'Abrigo Otoñal en Capas', value: 'wearing warm layered wool overcoat with cashmere scarf' },
];

const REALISM_TOKENS = 'photorealistic but believable, natural skin texture with subtle pores, realistic hair strands, subtle film grain, natural white balance, no plastic skin, no extreme beauty filter';
const IDENTITY_TOKENS = 'same person, consistent facial identity, consistent hairstyle and eye color, consistent body proportions';
const NEGATIVE_TOKENS = 'avoid: deformed hands, extra fingers, fused fingers, duplicate face, misaligned eyes, distorted teeth, unnatural anatomy, plastic skin, heavy HDR, glitch, watermark';

function ProtectedRoute({ session, loading, children }: { session: Session | null; loading: boolean; children: ReactNode }) {
  useEffect(() => {
    if (!loading && !session) navigate('/login');
  }, [session, loading]);
  if (loading) return <div className="route-loading">Verificando sesión creativa…</div>;
  return session ? <>{children}</> : null;
}

// ============================================================================
// LANDING & 4K INSPIRATION CATALOG
// ============================================================================

function Landing({
  onCreate,
  onInspect,
  onEdit,
}: {
  onCreate: (prompt?: string, width?: number, height?: number) => void;
  onInspect: (item: CatalogItem) => void;
  onEdit: (url: string, title?: string) => void;
}) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [copyToast, setCopyToast] = useState('');

  useEffect(() => {
    request<{ catalog: CatalogItem[] }>('/api/catalog')
      .then(res => setCatalog(res.catalog || []))
      .catch(() => {});
  }, []);

  const categories = ['TODOS', 'RETRATO', 'ARQUITECTURA', 'CINEMATOGRAFÍA', 'NATURALEZA', 'ARTE DIGITAL', 'LIFESTYLE'];

  const filteredCatalog = catalog.filter(item => {
    const matchesCat = selectedCategory === 'TODOS' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleCopy = (prompt: string, title: string) => {
    navigator.clipboard.writeText(prompt);
    setCopyToast(`¡Prompt de "${title}" copiado al portapapeles!`);
    setTimeout(() => setCopyToast(''), 3000);
  };

  return (
    <>
      <div className="hero">
        <div className="hero-content">
          <div className="eyebrow">
            <span className="spark">✦</span> FLUX.2-PRO NEXT-GEN AI SUITE <span className="spark">✦</span>
          </div>
          <h1>
            Imagina sin límites.<br />
            Crea en <em>Ultra HD 4K.</em>
          </h1>
          <p>
            Estudio privado de inteligencia artificial para generación, coherencia de identidad (Identity Pack) y transferencia precisa de pose y vestuario. Máxima resolución sin concesiones.
          </p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => onCreate()}>
              <span>✦</span> Abrir Estudio Creativo <span>↗</span>
            </button>
            <button className="secondary-btn" onClick={() => navigate('/catalog')}>
              Explorar Catálogo 4K
            </button>
          </div>
          <div className="hero-foot">
            <span>● FLUX.2-PRO ENGINE</span>
            <i />
            <span>HASTA 2048×2048 PX</span>
            <i />
            <span>REFERENCIAS MULTI-IMAGEN</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orb" />
        </div>
      </div>

      <div className="feature-strip">
        <div className="feature-item">
          <span className="feature-icon">💎</span>
          <strong>Ultra HD & 4K Nativo</strong>
          <small>Resoluciones desde 1:1 hasta 16:9 y ultra panorámico con FLUX.2-pro.</small>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🧩</span>
          <strong>Identity Pack (6 Fotos)</strong>
          <small>Combina múltiples referencias en un collage de identidad para coherencia facial.</small>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🧷</span>
          <strong>Copia de Pose & Outfit</strong>
          <small>Guía el modelo con imágenes de referencia y sliders de fidelidad de pose y ropa.</small>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🔒</span>
          <strong>Privacidad Absoluta</strong>
          <small>Tus creaciones se guardan en tu biblioteca privada con seguridad bancaria.</small>
        </div>
      </div>

      <div className="section-head">
        <div>
          <span className="overline">COLECCIÓN MAESTRA 4K</span>
          <h2>Catálogo de Inspiración Profesional</h2>
          <p>Explora prompts de producción en alta resolución para potenciar tu visión creativa.</p>
        </div>
        {copyToast && <div className="side-card-badge">{copyToast}</div>}
      </div>

      <div className="catalog-toolbar">
        <div className="category-chips">
          {categories.map(cat => (
            <button
              key={cat}
              className={`chip-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="catalog-search">
          <span className="catalog-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por estilo, luz o temática..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="catalog-grid">
        {filteredCatalog.map(item => (
          <article className="catalog-card" key={item.id}>
            <div className="catalog-media">
              <img src={item.image} alt={item.title} loading="lazy" />
              <div className="catalog-badges">
                <span className="badge-4k">4K UHD</span>
                <span className="badge-ratio">{item.aspectRatio}</span>
              </div>
            </div>
            <div className="catalog-body">
              <span className="catalog-category">{item.category}</span>
              <h3 className="catalog-title">{item.title}</h3>
              <p className="catalog-prompt">{item.prompt}</p>
              <div className="catalog-meta">
                <button
                  className="card-action-btn"
                  onClick={() => onCreate(item.prompt, item.width, item.height)}
                  title="Cargar prompt y dimensiones en el Estudio"
                >
                  ⚡ Usar en Estudio
                </button>
                <button
                  className="card-ghost-btn"
                  onClick={() => handleCopy(item.prompt, item.title)}
                  title="Copiar prompt al portapapeles"
                >
                  📋 Copiar
                </button>
                <button
                  className="card-ghost-btn"
                  onClick={() => onEdit(item.image, item.title)}
                  title="Editar en Editor Pro"
                >
                  🎨 Editar
                </button>
                <button
                  className="card-ghost-btn"
                  onClick={() => onInspect(item)}
                  title="Ver imagen en 4K y detalles técnicos"
                >
                  🔍 Ver 4K
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

// ============================================================================
// LIGHTBOX MODAL FOR 4K INSPECTION
// ============================================================================

function LightboxModal({
  item,
  onClose,
  onUseInStudio,
  onEdit,
}: {
  item: CatalogItem;
  onClose: () => void;
  onUseInStudio: (prompt: string, width: number, height: number) => void;
  onEdit: (url: string, title?: string) => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          ✕
        </button>
        <div className="modal-preview-col">
          <img src={item.image} alt={item.title} />
        </div>
        <div className="modal-details-col">
          <div>
            <span className="overline">{item.category} · 4K ULTRA HD</span>
            <h2>{item.title}</h2>
          </div>
          <div className="modal-prompt-box">
            <strong>Prompt Maestro:</strong>
            <p style={{ marginTop: '6px' }}>{item.prompt}</p>
          </div>
          <div className="modal-specs-table">
            <div className="spec-cell">
              <strong>Resolución Nativa</strong>
              <span>{item.width} × {item.height} px ({item.aspectRatio})</span>
            </div>
            <div className="spec-cell">
              <strong>Cámara & Lente</strong>
              <span>{item.camera || '85mm f/1.4'}</span>
            </div>
            <div className="spec-cell">
              <strong>Iluminación</strong>
              <span>{item.lighting || 'Cinemática'}</span>
            </div>
            <div className="spec-cell">
              <strong>Modelo AI</strong>
              <span>FLUX.2-pro (Microsoft Foundry)</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', flexWrap: 'wrap' }}>
            <button
              className="primary-btn"
              style={{ flex: 1 }}
              onClick={() => {
                onUseInStudio(item.prompt, item.width, item.height);
                onClose();
              }}
            >
              <span>⚡</span> Cargar en Estudio
            </button>
            <button
              className="secondary-btn"
              onClick={() => {
                onEdit(item.image, item.title);
                onClose();
              }}
            >
              🎨 Editar Imagen
            </button>
            <button
              className="secondary-btn"
              onClick={() => {
                navigator.clipboard.writeText(item.prompt);
              }}
            >
              📋 Copiar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CREATE STUDIO PAGE
// ============================================================================

function CreatePage({
  session,
  initialPrompt,
  initialWidth,
  initialHeight,
  initialRef1,
  initialRef2,
  onEdit,
}: {
  session: Session;
  initialPrompt: string;
  initialWidth?: number;
  initialHeight?: number;
  initialRef1?: File | null;
  initialRef2?: File | null;
  onEdit?: (url: string, prompt?: string) => void;
}) {
  const [mode, setMode] = useState<'t2i' | 'copy_pose_outfit' | 'identity_pack'>('t2i');
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [width, setWidth] = useState(initialWidth || 1024);
  const [height, setHeight] = useState(initialHeight || 1024);
  const [seed, setSeed] = useState('');
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [safetyTolerance, setSafetyTolerance] = useState(2);

  // Sliders de fidelidad para Pose & Outfit Copy
  const [poseFidelity, setPoseFidelity] = useState(85);
  const [outfitFidelity, setOutfitFidelity] = useState(85);

  // Director Creativo State
  const [directorOpen, setDirectorOpen] = useState(false);
  const [sceneKey, setSceneKey] = useState('');
  const [cameraKey, setCameraKey] = useState('');
  const [lightingKey, setLightingKey] = useState('');
  const [vibeKey, setVibeKey] = useState('');
  const [outfitKey, setOutfitKey] = useState('');
  const [lockIdentity, setLockIdentity] = useState(true);
  const [realismCore, setRealismCore] = useState(true);
  const [antiDefects, setAntiDefects] = useState(true);

  // Referencias de imagen
  const [identityFiles, setIdentityFiles] = useState<(File | null)[]>([null, null, null, null, null, null]);
  const [guideFile, setGuideFile] = useState<File | null>(null);
  const [packLayout, setPackLayout] = useState<'2x3' | '3x2'>('2x3');

  // Resultado
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [statusType, setStatusType] = useState<'info' | 'error' | 'success'>('info');

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    if (initialWidth) setWidth(initialWidth);
    if (initialHeight) setHeight(initialHeight);
  }, [initialWidth, initialHeight]);

  useEffect(() => {
    if (initialRef1) {
      setIdentityFiles(prev => {
        const next = [...prev];
        next[0] = initialRef1;
        return next;
      });
    }
    if (initialRef2) {
      setGuideFile(initialRef2);
    }
  }, [initialRef1, initialRef2]);

  // Selección de Aspect Ratio Preset
  const handlePresetSelect = (preset: AspectPreset) => {
    setWidth(preset.width);
    setHeight(preset.height);
  };

  // Generador de Prompt con el Director
  const handleBuildPrompt = () => {
    const parts: string[] = [];
    if (prompt.trim()) parts.push(prompt.trim());
    if (sceneKey) parts.push(sceneKey);
    if (vibeKey) parts.push(vibeKey);
    if (cameraKey) parts.push(cameraKey);
    if (lightingKey) parts.push(lightingKey);
    if (outfitKey) parts.push(outfitKey);

    if (mode === 'copy_pose_outfit') {
      parts.push('use the guide image as strict reference for pose and outfit');
      if (poseFidelity >= 80) parts.push('STRICT pose match, replicate limb placement precisely');
      else if (poseFidelity >= 50) parts.push('strong pose match, keep posture very close to guide');
      if (outfitFidelity >= 80) parts.push('STRICT outfit match, replicate clothing and silhouette precisely');
      else if (outfitFidelity >= 50) parts.push('strong outfit match, keep clothing colors close to guide');
    }

    if (realismCore) parts.push(REALISM_TOKENS);
    if (lockIdentity) parts.push(IDENTITY_TOKENS);
    if (antiDefects) parts.push(NEGATIVE_TOKENS);

    const generated = parts.filter(Boolean).join('. ');
    setPrompt(generated);
    setMessage('¡Prompt enriquecido con los parámetros del Director Creativo!');
    setStatusType('success');
  };

  // Seed aleatorio
  const handleRandomSeed = () => {
    setSeed(String(Math.floor(Math.random() * 2147483647) + 1));
  };

  // Manejo de carga de archivos en Identity Pack
  const handleFileChange = (index: number, file: File | null) => {
    setIdentityFiles(prev => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  };

  // Enviar formulario de generación
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!prompt.trim()) {
      setMessage('Por favor, escribe un prompt para generar la imagen.');
      setStatusType('error');
      return;
    }
    if (width * height > 4_194_304) {
      setMessage('Las dimensiones elegidas superan el límite de 4.2 megapíxeles.');
      setStatusType('error');
      return;
    }

    setBusy(true);
    setMessage('Preparando y optimizando referencias de alta calidad…');
    setStatusType('info');

    try {
      const form = new FormData();
      form.set('prompt', prompt);
      form.set('width', String(width));
      form.set('height', String(height));
      form.set('seed', seed);
      form.set('format', format);
      form.set('safety_tolerance', String(safetyTolerance));
      form.set('mode', mode);
      form.set('layout', packLayout);

      // Adjuntar referencias de identidad
      for (let i = 0; i < identityFiles.length; i++) {
        const f = identityFiles[i];
        if (f) {
          const prep = await prepareReference(f);
          form.set(`reference${i + 1}`, prep);
        }
      }

      // Adjuntar imagen guía si aplica
      if (guideFile) {
        const prepGuide = await prepareReference(guideFile);
        form.set('guide_image', prepGuide);
      }

      setMessage('Conectando con Microsoft Foundry (FLUX.2-pro). Renderizando…');
      const res = await request<GenerateResult>('/api/generate', { method: 'POST', body: form }, session.csrf);

      setResult(res);
      setMessage(`¡Imagen generada con éxito! Guardada en tu biblioteca.`);
      setStatusType('success');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error inesperado durante la generación.');
      setStatusType('error');
    } finally {
      setBusy(false);
    }
  };

  // Reutilizar resultado como Referencia 1
  const handleReuseAsRef1 = async () => {
    if (!result) return;
    try {
      const file = await urlToFile(result.url, `ref1_${result.id}.png`);
      handleFileChange(0, file);
      setMessage('Imagen enviada a la Referencia 1 para iterar.');
      setStatusType('success');
    } catch {
      setMessage('No se pudo cargar la imagen como referencia.');
      setStatusType('error');
    }
  };

  // Reutilizar resultado como Imagen Guía
  const handleReuseAsGuide = async () => {
    if (!result) return;
    try {
      const file = await urlToFile(result.url, `guide_${result.id}.png`);
      setGuideFile(file);
      setMode('copy_pose_outfit');
      setMessage('Imagen configurada como Guía de Pose & Outfit.');
      setStatusType('success');
    } catch {
      setMessage('No se pudo cargar la imagen como guía.');
      setStatusType('error');
    }
  };

  // Copiar Base64
  const handleCopyBase64 = () => {
    if (result?.b64_json) {
      navigator.clipboard.writeText(result.b64_json);
      setMessage('Base64 copiado al portapapeles.');
      setStatusType('success');
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="overline">ESTUDIO DE CREACIÓN IA</span>
          <h1>
            Flux Studio <em>Pro.</em>
          </h1>
          <p>Control profesional de prompts, resolución, identidad facial y transferencia de poses con FLUX.2-pro.</p>
        </div>
        <div className="result-specs">
          <span>{width}×{height} PX</span>
          <span>{format.toUpperCase()}</span>
          <span>SAFETY {safetyTolerance}</span>
        </div>
      </div>

      <div className="workspace-grid">
        {/* PANEL DE CONTROL / FORMULARIO */}
        <form className="form-panel" onSubmit={handleSubmit}>
          {/* SELECTOR DE MODO */}
          <div className="mode-tabs">
            <button
              type="button"
              className={`mode-tab ${mode === 't2i' ? 'active' : ''}`}
              onClick={() => setMode('t2i')}
            >
              <span>✨ Texto a Imagen</span>
              <small style={{ fontSize: '9px', opacity: 0.8 }}>Generación pura</small>
            </button>
            <button
              type="button"
              className={`mode-tab ${mode === 'copy_pose_outfit' ? 'active' : ''}`}
              onClick={() => setMode('copy_pose_outfit')}
            >
              <span>🧷 Copia Pose & Outfit</span>
              <small style={{ fontSize: '9px', opacity: 0.8 }}>Guía I2I</small>
            </button>
            <button
              type="button"
              className={`mode-tab ${mode === 'identity_pack' ? 'active' : ''}`}
              onClick={() => setMode('identity_pack')}
            >
              <span>🧩 Identity Pack</span>
              <small style={{ fontSize: '9px', opacity: 0.8 }}>Hasta 6 fotos</small>
            </button>
          </div>

          {/* PROMPT PRINCIPAL */}
          <label htmlFor="prompt">
            <span>Visión Creativa</span>
            <span className="label-hint">FLUX.2-PRO ULTRA</span>
          </label>
          <textarea
            id="prompt"
            maxLength={2000}
            required
            placeholder="Describe con detalle la escena, iluminación, sujeto, emociones y texturas..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />
          <div className="field-hint">
            <span>Sé específico en lentes (85mm), iluminación y entorno.</span>
            <span>{prompt.length} / 2000</span>
          </div>

          {/* DIRECTOR CREATIVO (COLLAPSIBLE) */}
          <div className="director-box">
            <button
              type="button"
              className="director-toggle"
              onClick={() => setDirectorOpen(!directorOpen)}
            >
              <span>🎬 Director Creativo Asistido (Estilos & Iluminación)</span>
              <span>{directorOpen ? '▲ Ocultar' : '▼ Expandir'}</span>
            </button>
            {directorOpen && (
              <div className="director-content">
                <div className="two-col-grid">
                  <div>
                    <label>Escena / Entorno</label>
                    <select value={sceneKey} onChange={e => setSceneKey(e.target.value)}>
                      {SCENE_OPTIONS.map(o => (
                        <option key={o.label} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Cámara & Lente</label>
                    <select value={cameraKey} onChange={e => setCameraKey(e.target.value)}>
                      {CAMERA_OPTIONS.map(o => (
                        <option key={o.label} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="two-col-grid">
                  <div>
                    <label>Iluminación</label>
                    <select value={lightingKey} onChange={e => setLightingKey(e.target.value)}>
                      {LIGHTING_OPTIONS.map(o => (
                        <option key={o.label} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Vibe / Actitud</label>
                    <select value={vibeKey} onChange={e => setVibeKey(e.target.value)}>
                      {VIBE_OPTIONS.map(o => (
                        <option key={o.label} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label>Outfit Sugerido</label>
                  <select value={outfitKey} onChange={e => setOutfitKey(e.target.value)}>
                    {OUTFIT_OPTIONS.map(o => (
                      <option key={o.label} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {mode === 'copy_pose_outfit' && (
                  <div className="two-col-grid">
                    <div className="slider-group">
                      <div className="slider-header">
                        <span>Fidelidad de Pose</span>
                        <span className="slider-val">{poseFidelity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={poseFidelity}
                        onChange={e => setPoseFidelity(Number(e.target.value))}
                      />
                    </div>
                    <div className="slider-group">
                      <div className="slider-header">
                        <span>Fidelidad de Outfit</span>
                        <span className="slider-val">{outfitFidelity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={outfitFidelity}
                        onChange={e => setOutfitFidelity(Number(e.target.value))}
                      />
                    </div>
                  </div>
                )}

                <div className="toggles-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={realismCore}
                      onChange={e => setRealismCore(e.target.checked)}
                    />
                    <span>Textura Realista (anti-plastic skin, micro-poros, grano suave)</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={lockIdentity}
                      onChange={e => setLockIdentity(e.target.checked)}
                    />
                    <span>Bloqueo de Identidad Facial (estabilidad en fisonomía)</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={antiDefects}
                      onChange={e => setAntiDefects(e.target.checked)}
                    />
                    <span>Filtro Anti-Defectos (evita manos deformes, aberraciones)</span>
                  </label>
                </div>

                <button
                  type="button"
                  className="auto-build-prompt-btn"
                  onClick={handleBuildPrompt}
                >
                  ✨ Auto-construir Prompt con el Director
                </button>
              </div>
            )}
          </div>

          {/* PRESETS DE ASPECT RATIO */}
          <label>
            <span>Formato & Plataforma</span>
            <span className="label-hint">PRESETS RÁPIDOS</span>
          </label>
          <div className="aspect-ratios-grid">
            {ASPECT_PRESETS.map(p => (
              <button
                type="button"
                key={p.name}
                className={`ratio-btn ${width === p.width && height === p.height ? 'active' : ''}`}
                onClick={() => handlePresetSelect(p)}
              >
                <strong>{p.icon} {p.ratio}</strong>
                <small>{p.name}</small>
              </button>
            ))}
          </div>

          {/* AJUSTES FINOS */}
          <div className="tuning-row">
            <div className="slider-group">
              <div className="slider-header">
                <span>Ancho</span>
                <span className="slider-val">{width} px</span>
              </div>
              <input
                type="range"
                min="256"
                max="2048"
                step="16"
                value={width}
                onChange={e => setWidth(Number(e.target.value))}
              />
            </div>
            <div className="slider-group">
              <div className="slider-header">
                <span>Alto</span>
                <span className="slider-val">{height} px</span>
              </div>
              <input
                type="range"
                min="256"
                max="2048"
                step="16"
                value={height}
                onChange={e => setHeight(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="tuning-row">
            <div>
              <label>Formato de Salida</label>
              <select value={format} onChange={e => setFormat(e.target.value as 'png' | 'jpeg')}>
                <option value="png">PNG (Máxima fidelidad sin pérdida)</option>
                <option value="jpeg">JPEG (Optimizado y rápido)</option>
              </select>
            </div>
            <div>
              <label>Tolerancia de Seguridad</label>
              <select value={safetyTolerance} onChange={e => setSafetyTolerance(Number(e.target.value))}>
                <option value={0}>0 (Más estricto)</option>
                <option value={2}>2 (Balanceado)</option>
                <option value={5}>5 (Más permisivo)</option>
              </select>
            </div>
          </div>

          {/* SEED ROW */}
          <label htmlFor="seed">
            <span>Seed (Semilla)</span>
            <span className="label-hint">OPCIONAL · VACÍO PARA ALEATORIO</span>
          </label>
          <div className="seed-row">
            <input
              id="seed"
              inputMode="numeric"
              placeholder="Vacío = aleatorio automático"
              value={seed}
              onChange={e => setSeed(e.target.value)}
            />
            <button type="button" className="dice-btn" onClick={handleRandomSeed} title="Generar semilla aleatoria">
              🎲
            </button>
          </div>

          {/* REFERENCIAS VISUALES SEGÚN MODO */}
          <div className="reference-hub">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '12px', color: '#fff' }}>
                {mode === 'identity_pack'
                  ? '🧩 Identity Pack: Sube hasta 6 fotos de la misma persona'
                  : mode === 'copy_pose_outfit'
                  ? '🧷 Imagen Guía (Pose & Outfit) + Sujeto'
                  : '📷 Referencias Visuales Opcionales'}
              </strong>
              {mode === 'identity_pack' && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={`chip-btn ${packLayout === '2x3' ? 'active' : ''}`}
                    onClick={() => setPackLayout('2x3')}
                    style={{ padding: '3px 8px', fontSize: '10px' }}
                  >
                    2×3
                  </button>
                  <button
                    type="button"
                    className={`chip-btn ${packLayout === '3x2' ? 'active' : ''}`}
                    onClick={() => setPackLayout('3x2')}
                    style={{ padding: '3px 8px', fontSize: '10px' }}
                  >
                    3×2
                  </button>
                </div>
              )}
            </div>

            {mode === 'copy_pose_outfit' ? (
              <div className="two-col-grid" style={{ marginTop: '12px' }}>
                <div className="ref-slot">
                  {guideFile ? (
                    <>
                      <img src={URL.createObjectURL(guideFile)} alt="Guía" />
                      <button
                        type="button"
                        className="ref-slot-remove"
                        onClick={e => {
                          e.stopPropagation();
                          setGuideFile(null);
                        }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="ref-slot-icon">🧷</span>
                      <span className="ref-slot-label">Imagen Guía (Pose + Outfit)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={e => setGuideFile(e.target.files?.[0] || null)}
                      />
                    </>
                  )}
                </div>

                <div className="ref-slot">
                  {identityFiles[0] ? (
                    <>
                      <img src={URL.createObjectURL(identityFiles[0])} alt="Sujeto" />
                      <button
                        type="button"
                        className="ref-slot-remove"
                        onClick={e => {
                          e.stopPropagation();
                          handleFileChange(0, null);
                        }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="ref-slot-icon">👤</span>
                      <span className="ref-slot-label">Rostro / Identidad (Opcional)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={e => handleFileChange(0, e.target.files?.[0] || null)}
                      />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="multi-ref-grid">
                {identityFiles.map((file, idx) => (
                  <div className="ref-slot" key={idx}>
                    {file ? (
                      <>
                        <img src={URL.createObjectURL(file)} alt={`Ref ${idx + 1}`} />
                        <button
                          type="button"
                          className="ref-slot-remove"
                          onClick={e => {
                            e.stopPropagation();
                            handleFileChange(idx, null);
                          }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="ref-slot-icon">＋</span>
                        <span className="ref-slot-label">Foto {idx + 1}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={e => handleFileChange(idx, e.target.files?.[0] || null)}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BOTÓN PRINCIPAL DE GENERACIÓN */}
          <button className="generate-btn" disabled={busy}>
            <span>✦</span>
            <span>{busy ? 'Generando con FLUX.2-pro…' : '🚀 GENERAR IMAGEN EN ALTA RESOLUCIÓN'}</span>
            <span>↗</span>
          </button>

          {message && <div className={`form-message ${statusType}`}>{message}</div>}
        </form>

        {/* PANEL DE RESULTADO / CANVAS */}
        <div className="result-panel">
          <div className="result-header">
            <span>CANVAS DE VISUALIZACIÓN</span>
            <span className={result ? 'pill-active' : ''}>
              {result ? 'RESULTADO RENDERIZADO' : 'ESPERANDO ACCIÓN'}
            </span>
          </div>

          <div className="result-canvas">
            {result ? (
              <img src={result.url} alt="Generación" />
            ) : (
              <div className="empty-canvas">
                <span className="empty-icon">✳</span>
                <h3>Tu creación cobrará vida aquí.</h3>
                <p>Escribe tu idea, ajusta tus referencias y genera para experimentar la potencia de FLUX.2-pro.</p>
              </div>
            )}
          </div>

          <div className="result-footer">
            <div className="result-specs">
              {result ? (
                <>
                  <span>📐 {result.width}×{result.height}</span>
                  <span>🎲 SEED {result.seed}</span>
                  <span>📁 {result.format?.toUpperCase()}</span>
                </>
              ) : (
                <span>FLUX.2-PRO READY</span>
              )}
            </div>

            {result && (
              <div className="result-actions">
                <a
                  href={result.url}
                  download={`flux-${result.id}.${result.format || 'png'}`}
                  className="action-pill-btn"
                >
                  💾 Descargar
                </a>
                <button type="button" className="action-pill-btn" onClick={handleCopyBase64}>
                  📋 Base64
                </button>
                <button
                  type="button"
                  className="action-pill-btn"
                  onClick={() => onEdit?.(result.url, result.prompt)}
                  title="Abrir en Editor Pro"
                >
                  🎨 Editar
                </button>
                <button type="button" className="action-pill-btn" onClick={handleReuseAsRef1} title="Usar como Referencia 1">
                  🔁 Ref 1
                </button>
                <button type="button" className="action-pill-btn" onClick={handleReuseAsGuide} title="Usar como Guía">
                  🧷 Guía
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// LIBRARY PAGE
// ============================================================================

function LibraryPage({
  session,
  onReuse,
  onEdit,
}: {
  session: Session;
  onReuse: (prompt: string, width: number, height: number, url: string) => void;
  onEdit: (url: string, title?: string) => void;
}) {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadImages = useCallback(() => {
    request<{ images: ImageRecord[] }>('/api/images')
      .then(data => {
        setImages(data.images || []);
        setErrorMsg('');
      })
      .catch(err => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('prompt', file.name.replace(/\.[^.]+$/, ''));
      await request('/api/images/upload', { method: 'POST', body: form }, session.csrf);
      loadImages();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error subiendo imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Deseas eliminar esta imagen de tu biblioteca?')) return;
    try {
      await request(`/api/images/${encodeURIComponent(id)}`, { method: 'DELETE' }, session.csrf);
      setImages(prev => prev.filter(img => img.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error eliminando imagen.');
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="overline">COLECCIÓN PRIVADA</span>
          <h1>
            Mi <em>Biblioteca.</em>
          </h1>
          <p>Tus creaciones guardadas en alta resolución. Reutiliza, itera o descarga en cualquier momento.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label className="secondary-btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>📁 {uploading ? 'Subiendo…' : 'Subir Foto'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              disabled={uploading}
              onChange={handleUploadPhoto}
            />
          </label>
          <div className="result-specs">
            <span>{images.length} CREACIONES</span>
          </div>
        </div>
      </div>

      {loading && <div className="route-loading">Cargando tu colección de imágenes…</div>}
      {errorMsg && <div className="form-message error">{errorMsg}</div>}

      <div className="library-grid">
        {images.map(item => {
          const fileUrl = `/api/images/${encodeURIComponent(item.id)}/file`;
          return (
            <article className="library-card" key={item.id}>
              <img src={fileUrl} alt={item.prompt} loading="lazy" />
              <div className="library-info">
                <strong>{item.prompt}</strong>
                <small>
                  {item.width} × {item.height} px · Seed {item.seed} · {new Date(item.created_at).toLocaleDateString()}
                </small>
                <div className="library-card-actions">
                  <button
                    className="card-action-btn"
                    onClick={() => onReuse(item.prompt, item.width, item.height, fileUrl)}
                  >
                    🔁 Reutilizar
                  </button>
                  <button
                    className="card-ghost-btn"
                    onClick={() => onEdit(fileUrl, item.prompt)}
                    title="Editar en Editor Pro"
                  >
                    🎨 Editar
                  </button>
                  <a
                    href={fileUrl}
                    download={`flux-${item.id}.png`}
                    className="card-ghost-btn"
                  >
                    💾 Descargar
                  </a>
                  <button
                    className="card-ghost-btn"
                    style={{ color: '#f87171' }}
                    onClick={() => handleDelete(item.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && !images.length && (
        <div className="library-empty">
          <span className="library-empty-icon">▦</span>
          <h2>Tu biblioteca está esperando tu primera obra.</h2>
          <p>Configura tu idea en el estudio y comienza a dar vida a tus imágenes con FLUX.2-pro.</p>
          <button className="primary-btn" onClick={() => navigate('/app/create')}>
            <span>✦</span> Crear mi primera imagen <span>↗</span>
          </button>
        </div>
      )}
    </>
  );
}

// ============================================================================
// IMAGE EDITOR PRO
// ============================================================================

interface EditorPageProps {
  session: Session;
  initialSource?: string | null;
  initialTitle?: string;
  onSendToStudioRef1: (file: File) => void;
  onSendToStudioGuide: (file: File) => void;
}

function EditorPage({
  session,
  initialSource,
  initialTitle,
  onSendToStudioRef1,
  onSendToStudioGuide,
}: EditorPageProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(initialSource || null);
  const [imageTitle, setImageTitle] = useState(initialTitle || 'Foto creativa');
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null);

  const [activeTab, setActiveTab] = useState<'adjust' | 'presets' | 'geometry'>('adjust');

  // Sliders
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [warmth, setWarmth] = useState(0);
  const [exposure, setExposure] = useState(0);
  const [blur, setBlur] = useState(0);
  const [vignette, setVignette] = useState(0);
  const [grain, setGrain] = useState(0);
  const [invert, setInvert] = useState(false);

  // Transform
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Presets
  const [activePreset, setActivePreset] = useState('original');

  // Toast & saving
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Sync when props change
  useEffect(() => {
    if (initialSource) {
      setCurrentSrc(initialSource);
    }
  }, [initialSource]);

  useEffect(() => {
    if (initialTitle) {
      setImageTitle(initialTitle);
    }
  }, [initialTitle]);

  // Load image
  useEffect(() => {
    if (!currentSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImageMeta({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      setToast('❌ Error al cargar la imagen seleccionada. Es posible que tenga restricciones de acceso (CORS) o haya expirado.');
    };
    img.src = currentSrc;
  }, [currentSrc]);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isRotated = rotation === 90 || rotation === 270;
    const w = isRotated ? img.naturalHeight : img.naturalWidth;
    const h = isRotated ? img.naturalWidth : img.naturalHeight;

    canvas.width = w;
    canvas.height = h;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    const filterParts = [
      `brightness(${brightness + exposure}%)`,
      `contrast(${contrast}%)`,
      `saturate(${saturation}%)`,
      `sepia(${warmth}%)`,
      blur > 0 ? `blur(${blur}px)` : '',
      invert ? 'invert(100%)' : '',
    ].filter(Boolean);

    ctx.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    if (vignette > 0) {
      ctx.save();
      const radius = Math.max(w, h) * 0.75;
      const grad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.35, w / 2, h / 2, radius);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${(vignette / 100) * 0.75})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (grain > 0) {
      ctx.save();
      const grainFactor = (grain / 100) * 0.15;
      const gCanvas = document.createElement('canvas');
      gCanvas.width = 100;
      gCanvas.height = 100;
      const gctx = gCanvas.getContext('2d');
      if (gctx) {
        const idata = gctx.createImageData(100, 100);
        for (let i = 0; i < idata.data.length; i += 4) {
          const val = Math.random() * 255;
          idata.data[i] = val;
          idata.data[i + 1] = val;
          idata.data[i + 2] = val;
          idata.data[i + 3] = Math.random() * 255 * grainFactor;
        }
        gctx.putImageData(idata, 0, 0);
        ctx.fillStyle = ctx.createPattern(gCanvas, 'repeat') || 'transparent';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }
  }, [brightness, contrast, saturation, warmth, exposure, blur, vignette, grain, invert, rotation, flipH, flipV, imageMeta]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const applyPreset = (key: string) => {
    setActivePreset(key);
    switch (key) {
      case 'teal_orange':
        setBrightness(100);
        setContrast(120);
        setSaturation(130);
        setWarmth(20);
        setExposure(5);
        setVignette(30);
        setGrain(10);
        setInvert(false);
        break;
      case 'cyberpunk':
        setBrightness(105);
        setContrast(135);
        setSaturation(150);
        setWarmth(0);
        setExposure(10);
        setVignette(40);
        setGrain(15);
        setInvert(false);
        break;
      case 'portra':
        setBrightness(102);
        setContrast(105);
        setSaturation(95);
        setWarmth(28);
        setExposure(0);
        setVignette(15);
        setGrain(25);
        setInvert(false);
        break;
      case 'noir':
        setBrightness(98);
        setContrast(140);
        setSaturation(0);
        setWarmth(0);
        setExposure(5);
        setVignette(45);
        setGrain(20);
        setInvert(false);
        break;
      case 'golden':
        setBrightness(104);
        setContrast(112);
        setSaturation(120);
        setWarmth(45);
        setExposure(8);
        setVignette(25);
        setGrain(5);
        setInvert(false);
        break;
      case 'vogue':
        setBrightness(108);
        setContrast(125);
        setSaturation(110);
        setWarmth(5);
        setExposure(12);
        setVignette(0);
        setGrain(0);
        setInvert(false);
        break;
      case 'vintage':
        setBrightness(95);
        setContrast(90);
        setSaturation(80);
        setWarmth(40);
        setExposure(-5);
        setVignette(35);
        setGrain(40);
        setInvert(false);
        break;
      default:
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setWarmth(0);
        setExposure(0);
        setBlur(0);
        setVignette(0);
        setGrain(0);
        setInvert(false);
        break;
    }
  };

  const handleReset = () => {
    applyPreset('original');
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setToast('Ajustes restablecidos.');
    setTimeout(() => setToast(''), 2500);
  };

  const handleFileChosen = (file: File) => {
    const url = URL.createObjectURL(file);
    setImageTitle(file.name.replace(/\.[^.]+$/, ''));
    setCurrentSrc(url);
    handleReset();
  };

  const handleSaveToLibrary = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    setToast('Guardando en tu biblioteca privada…');
    try {
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('Error al codificar imagen.');
      const file = new File([blob], `${imageTitle}_edit.png`, { type: 'image/png' });
      const form = new FormData();
      form.set('file', file);
      form.set('prompt', `[Editada] ${imageTitle}`);
      await request('/api/images/upload', { method: 'POST', body: form }, session.csrf);
      setToast('✅ ¡Guardada exitosamente en tu biblioteca!');
    } catch (err) {
      setToast(err instanceof Error ? `❌ ${err.message}` : '❌ Error al guardar.');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      handleFileChosen(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const a = document.createElement('a');
      a.download = `${imageTitle}_edit.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      setToast('📥 Descarga iniciada.');
      setTimeout(() => setToast(''), 2000);
    } catch {
      setToast('❌ No se pudo exportar la imagen. Verifica restricciones de origen o permisos.');
    }
  };

  const handleSendStudioRef1 = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((resolve, reject) => {
        try {
          canvas.toBlob(resolve, 'image/jpeg', 0.95);
        } catch (e) {
          reject(e);
        }
      });
      if (blob) {
        const file = new File([blob], `${imageTitle}_ref1.jpg`, { type: 'image/jpeg' });
        onSendToStudioRef1(file);
      }
    } catch {
      setToast('❌ Error al exportar la imagen para el estudio.');
    }
  };

  const handleSendStudioGuide = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((resolve, reject) => {
        try {
          canvas.toBlob(resolve, 'image/jpeg', 0.95);
        } catch (e) {
          reject(e);
        }
      });
      if (blob) {
        const file = new File([blob], `${imageTitle}_guide.jpg`, { type: 'image/jpeg' });
        onSendToStudioGuide(file);
      }
    } catch {
      setToast('❌ Error al exportar la imagen para el estudio.');
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="overline">SUITE DE RETOQUE & POST-PROCESADO</span>
          <h1>
            Editor <em>Pro.</em>
          </h1>
          <p>Ajusta luminosidad, color, temperatura, gradaciones cinemáticas y transformaciones para perfeccionar cada obra.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label className="secondary-btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>📁 Cargar Otra Imagen</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFileChosen(e.target.files[0])}
            />
          </label>
        </div>
      </div>

      {toast && (
        <div className={`form-message ${toast.startsWith('❌') ? 'error' : 'info'}`} style={{ marginBottom: '16px' }}>
          {toast}
        </div>
      )}

      <div className="editor-workspace">
        <div className="editor-canvas-container">
          <div className="editor-canvas-toolbar">
            <div className="editor-canvas-stats">
              <span>{imageTitle}</span>
              {imageMeta && (
                <>
                  <span className="editor-badge">{imageMeta.width}×{imageMeta.height} PX</span>
                  <span className="editor-badge">{(imageMeta.width / imageMeta.height).toFixed(2)}:1</span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="card-ghost-btn" onClick={handleReset} title="Restablecer">
                ↺ Reset
              </button>
            </div>
          </div>

          <div
            className="editor-canvas-viewport"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {currentSrc ? (
              <canvas ref={canvasRef} />
            ) : (
              <label
                className="editor-dropzone-empty"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <span className="editor-dropzone-icon">🎨</span>
                <h3>Arrastra una imagen o haz clic para subir</h3>
                <p>Soporta PNG, JPEG y WebP en alta resolución.</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && handleFileChosen(e.target.files[0])}
                />
              </label>
            )}
          </div>
        </div>

        <div className="editor-panel">
          <div className="editor-tabs">
            <button
              type="button"
              className={`editor-tab-btn ${activeTab === 'adjust' ? 'active' : ''}`}
              onClick={() => setActiveTab('adjust')}
            >
              Ajustes
            </button>
            <button
              type="button"
              className={`editor-tab-btn ${activeTab === 'presets' ? 'active' : ''}`}
              onClick={() => setActiveTab('presets')}
            >
              Filtros LUT
            </button>
            <button
              type="button"
              className={`editor-tab-btn ${activeTab === 'geometry' ? 'active' : ''}`}
              onClick={() => setActiveTab('geometry')}
            >
              Geometría
            </button>
          </div>

          {activeTab === 'adjust' && (
            <div className="editor-control-group">
              <div className="editor-slider-item">
                <div className="editor-slider-label">
                  <span>Brillo</span>
                  <span className="editor-slider-val">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={e => setBrightness(Number(e.target.value))}
                />
              </div>

              <div className="editor-slider-item">
                <div className="editor-slider-label">
                  <span>Contraste</span>
                  <span className="editor-slider-val">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={contrast}
                  onChange={e => setContrast(Number(e.target.value))}
                />
              </div>

              <div className="editor-slider-item">
                <div className="editor-slider-label">
                  <span>Saturación</span>
                  <span className="editor-slider-val">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={e => setSaturation(Number(e.target.value))}
                />
              </div>

              <div className="editor-slider-item">
                <div className="editor-slider-label">
                  <span>Calidez / Sepia</span>
                  <span className="editor-slider-val">{warmth}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={warmth}
                  onChange={e => setWarmth(Number(e.target.value))}
                />
              </div>

              <div className="editor-slider-item">
                <div className="editor-slider-label">
                  <span>Exposición</span>
                  <span className="editor-slider-val">{exposure > 0 ? `+${exposure}` : exposure}</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={exposure}
                  onChange={e => setExposure(Number(e.target.value))}
                />
              </div>

              <div className="editor-slider-item">
                <div className="editor-slider-label">
                  <span>Desenfoque (Blur)</span>
                  <span className="editor-slider-val">{blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={blur}
                  onChange={e => setBlur(Number(e.target.value))}
                />
              </div>

              <div className="editor-slider-item">
                <div className="editor-slider-label">
                  <span>Viñeta Cinemática</span>
                  <span className="editor-slider-val">{vignette}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={vignette}
                  onChange={e => setVignette(Number(e.target.value))}
                />
              </div>

              <div className="editor-slider-item">
                <div className="editor-slider-label">
                  <span>Grano Analógico</span>
                  <span className="editor-slider-val">{grain}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={grain}
                  onChange={e => setGrain(Number(e.target.value))}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                <input
                  type="checkbox"
                  checked={invert}
                  onChange={e => setInvert(e.target.checked)}
                />
                <span>Invertir Colores (Negativo)</span>
              </label>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="preset-grid">
              <button
                type="button"
                className={`preset-btn ${activePreset === 'original' ? 'active' : ''}`}
                onClick={() => applyPreset('original')}
              >
                <strong>Natural</strong>
                <small>Sin alteraciones</small>
              </button>
              <button
                type="button"
                className={`preset-btn ${activePreset === 'teal_orange' ? 'active' : ''}`}
                onClick={() => applyPreset('teal_orange')}
              >
                <strong>Teal & Orange</strong>
                <small>Hollywood blockbusters</small>
              </button>
              <button
                type="button"
                className={`preset-btn ${activePreset === 'cyberpunk' ? 'active' : ''}`}
                onClick={() => applyPreset('cyberpunk')}
              >
                <strong>Cyberpunk 2077</strong>
                <small>Neones y alto contraste</small>
              </button>
              <button
                type="button"
                className={`preset-btn ${activePreset === 'portra' ? 'active' : ''}`}
                onClick={() => applyPreset('portra')}
              >
                <strong>Kodak Portra</strong>
                <small>Piel cálida y grano</small>
              </button>
              <button
                type="button"
                className={`preset-btn ${activePreset === 'noir' ? 'active' : ''}`}
                onClick={() => applyPreset('noir')}
              >
                <strong>Noir Clásico</strong>
                <small>B&W Chiaroscuro</small>
              </button>
              <button
                type="button"
                className={`preset-btn ${activePreset === 'golden' ? 'active' : ''}`}
                onClick={() => applyPreset('golden')}
              >
                <strong>Golden Hour</strong>
                <small>Calidez de atardecer</small>
              </button>
              <button
                type="button"
                className={`preset-btn ${activePreset === 'vogue' ? 'active' : ''}`}
                onClick={() => applyPreset('vogue')}
              >
                <strong>Vogue High Key</strong>
                <small>Editorial limpia</small>
              </button>
              <button
                type="button"
                className={`preset-btn ${activePreset === 'vintage' ? 'active' : ''}`}
                onClick={() => applyPreset('vintage')}
              >
                <strong>Vintage 90s</strong>
                <small>Colores desvanecidos</small>
              </button>
            </div>
          )}

          {activeTab === 'geometry' && (
            <div className="editor-control-group">
              <span className="overline">ORIENTACIÓN Y ESPEJO</span>
              <div className="transform-actions">
                <button
                  type="button"
                  className="transform-btn"
                  onClick={() => setRotation(r => (r - 90 + 360) % 360)}
                  title="Rotar 90° izquierda"
                >
                  <span>↺</span>
                  <small>-90°</small>
                </button>
                <button
                  type="button"
                  className="transform-btn"
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  title="Rotar 90° derecha"
                >
                  <span>↻</span>
                  <small>+90°</small>
                </button>
                <button
                  type="button"
                  className="transform-btn"
                  onClick={() => setFlipH(f => !f)}
                  title="Voltear horizontal"
                >
                  <span>↔</span>
                  <small>Flip H</small>
                </button>
                <button
                  type="button"
                  className="transform-btn"
                  onClick={() => setFlipV(f => !f)}
                  title="Voltear vertical"
                >
                  <span>↕</span>
                  <small>Flip V</small>
                </button>
              </div>
            </div>
          )}

          <div className="editor-output-actions">
            <button
              type="button"
              className="primary-btn"
              disabled={!currentSrc || saving}
              onClick={handleSaveToLibrary}
            >
              <span>💾</span> {saving ? 'Guardando…' : 'Guardar en Mi Biblioteca'}
            </button>
            <button
              type="button"
              className="secondary-btn"
              disabled={!currentSrc}
              onClick={handleDownload}
            >
              <span>📥</span> Descargar PNG
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="secondary-btn"
                disabled={!currentSrc}
                onClick={handleSendStudioRef1}
                title="Cargar como Referencia 1 en Estudio"
              >
                🔁 A Ref 1
              </button>
              <button
                type="button"
                className="secondary-btn"
                disabled={!currentSrc}
                onClick={handleSendStudioGuide}
                title="Cargar como Imagen Guía"
              >
                🧷 A Guía
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// AUTH PAGE (LOGIN & REGISTER)
// ============================================================================

function AuthPage({
  mode,
  onSuccess,
}: {
  mode: 'login' | 'register';
  onSuccess: (session: Session) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const session = await request<Session>(`/api/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onSuccess(session);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error de acceso.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-mark">
          F<span>✦</span>
        </div>
        <span className="overline">ACCESO AL ESTUDIO CREATIVO</span>
        <h2>{mode === 'register' ? 'Crea tu espacio de trabajo.' : 'Bienvenido de nuevo.'}</h2>
        <p>
          {mode === 'register'
            ? 'Crea una cuenta segura para generar y organizar tus imágenes.'
            : 'Inicia sesión para acceder a tu estudio y biblioteca privada.'}
        </p>

        <form onSubmit={submit}>
          <label htmlFor="auth-email">Correo electrónico</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@correo.com"
          />

          <label htmlFor="auth-password">Contraseña</label>
          <input
            id="auth-password"
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 12 caracteres de seguridad"
          />

          <button className="generate-btn" disabled={busy}>
            <span>✦</span>
            <span>{busy ? 'Validando…' : mode === 'register' ? 'Crear cuenta ↗' : 'Iniciar sesión ↗'}</span>
            <span>→</span>
          </button>

          {message && <p className="form-message error">{message}</p>}
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => navigate(mode === 'register' ? '/login' : '/register')}
        >
          {mode === 'register' ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Regístrate gratis'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export function App() {
  const route = useRoute();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Prompt / Presets pasados al Crear
  const [activePrompt, setActivePrompt] = useState('');
  const [activeWidth, setActiveWidth] = useState<number | undefined>();
  const [activeHeight, setActiveHeight] = useState<number | undefined>();
  const [activeRef1, setActiveRef1] = useState<File | null>(null);
  const [activeRef2, setActiveRef2] = useState<File | null>(null);

  // Lightbox Modal
  const [inspectItem, setInspectItem] = useState<CatalogItem | null>(null);

  // Editor Pro
  const [editorSource, setEditorSource] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('Foto creativa');

  // Menús
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const s = await request<Session>('/api/me');
      setSession(s);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!loading && session && (route === '/login' || route === '/register')) {
      navigate('/app/create');
    }
  }, [loading, session, route]);

  const handleGoCreate = (prompt = '', width?: number, height?: number) => {
    setActivePrompt(prompt);
    setActiveWidth(width);
    setActiveHeight(height);
    navigate('/app/create');
    setMenuOpen(false);
  };

  const handleGoEditor = (source?: string | null, title?: string) => {
    if (source) setEditorSource(source);
    if (title) setEditorTitle(title);
    navigate('/app/editor');
    setMenuOpen(false);
  };

  const handleSendToStudioRef1 = (file: File) => {
    setActiveRef1(file);
    navigate('/app/create');
  };

  const handleSendToStudioGuide = (file: File) => {
    setActiveRef2(file);
    navigate('/app/create');
  };

  const handleReuseFromLibrary = async (prompt: string, width: number, height: number, url: string) => {
    setActivePrompt(prompt);
    setActiveWidth(width);
    setActiveHeight(height);
    try {
      const file = await urlToFile(url, 'library_ref.png');
      setActiveRef1(file);
    } catch {
      setActiveRef1(null);
    }
    navigate('/app/create');
  };

  const handleLogout = async () => {
    if (session) {
      try {
        await request('/api/logout', { method: 'POST' }, session.csrf);
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) return;
      }
    }
    setSession(null);
    setAccountOpen(false);
    navigate('/');
  };

  const nav = (path: Route | string) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <div className="shell">
      {/* SIDEBAR */}
      <aside className={`sidebar ${menuOpen ? 'mobile-open' : ''}`}>
        <a
          className="brand"
          href="/"
          onClick={e => {
            e.preventDefault();
            nav('/');
          }}
        >
          <div className="brand-icon">F</div>
          <div className="brand-title">
            <span className="brand-name">FLUX STUDIO</span>
            <span className="brand-badge">PRO v2.5 ULTRA</span>
          </div>
        </a>

        <div className="side-label">WORKSPACE</div>
        <nav aria-label="Navegación principal">
          <button
            className={`nav-link ${route === '/' || route === '/catalog' ? 'active' : ''}`}
            onClick={() => nav('/')}
          >
            <span className="nav-link-icon">◈</span> Catálogo 4K
          </button>
          <button
            className={`nav-link ${route === '/app/create' ? 'active' : ''}`}
            onClick={() => handleGoCreate()}
          >
            <span className="nav-link-icon">✳</span> Estudio Creativo
          </button>
          <button
            className={`nav-link ${route === '/app/editor' ? 'active' : ''}`}
            onClick={() => nav('/app/editor')}
          >
            <span className="nav-link-icon">🎨</span> Editor Pro
          </button>
          <button
            className={`nav-link ${route === '/app/library' ? 'active' : ''}`}
            onClick={() => nav('/app/library')}
          >
            <span className="nav-link-icon">▦</span> Mi Biblioteca
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="side-card">
            <span className="side-card-badge">● FLUX.2-PRO READY</span>
            <strong>Potencia Creativa</strong>
            <p>Genera imágenes de hasta 4K, combina identidades y copia poses con precisión milimétrica.</p>
            <button className="side-card-btn" onClick={() => handleGoCreate()}>
              <span>Crear Imagen</span>
              <span>↗</span>
            </button>
          </div>
          <div className="side-footer">
            <span>FLUX PRO STUDIO</span>
            <span>2026</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="content-wrap">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => setMenuOpen(!menuOpen)}>
            ☰ FLUX STUDIO
          </button>

          <div className="breadcrumb">
            <span>Flux Suite</span>
            <span>/</span>
            <strong>
              {route === '/app/create'
                ? 'Estudio de Creación'
                : route === '/app/editor'
                ? 'Editor Pro de Imagen'
                : route === '/app/library'
                ? 'Mi Biblioteca'
                : route === '/catalog'
                ? 'Catálogo Maestro 4K'
                : 'Explorar Catálogo 4K'}
            </strong>
          </div>

          <div className="top-actions">
            <div className="status-indicator">
              <span className="status-dot" />
              <span>FOUNDRY CONECTADO</span>
            </div>

            <button
              className="avatar-btn"
              aria-label="Menú de cuenta"
              onClick={() => (session ? setAccountOpen(!accountOpen) : nav('/login'))}
            >
              {session?.email ? session.email[0].toUpperCase() : '?'}
            </button>
          </div>
        </header>

        <main>
          {(route === '/' || route === '/catalog') && (
            <Landing
              onCreate={handleGoCreate}
              onInspect={item => setInspectItem(item)}
              onEdit={handleGoEditor}
            />
          )}

          {(route === '/login' || route === '/register') && (
            <AuthPage
              mode={route === '/login' ? 'login' : 'register'}
              onSuccess={s => {
                setSession(s);
                navigate('/app/create');
              }}
            />
          )}

          {route === '/app/create' && (
            <ProtectedRoute session={session} loading={loading}>
              <CreatePage
                session={session!}
                initialPrompt={activePrompt}
                initialWidth={activeWidth}
                initialHeight={activeHeight}
                initialRef1={activeRef1}
                initialRef2={activeRef2}
                onEdit={handleGoEditor}
              />
            </ProtectedRoute>
          )}

          {route === '/app/editor' && (
            <ProtectedRoute session={session} loading={loading}>
              <EditorPage
                session={session!}
                initialSource={editorSource}
                initialTitle={editorTitle}
                onSendToStudioRef1={handleSendToStudioRef1}
                onSendToStudioGuide={handleSendToStudioGuide}
              />
            </ProtectedRoute>
          )}

          {route === '/app/library' && (
            <ProtectedRoute session={session} loading={loading}>
              <LibraryPage
                session={session!}
                onReuse={handleReuseFromLibrary}
                onEdit={handleGoEditor}
              />
            </ProtectedRoute>
          )}
        </main>

        <footer className="main-footer">
          <span>
            FLUX STUDIO PRO <b>✦</b> MICROSOFT FOUNDRY FLUX.2-PRO INTEGRATION
          </span>
          <span>CREATIVIDAD E IDENTIDAD SIN LÍMITES</span>
        </footer>
      </div>

      {/* POPUP DE CUENTA */}
      {accountOpen && session && (
        <div className="account-menu">
          <span className="account-email">{session.email}</span>
          <button className="logout-btn" onClick={handleLogout}>
            <span>Cerrar sesión</span>
            <span>↗</span>
          </button>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {inspectItem && (
        <LightboxModal
          item={inspectItem}
          onClose={() => setInspectItem(null)}
          onUseInStudio={handleGoCreate}
          onEdit={handleGoEditor}
        />
      )}
    </div>
  );
}
