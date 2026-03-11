import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  fr: {
    translation: {
      actions: {
        search: 'Rechercher…',
        save: 'Enregistrer',
        cancel: 'Annuler',
      },
      auth: {
        loginTitle: 'Connexion administrateur',
        email: 'Email professionnel',
        password: 'Mot de passe',
        forgot: 'Mot de passe oublié ?',
      },
      layout: {
        quickActions: 'Actions rapides',
      },
    },
  },
  en: {
    translation: {
      actions: {
        search: 'Search…',
        save: 'Save',
        cancel: 'Cancel',
      },
      auth: {
        loginTitle: 'Admin sign in',
        email: 'Work email',
        password: 'Password',
        forgot: 'Forgot password?',
      },
      layout: {
        quickActions: 'Quick actions',
      },
    },
  },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'fr',
    fallbackLng: ['fr', 'en'],
    interpolation: { escapeValue: false },
  });
}

export default i18n;

