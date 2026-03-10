import Ionicons from '@expo/vector-icons/Ionicons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useReferrals } from '@/src/hooks/useReferrals';
import { useUserProfile } from '@/src/hooks/useUserProfile';
import { useWallet } from '@/src/hooks/useWallet';
import { colors, radius, spacing } from '../constants/theme';
import { useNotifications } from '../context/NotificationsContext';
import { HomeStackParamList } from '../navigation/HomeStack';
import type { MainStackParamList } from '../navigation/MainStack';
import { BudgetAiMessage, getBudgetAiAdvice } from '../services/openai';
import { createPowensSession, openPowensFlow } from '../services/powens';
import {
  requestSpeechPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
  subscribeToSpeechResults,
  unsubscribeFromSpeechResults,
} from '../services/speech';
import { ProfileSectionId } from '../types/profile';

type ProfileDetailRoute = RouteProp<HomeStackParamList, 'ProfileDetail'>;

const HERO_CONTENT: Record<
  ProfileSectionId,
  {
    title: string;
    subtitle: string;
  }
> = {
  history: {
    title: 'Historique des gains',
    subtitle: 'Suivez en temps réel les gains KashUP générés par vos achats.',
  },
  banks: {
    title: 'Connexions bancaires',
    subtitle: 'Cartes et comptes liés sécurisés via Powens.',
  },
  budget: {
    title: 'Analyse du budget',
    subtitle: 'Comprenez comment vos dépenses locales évoluent chaque mois.',
  },
  payments: {
    title: 'Moyens de paiement',
    subtitle: 'Centralisez vos cartes pour profiter du cashback automatiquement.',
  },
  personal: {
    title: 'Informations personnelles',
    subtitle: 'Vos coordonnées et préférences sont modifiables ici.',
  },
  account: {
    title: 'Sécurité du compte',
    subtitle: 'Activez toutes les protections proposées par KashUP.',
  },
  invite: {
    title: 'Parrainer un proche',
    subtitle: 'Partagez votre lien et gagnez des boosts à chaque inscription.',
  },
  referrals: {
    title: 'Mes parrainages',
    subtitle: 'Suivez l’avancement et les récompenses obtenues grâce à vos filleuls.',
  },
  support: {
    title: 'Assistance KashUP',
    subtitle: 'Discutez avec nous, envoyez un e-mail ou consultez la FAQ.',
  },
  terms: {
    title: 'Conditions générales',
    subtitle: 'Les engagements KashUP et les droits des utilisateurs.',
  },
  privacy: {
    title: 'Vie privée',
    subtitle: 'Contrôlez vos données personnelles et vos autorisations.',
  },
};

const MAX_HISTORY_ITEMS = 8;

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) {
    return '--';
  }
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
};

