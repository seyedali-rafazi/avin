/**
 * Design system tokens for Avin (آوین) Persian RTL Music Player.
 * Deep pure black backgrounds, dark charcoal cards, vibrant neon purple accents,
 * and Vazirmatn typography tuned for crisp Persian rendering.
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

export const Fonts = {
  regular: 'Vazirmatn_400Regular',
  medium: 'Vazirmatn_500Medium',
  semiBold: 'Vazirmatn_600SemiBold',
  bold: 'Vazirmatn_700Bold',
  extraBold: 'Vazirmatn_800ExtraBold',
} as const;

export const Typography = {
  screenTitle: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    lineHeight: 36,
    color: Colors.textPrimary,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  greeting: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    lineHeight: 32,
    color: Colors.textPrimary,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  playerTitle: {
    fontFamily: Fonts.bold,
    fontSize: 21,
    lineHeight: 32,
    color: Colors.textPrimary,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  heroTitle: {
    fontFamily: Fonts.bold,
    fontSize: 19,
    lineHeight: 30,
    color: Colors.textPrimary,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    lineHeight: 26,
    color: Colors.textPrimary,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  cardTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  rowTitle: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 18,
    color: Colors.textMuted,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  micro: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 17,
    color: Colors.textMuted,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  tabLabel: {
    fontFamily: Fonts.medium,
    fontSize: 10.5,
    lineHeight: 16,
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
  miniPlayerHeight: 64,
  tabBarHeight: 64,
  playButtonSize: 66,
  songRowArtwork: 48,
  miniPlayerArtwork: 44,
  horizontalCardWidth: 116,
} as const;
