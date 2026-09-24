export interface CatalogItem {
  id: string;
  title: string;
  category: string;
  aspectRatio: string;
  width: number;
  height: number;
  image: string;
  prompt: string;
  camera: string;
  lighting: string;
  tags: string[];
}

export const CATALOG_ITEMS: CatalogItem[] = [
  {
    id: "cat-01",
    title: "Ciber-Geisha Luminescente",
    category: "RETRATO",
    aspectRatio: "4:5",
    width: 1024,
    height: 1280,
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=3840&q=85",
    prompt: "Retrato editorial artístico en 4K UHD, mujer futurista con patrones sutiles de bioluminiscencia en pómulos, kimono de seda iridiscente con filamentos dorados, luz lateral turquesa y magenta, lente 85mm f/1.4, textura de piel fotorrealista con micro-poros visibles, fotografía de moda de alta costura.",
    camera: "85mm f/1.4 Hasselblad",
    lighting: "Luz de estudio dramática con neón turquesa",
    tags: ["4K UHD", "Fotografía Editorial", "Alta Costura"]
  },
  {
    id: "cat-02",
    title: "Santuario Bioclimático en el Desierto",
    category: "ARQUITECTURA",
    aspectRatio: "16:9",
    width: 1792,
    height: 1024,
    image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=3840&q=85",
    prompt: "Arquitectura escultórica minimalista y futurista de hormigón blanco y travertino en el desierto de Atacama, estanque central de reflexión color aguamarina, sombras proyectadas por geometrías fluidas al atardecer, luz dorada cinematográfica, render hiperrealista 8k, composición de Architectural Digest.",
    camera: "Lente gran angular tilt-shift 24mm",
    lighting: "Golden Hour atardecer dorado con sombras largas",
    tags: ["4K UHD", "Brutalismo Orgánico", "Architectural Digest"]
  },
  {
    id: "cat-03",
    title: "Caleidoscopio de Niebla Alpina",
    category: "NATURALEZA",
    aspectRatio: "16:9",
    width: 1792,
    height: 1024,
    image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=3840&q=85",
    prompt: "Lago alpino de aguas turquesas y cristalinas en los Dolomitas al amanecer, niebla etérea flotando sobre el agua con reflejos perfectos de montañas cubiertas de nieve, primeros rayos de sol rasantes, atmósfera serena, fotografía de paisaje National Geographic 4K.",
    camera: "Hasselblad H6D-100c 35mm",
    lighting: "Luz suave del amanecer con niebla volumétrica",
    tags: ["4K UHD", "National Geographic", "Paisaje Sublime"]
  },
  {
    id: "cat-04",
    title: "Monolito de Cristal y Minerales",
    category: "ARTE DIGITAL",
    aspectRatio: "1:1",
    width: 1536,
    height: 1536,
    image: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=3840&q=85",
    prompt: "Escultura conceptual abstracta de vidrio soplado translúcido con inclusiones de pan de oro líquido y minerales de bismuto flotando en ingravidez, cáusticas de luz hiperrealistas, fondo degradado suave violeta obsidiana, arte contemporáneo en 3D 8K Octane Render.",
    camera: "Macro 100mm f/2.8",
    lighting: "Cáusticas de refracción y dispersión cromática",
    tags: ["4K UHD", "3D Hiperrealista", "Arte Conceptual"]
  },
  {
    id: "cat-05",
    title: "Callejón Neón en Shinjuku Lluvioso",
    category: "CINEMATOGRAFÍA",
    aspectRatio: "16:9",
    width: 1792,
    height: 1024,
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=3840&q=85",
    prompt: "Cinematografía anamórfica 35mm estilo Blade Runner, callejón empapado por la lluvia en Neo Tokio nocturno, reflejos de letreros holográficos verticales en charcos de asfalto, figura solitaria en abrigo techwear con paraguas transparente, destellos de lente anamórficos azules.",
    camera: "Lente anamórfica Panavision 40mm",
    lighting: "Neón cyberpunk con reflejos húmedos en pavimento",
    tags: ["4K UHD", "Cyberpunk", "Cinematografía 35mm"]
  },
  {
    id: "cat-06",
    title: "Retrato de Moda Otoño en Milán",
    category: "RETRATO",
    aspectRatio: "4:5",
    width: 1024,
    height: 1280,
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=3840&q=85",
    prompt: "Fotografía editorial de moda callejera en Milán, modelo con abrigo oversize de lana gris y bufanda de cachemira, cabello ondeando suavemente con la brisa, fondo de arquitectura clásica desenfocada con bokeh cremoso, tonos cálidos y textura analógica Kodak Portra 400.",
    camera: "Canon RF 85mm f/1.2L",
    lighting: "Luz natural difusa de tarde otoñal",
    tags: ["4K UHD", "Street Style", "Kodak Portra 400"]
  },
  {
    id: "cat-07",
    title: "Estación Orbital Crystalline Horizon",
    category: "CINEMATOGRAFÍA",
    aspectRatio: "16:9",
    width: 1792,
    height: 1024,
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=3840&q=85",
    prompt: "Vista épica en 4K de una mega-estación espacial modular de anillos concéntricos orbitando un planeta azul con auroras polares, matrices solares fotovoltaicas hiperdetalladas, nebulosa estelar violeta de fondo, iluminación solar dura sin atmósfera, cine de ciencia ficción.",
    camera: "Cámara espacial de formato IMAX",
    lighting: "Contraste solar espacial con penumbra profunda",
    tags: ["4K UHD", "Sci-Fi Épico", "Espacio Profundo"]
  },
  {
    id: "cat-08",
    title: "Momento Espresso en Terraza de Cafetería",
    category: "LIFESTYLE",
    aspectRatio: "4:5",
    width: 1024,
    height: 1280,
    image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=3840&q=85",
    prompt: "Fotografía candid y espontánea de influencer en una cafetería con estilo escandinavo, sosteniendo una taza de cerámica con arte latte humeante, vestimenta smart casual moderna, luz suave que entra por ventanal de cristal, plantas verdes y atmósfera relajada.",
    camera: "Sony A7R V con lente 50mm f/1.4",
    lighting: "Luz natural de ventana envolvente",
    tags: ["4K UHD", "Candid Lifestyle", "Influencer Style"]
  },
  {
    id: "cat-09",
    title: "Aurora Boreal sobre Fiordos Glaciares",
    category: "NATURALEZA",
    aspectRatio: "16:9",
    width: 1792,
    height: 1024,
    image: "https://images.unsplash.com/photo-1579033461380-adb47c3eb938?auto=format&fit=crop&w=3840&q=85",
    prompt: "Espectacular fotografía nocturna de larga exposición de la Aurora Boreal ondulando en cintas verde esmeralda y violeta sobre fiordos escarpados cubiertos de hielo en Tromsø, reflejo en el agua quieta, cielo estrellado cristalino, 4K UHD resolución maestra.",
    camera: "Sony 14mm f/1.8 GM",
    lighting: "Luminiscencia natural de aurora y noche polar",
    tags: ["4K UHD", "Aurora Polar", "Larga Exposición"]
  },
  {
    id: "cat-10",
    title: "Pabellón Paramétrico de Cristal y Madera",
    category: "ARQUITECTURA",
    aspectRatio: "1:1",
    width: 1536,
    height: 1536,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=3840&q=85",
    prompt: "Estructura arquitectónica paramétrica con vigas de roble laminado y paneles de vidrio curvados que forman un dosel orgánico, luz solar cenital filtrada creando patrones de sombras biomórficas en suelo de hormigón pulido, diseño biofílico futurista en 4K.",
    camera: "Fujifilm GFX 100 II 32-64mm",
    lighting: "Iluminación cenital natural con sombras geométricas",
    tags: ["4K UHD", "Arquitectura Biofílica", "Diseño Sostenible"]
  },
  {
    id: "cat-11",
    title: "Retrato Cyber Noir con Mirada Cristalina",
    category: "RETRATO",
    aspectRatio: "4:5",
    width: 1024,
    height: 1280,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=3840&q=85",
    prompt: "Retrato de primer plano de hombre con expresión enigmática, iluminación claroscuro en dos tonos con azul eléctrico y ámbar, textura de barba y poros de piel nítidos, reflejo de pantalla de interfaz gráfica en sus ojos, realismo creíble sin retoques plásticos.",
    camera: "Nikon Z9 con 105mm f/1.4",
    lighting: "Luz bipartita azul eléctrico y ámbar cálido",
    tags: ["4K UHD", "Cyber Noir", "Textura Realista"]
  },
  {
    id: "cat-12",
    title: "Fluid Cosmos en Resina de Obsidiana",
    category: "ARTE DIGITAL",
    aspectRatio: "16:9",
    width: 1792,
    height: 1024,
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=3840&q=85",
    prompt: "Macrofotografía abstracta de fluidos cósmicos con pigmentos de lapislázuli, oro líquido metalizado y mica iridiscente suspendidos en resina negra profunda, vórtices helicoidales y micropartículas brillantes, arte generativo de máxima resolución 4K.",
    camera: "Lente Macro sonda 24mm f/14",
    lighting: "Iluminación de fibra óptica multidireccional",
    tags: ["4K UHD", "Fluid Art", "Macrofotografía"]
  },
  {
    id: "cat-13",
    title: "Elegancia Andina Contemporánea",
    category: "RETRATO",
    aspectRatio: "4:5",
    width: 1024,
    height: 1280,
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=3840&q=85",
    prompt: "Retrato editorial de alta moda con modelo andina, bordados geométricos tradicionales en hilo de oro sobre terciopelo negro, pendientes escultóricos de plata pulida, iluminación natural suave de estudio con reflector ámbar, nitidez extrema de poros y pestañas, 85mm f/1.2.",
    camera: "Hasselblad X2D 100C con 90mm f/2.5",
    lighting: "Luz suave de ventana norte con reflector dorado",
    tags: ["4K UHD", "Moda Contemporánea", "Retrato Étnico"]
  },
  {
    id: "cat-14",
    title: "Catedral Biomórfica de Bambú y Vidrio",
    category: "ARQUITECTURA",
    aspectRatio: "16:9",
    width: 1792,
    height: 1024,
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=3840&q=85",
    prompt: "Estructura arquitectónica biofílica colosal construida con arcos entrelazados de bambú curado y cúpulas de vidrio prismático, luz solar cenital filtrada creando haces de luz volumétrica dorada en el suelo de piedra negra, render 8k estilo Zaha Hadid y Vo Trong Nghia.",
    camera: "Sony A7R V con lente 16-35mm f/2.8 GM",
    lighting: "Haces volumétricos de luz natural cenital",
    tags: ["4K UHD", "Arquitectura Sostenible", "Biofilia"]
  },
  {
    id: "cat-15",
    title: "Duna Solar en Arrakis",
    category: "CINEMATOGRAFÍA",
    aspectRatio: "16:9",
    width: 1792,
    height: 1024,
    image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=3840&q=85",
    prompt: "Fotograma cinematográfico en formato IMAX 70mm estilo Dune de Denis Villeneuve, figura solitaria en traje de supervivencia techwear sobre la cresta de una duna gigante en un planeta desértico, sol binario en el horizonte arrojando sombras titánicas, grano de película anamórfica.",
    camera: "ARRI Alexa 65 con lentes Panavision Ultra Vista",
    lighting: "Contraluz desértico dorado con neblina de polvo suspendido",
    tags: ["4K UHD", "IMAX Cinematografía", "Sci-Fi Épico"]
  },
  {
    id: "cat-16",
    title: "Templo del Hielo en Cueva Glaciar",
    category: "NATURALEZA",
    aspectRatio: "16:9",
    width: 1792,
    height: 1024,
    image: "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=3840&q=85",
    prompt: "Interior de una cueva de hielo cristalino azul zafiro en el glaciar Vatnajökull en Islandia, bóvedas ondulantes de hielo milenario translúcido, suelo de roca volcánica negra mojada, reflejos cristalinos de luz exterior helada, fotografía National Geographic de ultra alta definición.",
    camera: "Nikon Z9 con lente 14-24mm f/2.8 S",
    lighting: "Luz ambiente refractada a través de hielo de 20 metros de espesor",
    tags: ["4K UHD", "National Geographic", "Glaciar Islandia"]
  },
  {
    id: "cat-17",
    title: "Metamorfosis de Cromo y Orquídea",
    category: "ARTE DIGITAL",
    aspectRatio: "1:1",
    width: 1536,
    height: 1536,
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=3840&q=85",
    prompt: "Escultura surrealista hiperdetallada donde una orquídea negra orgánica se fusiona con metal líquido de cromo reflectante pulido a espejo, gotas de mercurio flotando en ingravidez, cáusticas hiperrealistas de iluminación de estudio en fondo de seda obsidiana, render en Octane 8K.",
    camera: "Lente Macro 90mm f/2.8",
    lighting: "Iluminación de estudio en tres puntos con reflejos especulares de cromo",
    tags: ["4K UHD", "Octane Render 8K", "Surrealismo Cromo"]
  },
  {
    id: "cat-18",
    title: "Atelier de Cerámica al Amanecer",
    category: "LIFESTYLE",
    aspectRatio: "4:5",
    width: 1024,
    height: 1280,
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=3840&q=85",
    prompt: "Fotografía documental espontánea de una ceramista en su taller artesanal rústico, manos cubiertas de arcilla húmeda modelando una vasija en el torno, rayos de sol dorados entrando por el ventanal polvoriento, estantes con piezas de terracota en bokeh suave, tonos cálidos.",
    camera: "Leica M11 con Summilux-M 50mm f/1.4",
    lighting: "Luz rasante matutina con motas de polvo iluminadas",
    tags: ["4K UHD", "Lifestyle Artesanal", "Leica Look"]
  },
  {
    id: "cat-19",
    title: "Guerrero Neón Samurai Urbano",
    category: "RETRATO",
    aspectRatio: "4:5",
    width: 1024,
    height: 1280,
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=3840&q=85",
    prompt: "Retrato editorial cyberpunk de hombre con mirada penetrante bajo la lluvia en Tokio, abrigo techwear negro con cuello alto, detalles de implantes biocibernéticos discretos en la sien iluminados en azul cian, fondo de letreros de neón desenfocados en lluvia nocturna.",
    camera: "Sony A7R V con lente FE 85mm f/1.4 GM",
    lighting: "Luz de recorte magenta y relleno suave azul cian",
    tags: ["4K UHD", "Cyberpunk", "Retrato Urbano"]
  },
  {
    id: "cat-20",
    title: "Alta Costura en el Salar de Uyuni",
    category: "LIFESTYLE",
    aspectRatio: "16:9",
    width: 1792,
    height: 1024,
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=3840&q=85",
    prompt: "Editorial de moda de alta costura en el Salar de Uyuni inundado creando un espejo infinito perfecto del cielo, modelo con vestido de gasa azul cobalto ondeando dramáticamente con el viento, nubes de tormenta en el horizonte, composición minimalista y sublime de Vogue.",
    camera: "Canon EOS R5 con RF 28-70mm f/2L USM",
    lighting: "Luz difusa de cielo nublado con reflejo especular en el agua",
    tags: ["4K UHD", "Alta Costura", "Vogue Editorial"]
  },
  {
    id: "cat-21",
    title: "Submarino Bioluminiscente en Fosa Marina",
    category: "CINEMATOGRAFÍA",
    aspectRatio: "16:9",
    width: 1792,
    height: 1024,
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=3840&q=85",
    prompt: "Fotograma cinematográfico de ciencia ficción submarina, pequeño sumergible de exploración esférico iluminando con sus focos halógenos una chimenea hidrotermal en la fosa de las Marianas, rodeado de medusas bioluminiscentes en tonos esmeralda y violeta, agua abisal profunda.",
    camera: "Cámara subacuática IMAX con lente anamórfica",
    lighting: "Focos potentes de penetración submarina con brillo bioluminiscente",
    tags: ["4K UHD", "Abismo Marino", "Cinematografía Submarina"]
  },
  {
    id: "cat-22",
    title: "Observatorio Astronómico en la Cumbre",
    category: "ARQUITECTURA",
    aspectRatio: "16:9",
    width: 1792,
    height: 1024,
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=3840&q=85",
    prompt: "Domo geodésico futurista de un observatorio astronómico construido en la cima de un volcán sobre un mar de nubes blancas en el Parque Nacional del Teide, cielo nocturno repleto de estrellas con el núcleo de la Vía Láctea en nitidez asombrosa, arquitectura científica de vanguardia.",
    camera: "Fujifilm GFX 100S con lente GF 23mm f/4 R LM WR",
    lighting: "Luz estelar natural de la Vía Láctea y tenue iluminación de cabina roja",
    tags: ["4K UHD", "Astrofotografía", "Arquitectura Científica"]
  },
  {
    id: "cat-23",
    title: "Bosque de Bambú Esmeralda en Kioto",
    category: "NATURALEZA",
    aspectRatio: "16:9",
    width: 1792,
    height: 1024,
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=3840&q=85",
    prompt: "Sendero serpenteante a través del denso bosque de bambú sagrado de Arashiyama en Kioto al alba, niebla matutina suave filtrando la luz verde esmeralda entre los tallos infinitos de bambú, gotas de rocío en las hojas, atmósfera zen de calma profunda, resolución 4K UHD.",
    camera: "Hasselblad H6D-100c con lente 50mm",
    lighting: "Luz difusa esmeralda filtrada a través del follaje",
    tags: ["4K UHD", "Zen Kioto", "Naturaleza Inmersiva"]
  },
  {
    id: "cat-24",
    title: "Rooftop Jazz Soirée en Manhattan",
    category: "LIFESTYLE",
    aspectRatio: "4:5",
    width: 1024,
    height: 1280,
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=3840&q=85",
    prompt: "Fotografía lifestyle nocturna y sofisticada en una terraza en la azotea de SoHo en Nueva York durante el crepúsculo, saxofonista tocando bajo guirnaldas de bombillas de filamento cálido, cócteles de cristal en las mesas y siluetas de rascacielos iluminados en el fondo con bokeh cremoso.",
    camera: "Sony A1 con 50mm f/1.2 GM",
    lighting: "Luces cálidas de fiesta con crepúsculo azul oscuro urbano",
    tags: ["4K UHD", "Jazz Nocturno", "Manhattan Rooftop"]
  }
];
