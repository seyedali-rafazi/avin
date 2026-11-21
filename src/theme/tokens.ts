/**
 * Design system tokens extracted directly from the 8 UI reference screens.
 * Deep pure black backgrounds, dark charcoal cards, and vibrant neon purple accents.
 */
export const Colors = {
  // Core Backgrounds
  background: '#050505',
  backgroundSecondary: '#0A0A0D',
  surface: '#131317',
  surfaceElevated: '#1A1A1F',
  surfaceHighlight: '#1B1526', // Active track in Up Next queue
  surfaceIconBadge: '#24173A', // Library category icon container

  // Accents
  accent: '#913DFF',
  accentSecondary: '#B06AFF',
  accentMuted: 'rgba(145, 61, 255, 0.18)',
  accentGlow: 'rgba(145, 61, 255, 0.40)',

  // Gradients
  heroGradient: ['#3D167C', '#210C45', '#0D0916'] as const,
  favoritesGradient: ['#4C1D95', '#27104D', '#180B2E'] as const,
  artworkPlaceholderGradient: ['#2B1452', '#171124'] as const,

  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',

  // Borders & Dividers
  divider: '#222228',
  border: '#25252B',
  borderDashed: '#2E2E36',

  // Controls
  trackBackground: '#27272D',
  switchTrackOff: '#32323A',
  switchThumb: '#FFFFFF',

  // Semantic
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.15)',
  success: '#22C55E',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.72)',
  tabBarBackground: '#09090C',
} as const;

export const Typography = {
  screenTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    color: Colors.textPrimary,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  playerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    color: Colors.textPrimary,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textMuted,
  },
  micro: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textMuted,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
} as const;

export const Spacing = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  full: 9999,
} as const;

export const IconSizes = {
  xs: 14,
  sm: 18,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export const Layout = {
  screenPadding: 16,
  miniPlayerHeight: 62,
  tabBarHeight: 60,
  playButtonSize: 66,
  songRowArtwork: 48,
  miniPlayerArtwork: 42,
  horizontalCardWidth: 112,
} as const;
