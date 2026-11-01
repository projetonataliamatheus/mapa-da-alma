/**
 * Ícones do Link na bio (traço, viewBox 24). Desenhos próprios e simples.
 * BTN: ícones dos botões e redes. NICHE: ícones que flutuam no fundo, por nicho.
 */
export const BTN: Record<string, string> = {
  whatsapp: '<path d="M4 20l1.3-3.8A8.5 8.5 0 1 1 8.2 19z"/><path d="M9 8.6c0 3 2.4 5.7 5.6 6.4l1-1.4-1.9-1-1 .8a4.6 4.6 0 0 1-2.4-2.4l.8-1-1-1.9z"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1" fill="currentColor"/>',
  tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.4 2.6 2.2 4.4 5 4.6"/>',
  facebook: '<path d="M14 21v-7.5h2.6l.4-3H14V8.7c0-.9.3-1.5 1.6-1.5H17V4.5c-.3 0-1.2-.1-2.3-.1-2.3 0-3.7 1.4-3.7 3.9v2.2H8.5v3H11V21"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>',
  site: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  maps: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  telefone: '<path d="M5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.2 5.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A15 15 0 0 1 3 6.2 2 2 0 0 1 5 4z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
  catalogo: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
  agenda: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3"/>',
  delivery: '<path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  avaliar: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  pix: '<path d="M12 3l9 9-9 9-9-9z"/><path d="M8.5 12h7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.9l7.6-3.8M8.2 13.1l7.6 3.8"/>',
};

/** Tipos de botão que o editor oferece: [tipo, nome, ícone, como montar o link]. */
export const BUTTON_TYPES: [string, string, string, string][] = [
  ['whatsapp', 'WhatsApp', 'whatsapp', 'Número com DDD'],
  ['instagram', 'Instagram', 'instagram', '@usuario'],
  ['site', 'Site', 'site', 'Endereço do site'],
  ['maps', 'Como chegar', 'maps', 'Endereço ou link do Google Maps'],
  ['agenda', 'Agendar horário', 'agenda', 'Link da agenda ou WhatsApp'],
  ['catalogo', 'Catálogo / cardápio', 'catalogo', 'Link do catálogo'],
  ['delivery', 'Pedir delivery', 'delivery', 'Link do iFood ou do delivery'],
  ['avaliar', 'Avaliar no Google', 'avaliar', 'Link de avaliação do Google'],
  ['telefone', 'Ligar', 'telefone', 'Telefone com DDD'],
  ['email', 'E-mail', 'email', 'endereco@email.com'],
  ['tiktok', 'TikTok', 'tiktok', '@usuario'],
  ['youtube', 'YouTube', 'youtube', 'Link do canal'],
  ['facebook', 'Facebook', 'facebook', 'Link da página'],
  ['pix', 'Chave Pix', 'pix', 'Chave Pix (copia ao tocar)'],
  ['link', 'Outro link', 'link', 'Qualquer endereço'],
];

