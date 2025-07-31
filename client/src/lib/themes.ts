export interface ColorTheme {
  name: string;
  label: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    input: string;
    ring: string;
    destructive: string;
    destructiveForeground: string;
  };
  darkColors?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    input: string;
    ring: string;
    destructive: string;
    destructiveForeground: string;
  };
}

export const themes: ColorTheme[] = [
  {
    name: "default",
    label: "Default Blue",
    colors: {
      primary: "hsl(222, 84%, 55%)",
      secondary: "hsl(210, 40%, 96%)",
      accent: "hsl(210, 40%, 96%)",
      background: "hsl(0, 0%, 100%)",
      foreground: "hsl(222, 84%, 4.9%)",
      card: "hsl(0, 0%, 100%)",
      cardForeground: "hsl(222, 84%, 4.9%)",
      popover: "hsl(0, 0%, 100%)",
      popoverForeground: "hsl(222, 84%, 4.9%)",
      muted: "hsl(210, 40%, 96%)",
      mutedForeground: "hsl(215, 16%, 47%)",
      border: "hsl(214, 32%, 91%)",
      input: "hsl(214, 32%, 91%)",
      ring: "hsl(222, 84%, 55%)",
      destructive: "hsl(0, 84%, 60%)",
      destructiveForeground: "hsl(210, 40%, 98%)",
    },
    darkColors: {
      primary: "hsl(222, 84%, 55%)",
      secondary: "hsl(217, 33%, 17%)",
      accent: "hsl(217, 33%, 17%)",
      background: "hsl(222, 84%, 4.9%)",
      foreground: "hsl(210, 40%, 98%)",
      card: "hsl(222, 84%, 4.9%)",
      cardForeground: "hsl(210, 40%, 98%)",
      popover: "hsl(222, 84%, 4.9%)",
      popoverForeground: "hsl(210, 40%, 98%)",
      muted: "hsl(217, 33%, 17%)",
      mutedForeground: "hsl(215, 20%, 65%)",
      border: "hsl(217, 33%, 17%)",
      input: "hsl(217, 33%, 17%)",
      ring: "hsl(222, 84%, 55%)",
      destructive: "hsl(0, 63%, 31%)",
      destructiveForeground: "hsl(210, 40%, 98%)",
    },
  },
  {
    name: "emerald",
    label: "Emerald Green",
    colors: {
      primary: "hsl(142, 76%, 36%)",
      secondary: "hsl(138, 62%, 95%)",
      accent: "hsl(138, 62%, 95%)",
      background: "hsl(0, 0%, 100%)",
      foreground: "hsl(142, 76%, 6%)",
      card: "hsl(0, 0%, 100%)",
      cardForeground: "hsl(142, 76%, 6%)",
      popover: "hsl(0, 0%, 100%)",
      popoverForeground: "hsl(142, 76%, 6%)",
      muted: "hsl(138, 62%, 95%)",
      mutedForeground: "hsl(140, 25%, 47%)",
      border: "hsl(139, 38%, 91%)",
      input: "hsl(139, 38%, 91%)",
      ring: "hsl(142, 76%, 36%)",
      destructive: "hsl(0, 84%, 60%)",
      destructiveForeground: "hsl(138, 62%, 98%)",
    },
    darkColors: {
      primary: "hsl(142, 76%, 36%)",
      secondary: "hsl(141, 30%, 17%)",
      accent: "hsl(141, 30%, 17%)",
      background: "hsl(142, 76%, 4%)",
      foreground: "hsl(138, 62%, 98%)",
      card: "hsl(142, 76%, 4%)",
      cardForeground: "hsl(138, 62%, 98%)",
      popover: "hsl(142, 76%, 4%)",
      popoverForeground: "hsl(138, 62%, 98%)",
      muted: "hsl(141, 30%, 17%)",
      mutedForeground: "hsl(140, 25%, 65%)",
      border: "hsl(141, 30%, 17%)",
      input: "hsl(141, 30%, 17%)",
      ring: "hsl(142, 76%, 36%)",
      destructive: "hsl(0, 63%, 31%)",
      destructiveForeground: "hsl(138, 62%, 98%)",
    },
  },
  {
    name: "purple",
    label: "Royal Purple",
    colors: {
      primary: "hsl(262, 83%, 58%)",
      secondary: "hsl(270, 100%, 98%)",
      accent: "hsl(270, 100%, 98%)",
      background: "hsl(0, 0%, 100%)",
      foreground: "hsl(262, 83%, 8%)",
      card: "hsl(0, 0%, 100%)",
      cardForeground: "hsl(262, 83%, 8%)",
      popover: "hsl(0, 0%, 100%)",
      popoverForeground: "hsl(262, 83%, 8%)",
      muted: "hsl(270, 100%, 98%)",
      mutedForeground: "hsl(266, 25%, 47%)",
      border: "hsl(270, 54%, 91%)",
      input: "hsl(270, 54%, 91%)",
      ring: "hsl(262, 83%, 58%)",
      destructive: "hsl(0, 84%, 60%)",
      destructiveForeground: "hsl(270, 100%, 98%)",
    },
    darkColors: {
      primary: "hsl(262, 83%, 58%)",
      secondary: "hsl(270, 50%, 15%)",
      accent: "hsl(270, 50%, 15%)",
      background: "hsl(262, 83%, 6%)",
      foreground: "hsl(270, 100%, 98%)",
      card: "hsl(262, 83%, 6%)",
      cardForeground: "hsl(270, 100%, 98%)",
      popover: "hsl(262, 83%, 6%)",
      popoverForeground: "hsl(270, 100%, 98%)",
      muted: "hsl(270, 50%, 15%)",
      mutedForeground: "hsl(266, 25%, 65%)",
      border: "hsl(270, 50%, 15%)",
      input: "hsl(270, 50%, 15%)",
      ring: "hsl(262, 83%, 58%)",
      destructive: "hsl(0, 63%, 31%)",
      destructiveForeground: "hsl(270, 100%, 98%)",
    },
  },
  {
    name: "orange",
    label: "Vibrant Orange",
    colors: {
      primary: "hsl(25, 95%, 53%)",
      secondary: "hsl(25, 100%, 96%)",
      accent: "hsl(25, 100%, 96%)",
      background: "hsl(0, 0%, 100%)",
      foreground: "hsl(25, 95%, 7%)",
      card: "hsl(0, 0%, 100%)",
      cardForeground: "hsl(25, 95%, 7%)",
      popover: "hsl(0, 0%, 100%)",
      popoverForeground: "hsl(25, 95%, 7%)",
      muted: "hsl(25, 100%, 96%)",
      mutedForeground: "hsl(24, 25%, 47%)",
      border: "hsl(25, 62%, 91%)",
      input: "hsl(25, 62%, 91%)",
      ring: "hsl(25, 95%, 53%)",
      destructive: "hsl(0, 84%, 60%)",
      destructiveForeground: "hsl(25, 100%, 98%)",
    },
    darkColors: {
      primary: "hsl(25, 95%, 53%)",
      secondary: "hsl(25, 50%, 15%)",
      accent: "hsl(25, 50%, 15%)",
      background: "hsl(25, 95%, 4%)",
      foreground: "hsl(25, 100%, 98%)",
      card: "hsl(25, 95%, 4%)",
      cardForeground: "hsl(25, 100%, 98%)",
      popover: "hsl(25, 95%, 4%)",
      popoverForeground: "hsl(25, 100%, 98%)",
      muted: "hsl(25, 50%, 15%)",
      mutedForeground: "hsl(24, 25%, 65%)",
      border: "hsl(25, 50%, 15%)",
      input: "hsl(25, 50%, 15%)",
      ring: "hsl(25, 95%, 53%)",
      destructive: "hsl(0, 63%, 31%)",
      destructiveForeground: "hsl(25, 100%, 98%)",
    },
  },
  {
    name: "rose",
    label: "Rose Pink",
    colors: {
      primary: "hsl(346, 77%, 49%)",
      secondary: "hsl(347, 100%, 97%)",
      accent: "hsl(347, 100%, 97%)",
      background: "hsl(0, 0%, 100%)",
      foreground: "hsl(346, 77%, 9%)",
      card: "hsl(0, 0%, 100%)",
      cardForeground: "hsl(346, 77%, 9%)",
      popover: "hsl(0, 0%, 100%)",
      popoverForeground: "hsl(346, 77%, 9%)",
      muted: "hsl(347, 100%, 97%)",
      mutedForeground: "hsl(346, 25%, 47%)",
      border: "hsl(347, 62%, 91%)",
      input: "hsl(347, 62%, 91%)",
      ring: "hsl(346, 77%, 49%)",
      destructive: "hsl(0, 84%, 60%)",
      destructiveForeground: "hsl(347, 100%, 98%)",
    },
    darkColors: {
      primary: "hsl(346, 77%, 49%)",
      secondary: "hsl(347, 50%, 15%)",
      accent: "hsl(347, 50%, 15%)",
      background: "hsl(346, 77%, 4%)",
      foreground: "hsl(347, 100%, 98%)",
      card: "hsl(346, 77%, 4%)",
      cardForeground: "hsl(347, 100%, 98%)",
      popover: "hsl(346, 77%, 4%)",
      popoverForeground: "hsl(347, 100%, 98%)",
      muted: "hsl(347, 50%, 15%)",
      mutedForeground: "hsl(346, 25%, 65%)",
      border: "hsl(347, 50%, 15%)",
      input: "hsl(347, 50%, 15%)",
      ring: "hsl(346, 77%, 49%)",
      destructive: "hsl(0, 63%, 31%)",
      destructiveForeground: "hsl(347, 100%, 98%)",
    },
  },
  {
    name: "slate",
    label: "Modern Slate",
    colors: {
      primary: "hsl(215, 28%, 17%)",
      secondary: "hsl(210, 40%, 96%)",
      accent: "hsl(210, 40%, 96%)",
      background: "hsl(0, 0%, 100%)",
      foreground: "hsl(215, 28%, 17%)",
      card: "hsl(0, 0%, 100%)",
      cardForeground: "hsl(215, 28%, 17%)",
      popover: "hsl(0, 0%, 100%)",
      popoverForeground: "hsl(215, 28%, 17%)",
      muted: "hsl(210, 40%, 96%)",
      mutedForeground: "hsl(215, 16%, 47%)",
      border: "hsl(214, 32%, 91%)",
      input: "hsl(214, 32%, 91%)",
      ring: "hsl(215, 28%, 17%)",
      destructive: "hsl(0, 84%, 60%)",
      destructiveForeground: "hsl(210, 40%, 98%)",
    },
    darkColors: {
      primary: "hsl(210, 40%, 98%)",
      secondary: "hsl(217, 33%, 17%)",
      accent: "hsl(217, 33%, 17%)",
      background: "hsl(224, 71%, 4%)",
      foreground: "hsl(210, 40%, 98%)",
      card: "hsl(224, 71%, 4%)",
      cardForeground: "hsl(210, 40%, 98%)",
      popover: "hsl(224, 71%, 4%)",
      popoverForeground: "hsl(210, 40%, 98%)",
      muted: "hsl(217, 33%, 17%)",
      mutedForeground: "hsl(215, 20%, 65%)",
      border: "hsl(217, 33%, 17%)",
      input: "hsl(217, 33%, 17%)",
      ring: "hsl(210, 40%, 98%)",
      destructive: "hsl(0, 63%, 31%)",
      destructiveForeground: "hsl(210, 40%, 98%)",
    },
  },
];

export function getTheme(name: string): ColorTheme {
  return themes.find(theme => theme.name === name) || themes[0];
}

export function applyTheme(themeName: string, isDark: boolean = false) {
  const theme = getTheme(themeName);
  const colors = isDark && theme.darkColors ? theme.darkColors : theme.colors;
  
  const root = document.documentElement;
  
  // Apply CSS custom properties
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--secondary', colors.secondary);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--background', colors.background);
  root.style.setProperty('--foreground', colors.foreground);
  root.style.setProperty('--card', colors.card);
  root.style.setProperty('--card-foreground', colors.cardForeground);
  root.style.setProperty('--popover', colors.popover);
  root.style.setProperty('--popover-foreground', colors.popoverForeground);
  root.style.setProperty('--muted', colors.muted);
  root.style.setProperty('--muted-foreground', colors.mutedForeground);
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--input', colors.input);
  root.style.setProperty('--ring', colors.ring);
  root.style.setProperty('--destructive', colors.destructive);
  root.style.setProperty('--destructive-foreground', colors.destructiveForeground);
}