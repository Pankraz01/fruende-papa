// Kontakt-Link-Typen: Icon (inline SVG), Beschriftung und wie aus dem
// JSON-Wert eine URL wird.
//
// Die Icons sind bewusst inline und nicht als externe Sprite-Datei:
// `<use href="sprite.svg#id">` ist in Safari unzuverlässig, und auf einer
// Seite, die vom Handy gescannt wird, darf kein Icon fehlen.

const stroke = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const filled = (paths) =>
  `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${paths}</svg>`;

/** Wert bereinigen: führendes @, Leerzeichen und URL-Reste entfernen. */
const handle = (v) =>
  String(v)
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?[^/]+\//, '')
    .replace(/\/$/, '');

/** Nur Ziffern behalten – für Telefonnummern. */
const digits = (v) => String(v).replace(/[^\d+]/g, '');

export const LINK_TYPES = {
  instagram: {
    label: 'Instagram',
    href: (v) => `https://instagram.com/${handle(v)}`,
    icon: stroke(
      '<rect x="3" y="3" width="18" height="18" rx="5.2"/>' +
        '<circle cx="12" cy="12" r="4.1"/>' +
        '<circle cx="17.1" cy="6.9" r="1.15" fill="currentColor" stroke="none"/>'
    ),
  },

  whatsapp: {
    label: 'WhatsApp',
    href: (v) => `https://wa.me/${digits(v).replace(/^\+/, '')}`,
    icon: stroke(
      '<path d="M12 2.6a9.4 9.4 0 0 0-8.1 14.2L2.6 21.4l4.7-1.3A9.4 9.4 0 1 0 12 2.6Z"/>' +
        '<path d="M9.1 8.4c.3-.6.85-.6 1.15 0l.6 1.2c.2.4.1.65-.2.95l-.4.4c-.12.18-.12.32 0 .5.42.8 1.2 1.58 2 2 .18.12.32.12.5 0l.4-.4c.3-.3.55-.4.95-.2l1.2.6c.6.3.6.85 0 1.15-.6.4-1.35.7-2.05.6-2.3-.3-4.4-2.4-4.7-4.7-.1-.7.15-1.45.55-2.1Z" fill="currentColor" stroke="none"/>'
    ),
  },

  email: {
    label: 'E-Mail',
    href: (v) => `mailto:${String(v).trim()}`,
    icon: stroke(
      '<rect x="2.5" y="5" width="19" height="14" rx="2.6"/>' +
        '<path d="m3.6 7.4 8.4 5.9 8.4-5.9"/>'
    ),
  },

  telefon: {
    label: 'Anrufen',
    href: (v) => `tel:${digits(v)}`,
    icon: stroke(
      '<path d="M21.5 16.9v2.9a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3 19.3 19.3 0 0 1-6-6 19.6 19.6 0 0 1-3-8.6 2 2 0 0 1 2-2.2h2.9a2 2 0 0 1 2 1.7c.13.9.36 1.8.7 2.65a2 2 0 0 1-.46 2.1L7.8 9.9a15.8 15.8 0 0 0 6 6l1.35-1.15a2 2 0 0 1 2.1-.45c.85.33 1.75.56 2.65.7a2 2 0 0 1 1.7 2Z"/>'
    ),
  },

  linkedin: {
    label: 'LinkedIn',
    href: (v) =>
      /^https?:\/\//.test(String(v).trim())
        ? String(v).trim()
        : `https://linkedin.com/in/${handle(v)}`,
    icon:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' +
      '<rect x="3" y="3" width="18" height="18" rx="4"/>' +
      '<circle cx="7.6" cy="8.1" r="1.25" fill="currentColor" stroke="none"/>' +
      '<path d="M6.6 10.9h2v6.6h-2z" fill="currentColor" stroke="none"/>' +
      '<path d="M10.9 17.5v-6.6h1.9v.9a2.5 2.5 0 0 1 2.15-1.05c1.6 0 2.55 1 2.55 2.9v3.85h-2v-3.5c0-1-.4-1.5-1.2-1.5s-1.35.55-1.35 1.6v3.4z" fill="currentColor" stroke="none"/>' +
      '</svg>',
  },

  tiktok: {
    label: 'TikTok',
    href: (v) => `https://tiktok.com/@${handle(v)}`,
    icon: filled(
      '<path d="M16.4 2.8h-2.75v12.35a2.35 2.35 0 1 1-1.95-2.32v-2.75a5.05 5.05 0 1 0 4.7 5.04V9.1a6.1 6.1 0 0 0 3.5 1.1V7.45a3.55 3.55 0 0 1-3.5-3.5V2.8Z"/>'
    ),
  },

  snapchat: {
    label: 'Snapchat',
    href: (v) => `https://snapchat.com/add/${handle(v)}`,
    icon: stroke(
      '<path d="M12 2.9c2.6 0 4.45 1.95 4.55 4.55.03.8-.05 1.6-.08 2.1.3.13.7.05 1-.1.55-.25 1.15.3.92.9-.2.52-.9.82-1.4 1-.28.1-.38.3-.28.58.5 1.4 1.7 2.55 3 2.85.4.1.5.6.18.87-.6.5-1.65.72-2.15.82-.2.4-.2.98-.7 1.08-.6.12-1.4-.2-2.3-.1-.9.1-1.6 1-3 1s-2.1-.9-3-1c-.9-.1-1.7.22-2.3.1-.5-.1-.5-.68-.7-1.08-.5-.1-1.55-.32-2.15-.82-.32-.27-.22-.77.18-.87 1.3-.3 2.5-1.45 3-2.85.1-.28 0-.48-.28-.58-.5-.18-1.2-.48-1.4-1-.23-.6.37-1.15.92-.9.3.15.7.23 1 .1-.03-.5-.11-1.3-.08-2.1C7.55 4.85 9.4 2.9 12 2.9Z"/>'
    ),
  },

  website: {
    label: 'Website',
    href: (v) =>
      /^https?:\/\//.test(String(v).trim())
        ? String(v).trim()
        : `https://${String(v).trim()}`,
    icon: stroke(
      '<circle cx="12" cy="12" r="9"/>' +
        '<path d="M3 12h18"/>' +
        '<path d="M12 3a13.5 13.5 0 0 1 0 18 13.5 13.5 0 0 1 0-18Z"/>'
    ),
  },
};

export const LINK_TYPE_NAMES = Object.keys(LINK_TYPES);