/** Ícones que flutuam no fundo, por nicho. */
export const NICHE: Record<string, { label: string; icons: string[] }> = {
  odonto: {
    label: 'Odontologia',
    icons: [
      '<path d="M7 3.5c-2.3 0-3.5 1.8-3.5 4 0 3 1.4 4.3 1.9 7.4.4 2.6 1 5.6 2.4 5.6 1.6 0 1.5-4.5 4.2-4.5s2.6 4.5 4.2 4.5c1.4 0 2-3 2.4-5.6.5-3.1 1.9-4.4 1.9-7.4 0-2.2-1.2-4-3.5-4-2 0-3 1.2-5 1.2S9 3.5 7 3.5z"/>',
      '<path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="12" cy="12" r="9"/><path d="M9 9.5h.01M15 9.5h.01"/>',
      '<path d="M5 19L15 9"/><rect x="14" y="3" width="7" height="4" rx="2" transform="rotate(45 17.5 5)"/>',
      '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/>',
    ],
  },
  saude: {
    label: 'Saúde',
    icons: [
      '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
      '<path d="M9 3.5h6v5.5h5.5v6H15v5.5H9V15H3.5V9H9z"/>',
      '<path d="M6 4v6a4 4 0 0 0 8 0V4M10 14v2a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="12" r="2"/>',
      '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
    ],
  },
  beleza: {
    label: 'Beleza e estética',
    icons: [
      '<circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M8.5 16L18 4M15.5 16L6 4"/>',
      '<path d="M12 3c2 3 5 4.8 5 8.5a5 5 0 0 1-10 0C7 7.8 10 6 12 3z"/>',
      '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
      '<rect x="9" y="9" width="6" height="12" rx="1.5"/><path d="M10 9V6l2-3 2 3v3"/>',
    ],
  },
  barbearia: {
    label: 'Barbearia',
    icons: [
      '<circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M8.5 16L18 4M15.5 16L6 4"/>',
      '<rect x="8" y="3" width="8" height="18" rx="4"/><path d="M8 8l8 3M8 12l8 3"/>',
      '<path d="M4 15c2-2 4-2 6 0s4 2 6 0 3-2 4-1"/><path d="M6 11c1.5-1.5 3-1.5 4.5 0"/>',
      '<path d="M5 20l10-10M14 4h6v6"/>',
    ],
  },
  pet: {
    label: 'Pet',
    icons: [
      '<circle cx="7" cy="9" r="1.8"/><circle cx="12" cy="6.5" r="1.8"/><circle cx="17" cy="9" r="1.8"/><path d="M12 12c-3 0-5 3-5 5.2C7 19 8.5 20 10 20c1 0 1.3-.6 2-.6s1 .6 2 .6c1.5 0 3-1 3-2.8 0-2.2-2-5.2-5-5.2z"/>',
      '<path d="M6 9a2 2 0 1 1 2.6-2.6L15.4 13A2 2 0 1 1 18 15.6 2 2 0 1 1 15.4 18L8.6 11.4A2 2 0 1 1 6 9z"/>',
      '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
      '<path d="M5 13c0-4 3-7 7-7s7 3 7 7v5H5z"/><path d="M9 18v-3M15 18v-3"/>',
    ],
  },
  comida: {
    label: 'Restaurante e lanches',
    icons: [
      '<path d="M4 11a8 5 0 0 1 16 0z"/><path d="M3.5 14h17M5 17h14a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2z"/>',
      '<path d="M12 3L3 19h18z"/><circle cx="10" cy="13" r="1"/><circle cx="14" cy="15" r="1"/><circle cx="12" cy="9.5" r="1"/>',
      '<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 3c-2 2-2 6 0 8v10"/>',
      '<path d="M5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M17 11h1.5a2 2 0 0 1 0 4H17M9 3c-1 1.5 1 2.5 0 4M13 3c-1 1.5 1 2.5 0 4"/>',
    ],
  },
  padaria: {
    label: 'Padaria e doces',
    icons: [
      '<path d="M4 13c0-4 3.6-7 8-7s8 3 8 7c0 2-1 3-2 3H6c-1 0-2-1-2-3z"/><path d="M9 7.5l1 4M15 7.5l-1 4M12 6v5"/>',
      '<path d="M6 12h12l-1.5 8h-9z"/><path d="M6 12a6 6 0 0 1 12 0"/><circle cx="12" cy="5" r="1.5"/>',
      '<path d="M5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M17 11h1.5a2 2 0 0 1 0 4H17"/>',
      '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    ],
  },
  fitness: {
    label: 'Academia e esporte',
    icons: [
      '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
      '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>',
      '<circle cx="13" cy="4.5" r="1.8"/><path d="M8 21l3-6 3 2v4M6 12l3-4 4 1 2 3 3 1"/>',
      '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/><path d="M7 12h3l1-2 2 4 1-2h3"/>',
    ],
  },
  juridico: {
    label: 'Advocacia e contabilidade',
    icons: [
      '<path d="M12 4v16M7 20h10M4 8h16M6 8l-2.5 6a3 3 0 0 0 5 0zM18 8l-2.5 6a3 3 0 0 0 5 0z"/>',
      '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/>',
      '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 19h8"/>',
      '<path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M12 3l9 5H3z"/>',
    ],
  },
  imoveis: {
    label: 'Imóveis e construção',
    icons: [
      '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
      '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3"/>',
      '<path d="M3 21h18M6 21V8l6-4 6 4v13M10 21v-4h4v4M10 11h4"/>',
      '<path d="M4 20l6-14 4 8 2-3 4 9z"/>',
    ],
  },
  automotivo: {
    label: 'Automotivo',
    icons: [
      '<path d="M4 16v-4l2-5h12l2 5v4z"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/><path d="M6 12h12"/>',
      '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4v6M12 14v6M4 12h6M14 12h6"/>',
      '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.4-.4-2.6z"/>',
      '<path d="M7 20v-9l5-6 5 6v9"/><path d="M10 14h4"/>',
    ],
  },
  educacao: {
    label: 'Educação e cursos',
    icons: [
      '<path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11.5V16c2.5 2 7.5 2 10 0v-4.5M21 9v6"/>',
      '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
      '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
      '<path d="M5 19L17 7l2 2L7 21H5z"/>',
    ],
  },
  moda: {
    label: 'Moda e loja',
    icons: [
      '<path d="M9 3l3 2 3-2 5 3-2 4-2-1v12H8V9l-2 1-2-4z"/>',
      '<path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
      '<path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>',
      '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    ],
  },
  eventos: {
    label: 'Eventos e fotografia',
    icons: [
      '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
      '<path d="M9 18V6l11-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="16" r="2"/>',
      '<path d="M5 21l5-14 7 7z"/><path d="M14 4l1 2M19 5l-2 1M20 10l-2-.5"/>',
      '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/>',
    ],
  },
  tecnologia: {
    label: 'Tecnologia e serviços',
    icons: [
      '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
      '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12"/>',
      '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
      '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>',
    ],
  },
  geral: {
    label: 'Genérico',
    icons: [
      '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/>',
      '<circle cx="12" cy="12" r="8"/>',
      '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
      '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    ],
  },
};

const RULES: [RegExp, string][] = [
  [/dent|odonto|ortodon|implante/, 'odonto'],
  [/barbe/, 'barbearia'],
  [/salao|salão|cabel|estetic|estétic|unha|manicure|sobrancel|cilio|cílio|maqui|beleza|depila|spa|massag/, 'beleza'],
  [/pet|veterin|banho e tosa|canil|dog|gato/, 'pet'],
  [/padar|confeit|doce|bolo|cafe|café|cafeter|sorvet|açaí|acai/, 'padaria'],
  [/restaur|lanch|hamburg|pizza|bar\b|bares|churras|marmit|delivery|sushi|japon|comida|gastron|pastel|espetin|food/, 'comida'],
  [/academ|personal|pilates|crossfit|fitness|treino|yoga|lutas|funcional|esport/, 'fitness'],
  [/advog|advoca|juridic|jurídic|contab|contador|despach/, 'juridico'],
  [/imobil|imóve|imove|corretor|constru|arquitet|engenh|reforma|pedreir|marcen/, 'imoveis'],
  [/mecan|oficina|auto|carro|moto|funilar|lava.?jato|pneu|veícul|veicul/, 'automotivo'],
  [/escola|curso|professor|aula|idioma|ingl|reforço|reforco|educa/, 'educacao'],
  [/moda|roupa|boutique|loja|calçad|calcad|acessór|acessor|joia|ótica|otica/, 'moda'],
  [/foto|event|festa|buffet|decora|casament|dj\b|músic|music/, 'eventos'],
  [/clinic|clínic|medic|médic|fisio|psicol|nutri|fono|enferm|terap|saude|saúde|farm|laborat|quiropr/, 'saude'],
  [/tecnolog|informát|informat|celular|assist|software|marketing|agência|agencia|design|grafica|gráfica/, 'tecnologia'],
];

export function nicheKey(niche?: string | null) {
  const t = String(niche || '').toLowerCase();
  for (const [re, k] of RULES) if (re.test(t)) return k;
  return 'geral';
}