const formatHistoryDate = (isoDate: string) => {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatCashback = (value: number) => {
  const prefix = value >= 0 ? '+' : '-';
  return `${prefix}${Math.abs(value).toFixed(2)} €`;
};

const generateReferralCode = (firstName?: string | null, lastName?: string | null) => {
  const safe = (value?: string | null) => {
    if (!value) return 'XXX';
    const letters = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return letters.slice(0, 3).toUpperCase().padEnd(3, 'X');
  };
  return `${safe(firstName)}-${safe(lastName)}`;
};

const supportChannels = [
  { id: 's1', label: 'Chat instantané', description: 'Disponible du lundi au samedi, 9h - 19h' },
  { id: 's2', label: 'E-mail', description: 'support@kashup.com — réponse sous 24h' },
  { id: 's3', label: 'Centre d’aide', description: 'Guides, FAQ et procédures étape par étape' },
];

type ProfileDetailNav = NativeStackNavigationProp<HomeStackParamList>;
type MainNav = NativeStackNavigationProp<MainStackParamList>;

const BOTTOM_TAB_BAR_HEIGHT = 90;

export default function ProfileDetailScreen() {
  const navigation = useNavigation<ProfileDetailNav>();
  const mainNavigation = useNavigation<MainNav>();
  const insets = useSafeAreaInsets();
  const route = useRoute<ProfileDetailRoute>();
  const { sectionId } = route.params;
  const [powensLoading, setPowensLoading] = useState(false);
  const [powensError, setPowensError] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<BudgetAiMessage[]>([
    {
      role: 'assistant',
      content:
        'Bonjour 👋 Je suis l’IA KashUP spécialisée dans l’analyse des dépenses. Posez-moi une question pour booster votre budget.',
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const notifications = useNotifications();
  const {
    data: walletData,
    loading: walletLoading,
    error: walletError,
    refetch: refetchWallet,
  } = useWallet();
  const {
    data: profile,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useUserProfile();
  const {
    summary: referralSummary,
    invitees,
    loading: referralsLoading,
    error: referralsError,
    refetch: refetchReferrals,
  } = useReferrals();

  const hero = HERO_CONTENT[sectionId] ?? {
    title: 'Profil KashUP',
    subtitle: 'Paramètres personnalisés',
  };

  const historyItems = useMemo(
    () => walletData.history.slice(0, MAX_HISTORY_ITEMS),
    [walletData.history]
  );
  const referralCode = useMemo(
    () => generateReferralCode(profile?.firstName, profile?.lastName),
    [profile?.firstName, profile?.lastName]
  );
  const powensUserId = profile?.id ?? 'demo-user';
  const monthlyObjective = null;
  const monthlyInjectedFromApi = null;

  const handlePowensConnect = async () => {
    try {
      setPowensLoading(true);
      setPowensError(null);
      const session = await createPowensSession(powensUserId);
      if (session?.connect_url) {
        await openPowensFlow(session.connect_url);
      } else {
        Alert.alert('Powens', 'Lien de connexion indisponible. Réessayez plus tard.');
      }
    } catch (error) {
      setPowensError('La connexion Powens est indisponible pour le moment.');
      Alert.alert('Powens', (error as Error).message);
    } finally {
      setPowensLoading(false);
    }
  };

  useEffect(() => {
    subscribeToSpeechResults((text) => {
      setAiInput(text);
    });
    return () => {
      unsubscribeFromSpeechResults();
    };
  }, []);

  const handleSendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) {
      return;
    }
    const newMessage: BudgetAiMessage = { role: 'user', content: aiInput.trim() };
    const nextMessages = [...aiMessages, newMessage];
    setAiMessages(nextMessages);
    setAiInput('');
    try {
      setAiLoading(true);
      const response = await getBudgetAiAdvice(nextMessages);
      setAiMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "L'IA KashUP est momentanément indisponible. Merci de réessayer dans quelques instants.",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      await stopSpeechRecognition();
      setIsRecording(false);
      return;
    }
    const granted = await requestSpeechPermissions();
    if (!granted) {
      notifications.addNotification({
        category: 'system',
        title: 'Activez votre micro',
        description: 'Autorisez l’accès au micro dans les réglages pour utiliser l’IA KashUP.',
      });
      Alert.alert('Micro désactivé', 'Activez votre micro dans les réglages pour parler à l’IA KashUP.');
      return;
    }
    setIsRecording(true);
    startSpeechRecognition(() => {
      setIsRecording(false);
    });
  };

  const renderAiAssistant = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Assistant KashUP</Text>
      <Text style={styles.cardText}>
        Discutez avec l’IA KashUP pour comprendre vos dépenses et recevoir des stratégies sur-mesure.
      </Text>
      <View style={styles.aiCardStandalone}>
        <ScrollView
          style={styles.aiScrollArea}
          contentContainerStyle={styles.aiMessages}
          showsVerticalScrollIndicator={false}>
          {aiMessages.map((message, index) => (
            <View
              key={`${message.role}-${index}`}
              style={[
                styles.aiBubble,
                message.role === 'user' ? styles.aiBubbleUser : styles.aiBubbleBot,
              ]}>
              <Text
                style={[
                  styles.aiBubbleText,
                  message.role === 'user' ? styles.aiBubbleTextUser : styles.aiBubbleTextBot,
                ]}>
                {message.content}
              </Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.aiInputRow}>
          <TextInput
            style={styles.aiInput}
            value={aiInput}
            onChangeText={setAiInput}
            placeholder={aiInput ? '' : 'Posez une question à l’IA KashUP'}
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.aiVoiceButton} onPress={handleVoiceToggle}>
            <Ionicons name={isRecording ? 'stop' : 'mic-outline'} size={18} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.aiSendButton, (aiLoading || !aiInput.trim()) && styles.aiSendButtonDisabled]}
            onPress={handleSendAiMessage}
            disabled={aiLoading || !aiInput.trim()}>
            {aiLoading ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" size={16} color={colors.white} />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (sectionId) {
      case 'history':
        return (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Derniers gains</Text>
                <TouchableOpacity onPress={refetchWallet} disabled={walletLoading}>
                  <Text style={[styles.link, walletLoading && styles.linkDisabled]}>
                    {walletLoading ? 'Actualisation...' : 'Actualiser'}
                  </Text>
                </TouchableOpacity>
              </View>
              {walletLoading && historyItems.length === 0 ? (
                <ActivityIndicator color={colors.primaryPurple} />
              ) : historyItems.length === 0 ? (
                <Text style={styles.cardText}>Aucune transaction n’a encore généré de cashback.</Text>
              ) : (
                historyItems.map((transaction, index) => {
                  const partnerName = transaction.partner?.name ?? 'Partenaire KashUP';
                  const transactionSource = transaction.source ?? 'Achat KashUP';
                  return (
                    <View key={transaction.id} style={[styles.row, index < historyItems.length - 1 && styles.rowDivider]}>
                      <View style={styles.rowLeft}>
                        <View style={styles.dot} />
                        <View style={styles.rowTextBlock}>
                          <Text style={styles.rowLabel}>{partnerName}</Text>
                          <Text style={styles.rowDescription}>{transactionSource}</Text>
                          <Text style={styles.rowMeta}>{formatHistoryDate(transaction.transactionDate)}</Text>
                        </View>
                      </View>
                      <View style={styles.amountBlock}>
                        <Text style={styles.amount}>{formatCashback(transaction.cashbackEarned)}</Text>
                        <Text style={styles.badge}>{transaction.status}</Text>
                      </View>
                    </View>
                  );
                })
              )}
              {walletError && <Text style={styles.errorText}>{walletError}</Text>}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bilan mensuel</Text>
              <View style={styles.statGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {formatCurrency(walletData.personalImpact.monthlyCashback)}
                  </Text>
                  <Text style={styles.statLabel}>Cashback reçu</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{walletData.personalImpact.purchasesCount} achats</Text>
                  <Text style={styles.statLabel}>Commerces visités</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {walletData.personalImpact.boostRate > 0
                      ? `+${walletData.personalImpact.boostRate.toFixed(1)} %`
                      : '--'}
                  </Text>
                  <Text style={styles.statLabel}>Boost moyen</Text>
                </View>
              </View>
              <View style={styles.goalGrid}>
                {[
                  {
                    id: 'goal',
                    label: 'Objectif mensuel',
                    value: monthlyObjective ? formatCurrency(monthlyObjective) : '--',
                    hint: 'Synchronisé depuis le back-office KashUP',
                  },
                  {
                    id: 'injected',
                    label: 'Injecté ce mois-ci',
                    value: monthlyInjectedFromApi ? formatCurrency(monthlyInjectedFromApi) : '--',
                    hint: 'Mise à jour après validation Powens',
                  },
                ].map((item) => (
                  <View key={item.id} style={styles.goalCard}>
                    <Text style={styles.goalLabel}>{item.label}</Text>
                    <Text style={styles.goalValue}>{item.value}</Text>
                    <Text style={styles.goalHint}>{item.hint}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        );
      case 'banks':
        return (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Synchronisation KashUP ↔ Powens</Text>
              <Text style={styles.cardText}>
                Les cartes et comptes connectés apparaîtront ici dès que le back office KashUP aura validé la récupération
                depuis Powens. Vous conserverez une visibilité complète sur l’état de chaque carte.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={handlePowensConnect} disabled={powensLoading}>
                {powensLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Connecter ma banque</Text>
                )}
              </TouchableOpacity>
              {powensError && <Text style={styles.errorText}>{powensError}</Text>}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Analyse des transactions</Text>
              <Text style={styles.cardText}>
                L’API KashUP centralisera prochainement vos opérations Powens pour identifier automatiquement les achats
                réalisés chez les partenaires. L’historique détaillé sera alors visible ici.
              </Text>
              <Text style={styles.cardText}>En attendant, vos opérations restent consultables dans votre espace bancaire.</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>En savoir plus</Text>
              <Text style={styles.cardText}>
                Powens est un établissement de paiement agréé en France et supervisé par l’ACPR. La connexion respecte la
                directive européenne DSP2 : vous validez chaque accès depuis votre banque, sans que KashUP ne connaisse vos
                identifiants.
              </Text>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.cardText}>
                  Données chiffrées de bout en bout et hébergées sur des serveurs situés au sein de l’Union Européenne.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.cardText}>
                  KashUP applique strictement le RGPD : vous gardez la main sur les autorisations et leur durée.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.cardText}>
                  La confidentialité financière est protégée par la loi française ; aucune opération ne peut être lancée sans
                  votre accord.
                </Text>
              </View>
            </View>
          </>
        );
      case 'budget':
        return (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Vue budgétaire KashUP</Text>
              <Text style={styles.cardText}>
                Les indicateurs budgétaires seront alimentés dès que l’API KashUP aura consolidé les données Powens : dépenses
                par univers, alertes IA et propositions de boosts adaptés.
              </Text>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.cardText}>Projection mensuelle par catégories KashUP.</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.cardText}>Alertes automatiques lorsque vous dépassez un seuil défini.</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.cardText}>Suggestions IA pour convertir vos dépenses en boosts ou dons.</Text>
              </View>
            </View>
            <View style={styles.card}>
              <TouchableOpacity style={styles.primaryButton} onPress={handlePowensConnect} disabled={powensLoading}>
                {powensLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Connecter ma banque</Text>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>En savoir plus</Text>
              <Text style={styles.cardText}>
                Les données affichées dans cet onglet proviendront exclusivement de l’API KashUP, elle-même alimentée par
                Powens (agrément DSP2). Aucun identifiant bancaire n’est manipulé côté application.
              </Text>
              <Text style={styles.cardText}>
                Dès la mise en service, vous retrouverez vos tickets moyens, catégories dominantes et plans d’action
                recommandés.
              </Text>
            </View>
            {renderAiAssistant()}
          </>
        );
      case 'payments':
        return (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Cartes enregistrées</Text>
              <Text style={styles.cardText}>
                Les moyens de paiement détectés via Powens seront affichés ici après synchronisation par l’API KashUP. Vous
                pourrez choisir lesquels activer pour le cashback automatique.
              </Text>
              <Text style={styles.cardText}>Pour le moment, aucune carte n’est remontée.</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Préférences de paiement</Text>
              <Text style={styles.cardText}>
                Les options (carte principale, priorisation des boosts, IBAN de versement) seront éditables dès que l’API
                exposera ces paramètres. Nous préparons l’interface pour les afficher automatiquement.
              </Text>
            </View>
          </>
        );
      case 'personal':
        return (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Coordonnées</Text>
                <TouchableOpacity onPress={refetchProfile} disabled={profileLoading}>
                  <Text style={[styles.link, profileLoading && styles.linkDisabled]}>
                    {profileLoading ? 'Chargement...' : 'Actualiser'}
                  </Text>
                </TouchableOpacity>
              </View>
              {profileLoading && !profile ? (
                <ActivityIndicator color={colors.primaryPurple} />
              ) : (
                <>
                  <View style={styles.row}>
                    <View style={styles.rowTextBlock}>
                      <Text style={styles.rowLabel}>Nom complet</Text>
                      <Text style={styles.rowDescription}>
                        {profile ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || profile.email : '--'}
                      </Text>
                    </View>
                    <TouchableOpacity>
                      <Text style={styles.link}>Modifier</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.rowTextBlock}>
                      <Text style={styles.rowLabel}>E-mail</Text>
                      <Text style={styles.rowDescription}>{profile?.email ?? 'Non renseigné'}</Text>
                    </View>
                    <TouchableOpacity>
                      <Text style={styles.link}>Modifier</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.rowTextBlock}>
                      <Text style={styles.rowLabel}>Téléphone</Text>
                      <Text style={styles.rowDescription}>Ajoutez votre numéro pour recevoir les alertes SMS.</Text>
                    </View>
                    <TouchableOpacity>
                      <Text style={styles.link}>Ajouter</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              {profileError && <Text style={styles.errorText}>{profileError}</Text>}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Compte KashUP</Text>
              <View style={styles.row}>
                <View style={styles.rowTextBlock}>
                  <Text style={styles.rowLabel}>Date d’inscription</Text>
                  <Text style={styles.rowDescription}>
                    {profile?.createdAt ? formatHistoryDate(profile.createdAt) : '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.rowTextBlock}>
                  <Text style={styles.rowLabel}>Rôle</Text>
                  <Text style={styles.rowDescription}>{profile?.role ?? 'Utilisateur KashUP'}</Text>
                </View>
              </View>
              <Text style={styles.cardText}>
                Modifiez vos informations personnelles directement dans l’espace sécurisé KashUP. Nous respectons le RGPD :
                vous pouvez exporter ou supprimer vos données à tout moment.
              </Text>
            </View>
          </>
        );
      case 'account':
        return (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sécurité du compte</Text>
              <Text style={styles.cardText}>
                Les réglages de sécurité (2FA, code PIN, appareils autorisés) seront fournis par l’API KashUP afin de refléter
                exactement ce qui est configuré côté back office.
              </Text>
              <Text style={styles.cardText}>
                Vous pourrez bientôt activer/désactiver ces options depuis cette page dès que l’API exposera ces paramètres.
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sessions actives</Text>
              <Text style={styles.cardText}>
                Les appareils connectés s’afficheront automatiquement une fois l’API disponible. Vous pourrez fermer une
                session ou toutes les sessions directement depuis le mobile.
              </Text>
            </View>
          </>
        );
      case 'invite':
        return (
          <>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightTitle}>Programme Parrainage</Text>
              <Text style={styles.highlightSubtitle}>
                Chaque nouvel ami inscrit rapporte des points, des boosts et de la visibilité pour votre commerce local favori.
              </Text>
              {referralsLoading && !referralSummary && (
                <ActivityIndicator style={{ marginVertical: spacing.sm }} color={colors.primaryPurple} />
              )}
              <View style={styles.highlightStats}>
                <View style={styles.highlightPill}>
                  <Text style={styles.highlightPillLabel}>
                    +{referralSummary?.sponsorRewardPoints ?? 0} pts
                  </Text>
                  <Text style={styles.highlightPillText}>Pour vous</Text>
                </View>
                <View style={styles.highlightPill}>
                  <Text style={styles.highlightPillLabel}>
                    +{referralSummary?.inviteeRewardBoost ?? 0} boost
                  </Text>
                  <Text style={styles.highlightPillText}>Pour le filleul</Text>
                </View>
                <View style={styles.highlightPill}>
                  <Text style={styles.highlightPillLabel}>
                    {referralSummary?.activationDelayHours ?? 48}h
                  </Text>
                  <Text style={styles.highlightPillText}>Activation express</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Votre code de parrainage</Text>
              <Text style={styles.inviteCode}>{referralCode}</Text>
              <Text style={styles.cardText}>
                Partagez-le partout : réseaux sociaux, messageries, newsletters. Plus vous parlez de KashUP, plus votre cagnotte grandit.
              </Text>
              <View style={styles.chipRow}>
                {['Copier le lien', 'Partager par SMS', 'Partager par e-mail'].map((action) => (
                  <TouchableOpacity key={action} style={styles.outlinePill}>
                    <Text style={styles.outlinePillText}>{action}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pourquoi parrainer ?</Text>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.cardText}>Vos proches découvrent les commerçants locaux avec un boost immédiatement utilisable.</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.cardText}>Vous gagnez des points, débloquez des badges exclusifs et accélérez vos objectifs.</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.cardText}>KashUP reverse davantage aux commerces référencés, ce qui dynamise tout l’écosystème.</Text>
              </View>
              <TouchableOpacity style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Créer une campagne de parrainage</Text>
              </TouchableOpacity>
              {referralsError && <Text style={styles.errorText}>{referralsError}</Text>}
            </View>
          </>
        );
      case 'referrals':
        return (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Suivi des filleuls</Text>
                <TouchableOpacity onPress={refetchReferrals} disabled={referralsLoading}>
                  <Text style={[styles.link, referralsLoading && styles.linkDisabled]}>
                    {referralsLoading ? 'Mise à jour...' : 'Actualiser'}
                  </Text>
                </TouchableOpacity>
              </View>
              {referralsLoading && invitees.length === 0 ? (
                <ActivityIndicator color={colors.primaryPurple} />
              ) : invitees.length === 0 ? (
                <Text style={styles.cardText}>Aucun filleul pour le moment. Partagez votre code pour lancer la dynamique.</Text>
              ) : (
                invitees.map((referral, index) => {
                  const name = `${referral.firstName} ${referral.lastName?.[0] ?? ''}.`.trim();
                  const reward =
                    referral.rewardPoints > 0
                      ? `+${referral.rewardPoints} pts`
                      : referral.rewardBoosts > 0
                      ? `+${referral.rewardBoosts} boost`
                      : '--';
                  return (
                    <View key={referral.id} style={[styles.row, index < invitees.length - 1 && styles.rowDivider]}>
                      <View style={styles.rowTextBlock}>
                        <Text style={styles.rowLabel}>{name}</Text>
                        <Text style={styles.rowDescription}>{referral.status}</Text>
                      </View>
                      <Text style={styles.badge}>{reward}</Text>
                    </View>
                  );
                })
              )}
              {referralsError && <Text style={styles.errorText}>{referralsError}</Text>}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Astuce marketing</Text>
              <Text style={styles.cardText}>
                Relancez vos contacts avec une actualité forte : nouvelle offre boostée, ouverture d’un commerce partenaire, opération limitée KashUP.
              </Text>
              <Text style={styles.cardText}>
                Plus le message est personnalisé, plus vos proches cliquent et activent leur boost de bienvenue.
              </Text>
            </View>
          </>
        );
      case 'support':
        return (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Contactez-nous</Text>
              {supportChannels.map((channel, index) => (
                <View key={channel.id} style={[styles.row, index < supportChannels.length - 1 && styles.rowDivider]}>
                  <View style={styles.rowTextBlock}>
                    <Text style={styles.rowLabel}>{channel.label}</Text>
                    <Text style={styles.rowDescription}>{channel.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </View>
              ))}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Statut des demandes</Text>
              <Text style={styles.cardText}>Aucune demande en attente. Nous répondons en moyenne en moins d’une heure sur le chat.</Text>
            </View>
          </>
        );
      case 'terms':
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Résumé des CGU</Text>
            <Text style={styles.cardText}>
              • Cashback versé sous 72h après validation du commerce.
              {'\n'}• Possibilité de retirer votre cagnotte à partir de 20 €.
              {'\n'}• Transparence des frais : 0 € pour les utilisateurs KashUP.
            </Text>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Lire les CGU complètes</Text>
            </TouchableOpacity>
          </View>
        );
      case 'privacy':
        return (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Vos droits RGPD</Text>
              <Text style={styles.cardText}>
                Accédez, rectifiez ou supprimez vos données à tout moment. Nous conservons
                uniquement les informations nécessaires au suivi du cashback.
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Gestion de vos données</Text>
              <TouchableOpacity
                style={styles.row}
                onPress={() => mainNavigation.navigate('PrivacyInfo')}>
                <View style={styles.rowTextBlock}>
                  <Text style={styles.rowLabel}>Informations sur la vie privée</Text>
                  <Text style={styles.rowDescription}>Découvrez comment nous protégeons vos données</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.row, styles.rowDivider]}
                onPress={() => mainNavigation.navigate('Consent')}>
                <View style={styles.rowTextBlock}>
                  <Text style={styles.rowLabel}>Gérer mes consentements</Text>
                  <Text style={styles.rowDescription}>Contrôlez l'utilisation de vos données</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.row, styles.rowDivider]}
                onPress={() => mainNavigation.navigate('DataExport')}>
                <View style={styles.rowTextBlock}>
                  <Text style={styles.rowLabel}>Exporter mes données</Text>
                  <Text style={styles.rowDescription}>Téléchargez toutes vos données personnelles</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.row, styles.rowDivider]}
                onPress={() => mainNavigation.navigate('DeleteAccount')}>
                <View style={styles.rowTextBlock}>
                  <Text style={styles.rowLabel}>Supprimer mon compte</Text>
                  <Text style={styles.rowDescription}>Droit à l'oubli - Suppression définitive</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.row, styles.rowDivider]}
                onPress={() => mainNavigation.navigate('PrivacyPolicy')}>
                <View style={styles.rowTextBlock}>
                  <Text style={styles.rowLabel}>Politique de confidentialité</Text>
                  <Text style={styles.rowDescription}>Lire la politique complète</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.bandeauBlanc}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>{hero.title}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + BOTTOM_TAB_BAR_HEIGHT }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroSubtitle}>{hero.subtitle}</Text>
        </View>

        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.lg + 8,
    gap: spacing.md,
  },
  bandeauBlanc: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md + 4,
    paddingBottom: spacing.md + 4,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
    zIndex: 10,
    elevation: 10,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  toolbarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
  },
  hero: {
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  cardText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  rowTextBlock: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMain,
  },
  rowDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primaryBlue,
  },
  amountBlock: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryPurple,
  },
  badge: {
    marginTop: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: '#EEF2FF',
    color: colors.primaryPurple,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
    color: '#B45309',
  },
  errorText: {
    marginTop: spacing.xs,
    color: '#EF4444',
    fontSize: 12,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 120,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    padding: spacing.md,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMain,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  goalCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lightBlue,
    backgroundColor: '#F8FAFF',
    padding: spacing.md,
    gap: spacing.xs,
  },
  goalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
  },
  goalHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  primaryButton: {
    borderRadius: radius.pill,
    backgroundColor: colors.primaryBlue,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.primaryBlue,
    fontWeight: '700',
  },
  link: {
    color: colors.primaryBlue,
    fontWeight: '700',
  },
  linkDisabled: {
    opacity: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.pill,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMain,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryPurple,
    letterSpacing: 1.5,
  },
  highlightCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: '#F0F5FF',
    borderWidth: 1,
    borderColor: '#D5E3FF',
    gap: spacing.md,
  },
  highlightTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryPurple,
  },
  highlightSubtitle: {
    fontSize: 14,
    color: colors.textMain,
    lineHeight: 20,
  },
  highlightStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  highlightPill: {
    flex: 1,
    minWidth: 90,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  highlightPillLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryBlue,
  },
  highlightPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  outlinePill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  outlinePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMain,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  budgetHeroSplit: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  budgetHeroBlock: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    padding: spacing.md,
    gap: 4,
  },
  budgetHeroProgressRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  budgetHeroLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  budgetHeroValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textMain,
  },
  budgetHeroSub: {
    fontSize: 13,
    color: colors.primaryGreen,
  },
  budgetHeroProgress: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    padding: spacing.md,
    gap: 6,
  },
  progressTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  budgetTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  budgetTabButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: colors.white,
  },
  budgetTabButtonActive: {
    backgroundColor: '#0ea5e922',
    borderColor: colors.primaryBlue,
  },
  budgetTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  budgetTabLabelActive: {
    color: colors.primaryBlue,
  },
  progressFillAlt: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primaryPurple,
  },
  progressNote: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  budgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  budgetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  budgetDotLarge: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  budgetTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  budgetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain,
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMain,
  },
  budgetPercent: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  budgetTrend: {
    fontSize: 12,
    fontWeight: '600',
  },
  budgetTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  budgetHint: {
    marginTop: spacing.xs,
    fontSize: 11,
    color: colors.textSecondary,
  },
  budgetCTA: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  budgetCTAText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryBlue,
  },
  budgetTrendUp: {
    color: colors.primaryGreen,
  },
  budgetTrendDown: {
    color: '#F97316',
  },
  ideaList: {
    gap: spacing.sm,
  },
  ideaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ideaText: {
    flex: 1,
    color: colors.textSecondary,
  },
  marketingCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  marketingCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    backgroundColor: colors.white,
    gap: 4,
  },
  marketingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketingValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
  },
  marketingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain,
  },
  marketingSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  strategyCard: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    backgroundColor: '#F8F5FF',
    padding: spacing.md,
    gap: spacing.sm,
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  strategyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryPurple,
  },
  strategyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  aiCard: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: spacing.md,
    maxHeight: 300,
  },
  aiCardStandalone: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: spacing.md,
  },
  aiHeader: {
    gap: spacing.xs,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMain,
  },
  aiSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  aiScrollArea: {
    maxHeight: 220,
    marginBottom: spacing.sm,
  },
  aiMessages: {
    width: '100%',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  aiBubble: {
    borderRadius: radius.md,
    padding: spacing.sm,
    maxWidth: '85%',
    width: 'auto',
  },
  aiBubbleUser: {
    backgroundColor: '#0ea5e922',
    alignSelf: 'flex-end',
  },
  aiBubbleBot: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
  },
  aiBubbleText: {
    fontSize: 13,
    lineHeight: 18,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  aiBubbleTextUser: {
    color: colors.primaryBlue,
    fontWeight: '600',
  },
  aiBubbleTextBot: {
    color: colors.textSecondary,
  },
  aiInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  aiInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 40,
    maxHeight: 100,
  },
  aiVoiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSendButtonDisabled: {
    opacity: 0.5,
  },
  transactionList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  transactionLeft: {
    flex: 1,
    gap: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMain,
  },
  transactionMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  transactionDebit: {
    color: '#EF4444',
  },
  transactionCredit: {
    color: colors.primaryGreen,
  },
  transactionBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  transactionBadgeMatched: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
  },
  transactionBadgePending: {
    backgroundColor: '#E0E7FF',
    color: colors.primaryPurple,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryPurple,
    marginTop: spacing.xs / 2,
  },
});