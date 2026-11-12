import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type Lang = 'fr' | 'en' | 'es';
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
];

const en = {
  newPasswordTitle: 'Choose a new password',
  savePassword: 'Save password',
  passwordUpdated: 'Your password was updated.',
  appName: 'Not Busy Alert',
  tagline: "Save the places you go to, and get a notification when they're quiet.",
  continueWithGoogle: 'Continue with Google',
  or: 'or',
  email: 'Email',
  password: 'Password',
  signIn: 'Sign in',
  signUp: 'Create account',
  haveAccount: 'Already have an account? Sign in',
  noAccount: 'New here? Create an account',
  forgotPassword: 'Forgot password?',
  resetSent: 'We sent you an email with a link to reset your password.',
  confirmEmail: 'Almost done! Check your email and tap the link to confirm your account.',
  enterEmail: 'Enter your email address first.',
  passwordTooShort: 'Password must be at least 8 characters.',
  invalidLogin: 'Wrong email or password.',
  emailNotConfirmed: 'Please confirm your email first. Check your inbox.',
  alreadyRegistered: 'An account with this email already exists. Sign in instead.',
  signOut: 'Sign out',
  searchPlaceholder: 'Search for a place or address',
  myPlaces: 'My places',
  emptyFavorites: 'Search for a place above, then tap "Add to favorites" to get alerts when it\'s quiet.',
  alertUnder: (n: number) => `Alert under ${n}% busy`,
  alertsOff: 'Alerts off',
  back: '‹ Back',
  popularTimes: 'Popular times',
  live: 'Live',
  noLive: 'No live data right now.',
  noDayData: 'Google has no busyness data for this day.',
  addFavorite: '☆ Add to favorites',
  removeFavorite: 'Remove from favorites',
  alertWhenQuiet: "Alert me when it's quiet",
  whenUnder: 'When busyness is under',
  onDays: 'On these days',
  between: 'Between',
  and: 'and',
  midnight: 'Midnight',
  busyLabels: ['Not busy', 'Not too busy', 'A little busy', 'Busy'],
  daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  daysLetter: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  hour: (h: number) => (h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`),
  hourShort: (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`,
  pushWeb: 'Alerts on the web version are not supported yet. Use the phone app.',
  pushSimulator: 'Push alerts need a real phone, not a simulator.',
  pushExpoGoAndroid: 'Expo Go on Android cannot receive alerts. Use a development build to test them.',
  pushDenied: 'Notifications are turned off for this app.',
};

export type Strings = typeof en;

const fr: Strings = {
  newPasswordTitle: 'Choisissez un nouveau mot de passe',
  savePassword: 'Enregistrer',
  passwordUpdated: 'Votre mot de passe a été mis à jour.',
  appName: 'Not Busy Alert',
  tagline: "Enregistrez vos endroits préférés et recevez une notification quand c'est tranquille.",
  continueWithGoogle: 'Continuer avec Google',
  or: 'ou',
  email: 'Courriel',
  password: 'Mot de passe',
  signIn: 'Se connecter',
  signUp: 'Créer un compte',
  haveAccount: 'Déjà un compte? Se connecter',
  noAccount: 'Nouveau? Créer un compte',
  forgotPassword: 'Mot de passe oublié?',
  resetSent: 'Nous vous avons envoyé un courriel pour réinitialiser votre mot de passe.',
  confirmEmail: 'Presque fini! Vérifiez vos courriels et touchez le lien pour confirmer votre compte.',
  enterEmail: "Entrez d'abord votre adresse courriel.",
  passwordTooShort: 'Le mot de passe doit contenir au moins 8 caractères.',
  invalidLogin: 'Courriel ou mot de passe incorrect.',
  emailNotConfirmed: "Veuillez d'abord confirmer votre courriel. Vérifiez votre boîte de réception.",
  alreadyRegistered: 'Un compte existe déjà avec ce courriel. Connectez-vous plutôt.',
  signOut: 'Se déconnecter',
  searchPlaceholder: 'Rechercher un endroit ou une adresse',
  myPlaces: 'Mes endroits',
  emptyFavorites: 'Recherchez un endroit ci-dessus, puis touchez « Ajouter aux favoris » pour être averti quand c\'est tranquille.',
  alertUnder: (n: number) => `Alerte sous ${n} % d'achalandage`,
  alertsOff: 'Alertes désactivées',
  back: '‹ Retour',
  popularTimes: 'Heures de grande affluence',
  live: 'En direct',
  noLive: 'Aucune donnée en direct pour le moment.',
  noDayData: "Google n'a pas de données d'achalandage pour cette journée.",
  addFavorite: '☆ Ajouter aux favoris',
  removeFavorite: 'Retirer des favoris',
  alertWhenQuiet: "M'avertir quand c'est tranquille",
  whenUnder: "Quand l'achalandage est sous",
  onDays: 'Ces jours-là',
  between: 'Entre',
  and: 'et',
  midnight: 'Minuit',
  busyLabels: ['Peu achalandé', 'Pas trop achalandé', 'Un peu achalandé', 'Achalandé'],
  daysShort: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'],
  daysLetter: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
  hour: (h: number) => `${h} h`,
  hourShort: (h: number) => `${h}h`,
  pushWeb: "Les alertes ne sont pas encore offertes sur la version Web. Utilisez l'application mobile.",
  pushSimulator: 'Les alertes nécessitent un vrai téléphone, pas un simulateur.',
  pushExpoGoAndroid: 'Expo Go sur Android ne peut pas recevoir les alertes. Utilisez une version de développement.',
  pushDenied: 'Les notifications sont désactivées pour cette application.',
};

const es: Strings = {
  newPasswordTitle: 'Elige una nueva contraseña',
  savePassword: 'Guardar contraseña',
  passwordUpdated: 'Tu contraseña se actualizó.',
  appName: 'Not Busy Alert',
  tagline: 'Guarda tus lugares favoritos y recibe una notificación cuando estén tranquilos.',
  continueWithGoogle: 'Continuar con Google',
  or: 'o',
  email: 'Correo electrónico',
  password: 'Contraseña',
  signIn: 'Iniciar sesión',
  signUp: 'Crear cuenta',
  haveAccount: '¿Ya tienes cuenta? Inicia sesión',
  noAccount: '¿Eres nuevo? Crea una cuenta',
  forgotPassword: '¿Olvidaste tu contraseña?',
  resetSent: 'Te enviamos un correo con un enlace para restablecer tu contraseña.',
  confirmEmail: '¡Casi listo! Revisa tu correo y toca el enlace para confirmar tu cuenta.',
  enterEmail: 'Primero escribe tu correo electrónico.',
  passwordTooShort: 'La contraseña debe tener al menos 8 caracteres.',
  invalidLogin: 'Correo o contraseña incorrectos.',
  emailNotConfirmed: 'Primero confirma tu correo. Revisa tu bandeja de entrada.',
  alreadyRegistered: 'Ya existe una cuenta con este correo. Inicia sesión.',
  signOut: 'Cerrar sesión',
  searchPlaceholder: 'Busca un lugar o una dirección',
  myPlaces: 'Mis lugares',
  emptyFavorites: 'Busca un lugar arriba y toca "Añadir a favoritos" para recibir alertas cuando esté tranquilo.',
  alertUnder: (n: number) => `Alerta por debajo de ${n}% de afluencia`,
  alertsOff: 'Alertas desactivadas',
  back: '‹ Volver',
  popularTimes: 'Horas más concurridas',
  live: 'En vivo',
  noLive: 'No hay datos en vivo ahora mismo.',
  noDayData: 'Google no tiene datos de afluencia para este día.',
  addFavorite: '☆ Añadir a favoritos',
  removeFavorite: 'Quitar de favoritos',
  alertWhenQuiet: 'Avísame cuando esté tranquilo',
  whenUnder: 'Cuando la afluencia esté por debajo de',
  onDays: 'Estos días',
  between: 'Entre',
  and: 'y',
  midnight: 'Medianoche',
  busyLabels: ['Poco concurrido', 'No muy concurrido', 'Algo concurrido', 'Concurrido'],
  daysShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  daysLetter: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
  hour: (h: number) => `${h}:00`,
  hourShort: (h: number) => `${h}`,
  pushWeb: 'Las alertas aún no están disponibles en la versión web. Usa la app del teléfono.',
  pushSimulator: 'Las alertas necesitan un teléfono real, no un simulador.',
  pushExpoGoAndroid: 'Expo Go en Android no puede recibir alertas. Usa una versión de desarrollo.',
  pushDenied: 'Las notificaciones están desactivadas para esta app.',
};

export const STRINGS: Record<Lang, Strings> = { fr, en, es };

// Quebec is the main audience, so French is the fallback for any other language.
export function deviceLang(): Lang {
  const code = getLocales()[0]?.languageCode;
  return code === 'en' || code === 'es' || code === 'fr' ? code : 'fr';
}

// Busyness word for a 0-100 score, in the current language.
export function busyLabel(t: Strings, score: number) {
  return t.busyLabels[score < 25 ? 0 : score < 50 ? 1 : score < 75 ? 2 : 3];
}

const KEY = 'lang';
type Ctx = { lang: Lang; t: Strings; setLang: (l: Lang) => void };
const I18nContext = createContext<Ctx>({ lang: 'fr', t: fr, setLang: () => {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(deviceLang());

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => { if (saved === 'fr' || saved === 'en' || saved === 'es') setLangState(saved); })
      .catch(() => {});
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    AsyncStorage.setItem(KEY, l).catch(() => {});
  }

  return <I18nContext.Provider value={{ lang, t: STRINGS[lang], setLang }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
