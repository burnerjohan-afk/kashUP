import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  ImageBackground,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TabScreenHeader, TAB_HEADER_HEIGHT } from '@/src/components/TabScreenHeader';
import { colors, radius, spacing } from '../constants/theme';
import { RewardsStackParamList } from '../navigation/RewardsStack';
import { RewardBadge, RewardChallenge, RewardLottery } from '../types/rewards';
import { useNotifications } from '../context/NotificationsContext';
import { DrimifyGame, fetchDrimifyGames } from '../services/drimify';
import { useRewards } from '@/src/hooks/useRewards';
import { useWallet } from '@/src/hooks/useWallet';
import { useWebhookEvents } from '@/src/hooks/useWebhookEvents';

type BadgeItem = RewardBadge;
type RewardTab = 'history' | 'lotteries' | 'challenges' | 'boosts' | 'badges' | 'games';

const TABS: { key: RewardTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'history', label: 'Historique', icon: 'time-outline' },
  { key: 'lotteries', label: 'Loteries', icon: 'trophy-outline' },
  { key: 'challenges', label: 'Challenges', icon: 'flash-outline' },
  { key: 'boosts', label: 'Boosts', icon: 'rocket-outline' },
  { key: 'badges', label: 'Badges', icon: 'ribbon-outline' },
  { key: 'games', label: 'Jeux', icon: 'game-controller-outline' },
];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

const formatPointsValue = (points: number) => points.toLocaleString('fr-FR');

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function RewardsScreen() {
  const [activeTab, setActiveTab] = useState<RewardTab>('history');
  const [boostView, setBoostView] = useState<'list' | 'shop'>('list');
  const [focusedBoostId, setFocusedBoostId] = useState<string | null>(null);
  const [games, setGames] = useState<DrimifyGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RewardsStackParamList>>();
  const route = useRoute<RouteProp<RewardsStackParamList, 'RewardsHome'>>();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationPress = useCallback(() => {
    (navigation.getParent() as any)?.navigate('Accueil', { screen: 'Notifications' });
  }, [navigation]);
  const handleProfilePress = useCallback(() => {
    (navigation.getParent() as any)?.navigate('Accueil', { screen: 'Profile' });
  }, [navigation]);
  const { addNotification } = useNotifications();
  const {
    data: rewardsData,
    loading: rewardsLoading,
    error: rewardsError,
    refetch: refetchRewards,
    buyBoost,
    boostPurchaseError,
    boostPurchaseInFlight,
  } = useRewards();
  const { data: walletData } = useWallet();
  const cashback = walletData?.wallet?.soldeCashback ?? null;

  // Écouter les événements webhook pour rafraîchir automatiquement les récompenses
  useWebhookEvents({
    onRewardsChanged: refetchRewards,
  });

  const totalPoints = rewardsData.summary?.points ?? 0;
  const activeBoosts = useMemo<BoostItem[]>(() => {
    const boosts = rewardsData.summary?.boostsActifs ?? [];
    return boosts.map((boost) => ({
      id: boost.id,
      title: boost.name,
      validity: `Jusqu’au ${formatDate(boost.expiresAt)}`,
      status: 'active',
    }));
  }, [rewardsData.summary?.boostsActifs]);

  const badgeEntries = useMemo<BadgeItem[]>(() => {
    if (!rewardsData.badgeCatalog.length) return [];
    const unlockedIds = new Set((rewardsData.summary?.badges ?? []).map((badge) => badge.id));
    return rewardsData.badgeCatalog.map((badge) => ({
      id: badge.id,
      label: badge.name,
      description: badge.description,
      emoji: badge.level >= 3 ? '🏆' : '🎖️',
      unlocked: unlockedIds.has(badge.id),
      progress: unlockedIds.has(badge.id) ? 100 : 25,
    }));
  }, [rewardsData.badgeCatalog, rewardsData.summary?.badges]);
  const availableBoosts = rewardsData.availableBoosts;
  const handleBoostActivation = async (boost: (typeof availableBoosts)[number]) => {
    try {
      await buyBoost(boost.id);
      Alert.alert('Boost activé', `${boost.name} actif jusqu’au ${formatDate(boost.endsAt)}.`);
      addNotification({
        category: 'boosts',
        title: `Boost activé : ${boost.name}`,
        description: `${boost.costInPoints} pts • valable jusqu’au ${formatDate(boost.endsAt)}`,
      });
    } catch (err) {
      Alert.alert(
        'Impossible d’activer le boost',
        err instanceof Error ? err.message : 'Veuillez réessayer plus tard.'
      );
    }
  };

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab as RewardTab);
    }
    if (route.params?.initialTab === 'boosts' && route.params.focusBoostId) {
      setBoostView('shop');
      setFocusedBoostId(route.params.focusBoostId);
    }
  }, [route.params?.initialTab, route.params?.focusBoostId]);

  useEffect(() => {
    if (!focusedBoostId) return;
    const timer = setTimeout(() => setFocusedBoostId(null), 4000);
    return () => clearTimeout(timer);
  }, [focusedBoostId]);

  useEffect(() => {
    let isCancelled = false;
    const loadGames = async () => {
      if (games.length > 0 || gamesLoading) return;
      setGamesLoading(true);
      setGamesError(null);
      try {
        const fetched = await fetchDrimifyGames();
        if (!isCancelled) {
          setGames(fetched);
        }
      } catch (error) {
        if (!isCancelled) {
          setGamesError('Impossible de charger les jeux Drimify pour le moment.');
        }
      } finally {
        if (!isCancelled) {
          setGamesLoading(false);
        }
      }
    };
    if (activeTab === 'games') {
      loadGames();
    }
    return () => {
      isCancelled = true;
    };
  }, [activeTab, games.length, gamesLoading]);

  const handlePlayGame = (game: DrimifyGame) => {
    Linking.openURL(game.playUrl).catch(() =>
      Alert.alert('Jeu indisponible', 'Impossible d’ouvrir le jeu Drimify pour le moment.'),
    );
  };

  const getGameImage = (game: DrimifyGame) => {
    if (game.thumbnail) {
      return game.thumbnail;
    }
    if (game.experienceType === 'Jeu de hasard') {
      return 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1000&q=80';
    }
    if (game.experienceType === 'Parcours dynamique') {
      return 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1000&q=80';
    }
    return 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1000&q=80';
  };

  const renderHistory = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Historique de mes points</Text>
        <TouchableOpacity onPress={refetchRewards} disabled={rewardsLoading}>
          <Text style={[styles.sectionLink, rewardsLoading && styles.sectionLinkDisabled]}>
            {rewardsLoading ? 'Mise à jour…' : 'Actualiser'}
          </Text>
        </TouchableOpacity>
      </View>
      {rewardsLoading ? (
        <ActivityIndicator color={colors.primaryPurple} />
      ) : (
        <Text style={styles.placeholderText}>
          Les mouvements de points seront affichés ici dès que l’API KashUP exposera l’historique officiel.
        </Text>
      )}
    </View>
  );

  const renderLotteries = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Loteries KashUP</Text>
        <TouchableOpacity onPress={refetchRewards} disabled={rewardsLoading}>
          <Text style={[styles.sectionLink, rewardsLoading && styles.sectionLinkDisabled]}>
            {rewardsLoading ? 'Chargement…' : 'Actualiser'}
          </Text>
        </TouchableOpacity>
      </View>
      {rewardsLoading ? (
        <ActivityIndicator color={colors.primaryPurple} />
      ) : (
        <Text style={styles.placeholderText}>
          Les loteries publiées par KashUP seront listées ici dès que l’API back office exposera le catalogue.
        </Text>
      )}
    </View>
  );

  const renderChallenges = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Challenges KashUP</Text>
        <TouchableOpacity onPress={refetchRewards} disabled={rewardsLoading}>
          <Text style={[styles.sectionLink, rewardsLoading && styles.sectionLinkDisabled]}>
            {rewardsLoading ? 'Synchronisation…' : 'Actualiser'}
          </Text>
        </TouchableOpacity>
      </View>
      {rewardsLoading ? (
        <ActivityIndicator color={colors.primaryPurple} />
      ) : (
        <Text style={styles.placeholderText}>
          Les défis officiels seront affichés dès que le backend KashUP exposera les campagnes challenges.
        </Text>
      )}
    </View>
  );

  const renderBoosts = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Boosts</Text>
        <View style={styles.boostTabs}>
          {[
            { key: 'list', label: 'Mes boosts' },
            { key: 'shop', label: 'Acheter un boost' },
          ].map((tab) => {
            const active = boostView === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.boostTabButton, active && styles.boostTabButtonActive]}
                onPress={() => setBoostView(tab.key as 'list' | 'shop')}>
                <Text style={[styles.boostTabLabel, active && styles.boostTabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {boostView === 'list' ? (
        activeBoosts.length === 0 ? (
          <Text style={styles.placeholderText}>Aucun boost actif pour le moment.</Text>
        ) : (
          activeBoosts.map((boost) => {
            const isActive = boost.status === 'active';
            return (
              <View key={boost.id} style={[styles.boostCard, !isActive && styles.boostCardDisabled]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.boostTitle, !isActive && styles.boostTitleDisabled]}>{boost.title}</Text>
                  <Text style={[styles.boostValidity, !isActive && styles.boostTitleDisabled]}>
                    {boost.validity}
                  </Text>
                </View>
                <View style={[styles.boostBadge, isActive ? styles.boostBadgeActive : styles.boostBadgeExpired]}>
                  <Text style={styles.boostBadgeText}>{isActive ? 'Actif' : 'Expiré'}</Text>
                </View>
              </View>
            );
          })
        )
      ) : (
        <View style={styles.boostGrid}>
          {availableBoosts.length === 0 ? (
            <Text style={styles.placeholderText}>La boutique de boosts arrive bientôt.</Text>
          ) : (
            availableBoosts.map((boost) => (
              <LinearGradient
                key={boost.id}
                colors={[colors.primaryBlue, colors.primaryPurple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.boostShopCard,
                  focusedBoostId === boost.id && styles.boostShopCardFocused,
                ]}>
                <View style={styles.boostShopHeader}>
                  <View style={styles.boostShopIcon}>
                    <Ionicons name="flash" size={18} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.boostShopTitle}>{boost.name}</Text>
                    <Text style={styles.boostPrice}>{`${boost.costInPoints} pts`}</Text>
                  </View>
                </View>
                <Text style={styles.boostShopDescription}>{boost.description}</Text>
                <View style={styles.boostShopFooter}>
                  <Text style={styles.boostShopDuration}>Valable jusqu’au {formatDate(boost.endsAt)}</Text>
                  <TouchableOpacity
                    style={[styles.boostShopButton, boostPurchaseInFlight === boost.id && styles.boostShopButtonDisabled]}
                    disabled={boostPurchaseInFlight === boost.id}
                    onPress={() => handleBoostActivation(boost)}>
                    <Text style={styles.boostShopButtonText}>
                      {boostPurchaseInFlight === boost.id ? 'Activation…' : 'Activer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            ))
          )}
          {boostPurchaseError && <Text style={styles.errorText}>{boostPurchaseError}</Text>}
        </View>
      )}
    </View>
  );

  const renderBadges = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Mes badges</Text>
      {badgeEntries.length === 0 ? (
        <Text style={styles.placeholderText}>Aucun badge disponible pour le moment.</Text>
      ) : (
        <View style={styles.badgeGrid}>
          {badgeEntries.map((badge) => (
            <TouchableOpacity
              key={badge.id}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('BadgeDetail', { badge })}>
              <LinearGradient
                colors={badge.unlocked ? [colors.primaryBlue, colors.primaryPurple] : ['#F3F4F6', '#E2E8F0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.badgeItem, !badge.unlocked && styles.badgeItemLocked]}>
                <View style={styles.badgeTopRow}>
                  <View style={[styles.badgeEmojiBubble, !badge.unlocked && styles.badgeEmojiBubbleLocked]}>
                    <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                  </View>
                  <Text style={[styles.badgeStatus, !badge.unlocked && styles.badgeStatusLocked]}>
                    {badge.unlocked ? 'Débloqué' : 'En cours'}
                  </Text>
                </View>
                <Text style={[styles.badgeLabel, !badge.unlocked && styles.badgeLabelLocked]}>{badge.label}</Text>
                <View style={styles.badgeProgressBar}>
                  <View
                    style={[
                      styles.badgeProgressFill,
                      { width: `${badge.progress}%` },
                      !badge.unlocked && styles.badgeProgressFillLocked,
                    ]}
                  />
                </View>
                <Text style={[styles.badgeProgressText, !badge.unlocked && styles.badgeStatusLocked]}>
                  {badge.progress}% • {badge.description}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text style={styles.badgeHint}>
        Débloquez des badges en soutenant les commerces locaux et en participant aux challenges.
      </Text>
    </View>
  );

  const GameList = ({
    data,
    emptyMessage,
  }: {
    data: DrimifyGame[];
    emptyMessage: string;
  }) => {
    if (data.length === 0) {
      return <Text style={styles.placeholderText}>{emptyMessage}</Text>;
    }

    return (
      <View style={styles.cardList}>
        {data.map((game) => (
          <View key={game.id} style={styles.gameCard}>
            <ImageBackground
              source={{ uri: getGameImage(game) }}
              style={styles.gameImage}
              imageStyle={styles.gameImageRadius}>
              <LinearGradient colors={['rgba(15,23,42,0.15)', 'rgba(15,23,42,0.85)']} style={styles.gameImageOverlay}>
                <View style={styles.gameTag}>
                  <Text style={styles.gameCategory}>{game.category ?? game.experienceType}</Text>
                </View>
              </LinearGradient>
            </ImageBackground>
            <View style={styles.gameContent}>
              <Text style={styles.gameTitle}>{game.title}</Text>
              <Text style={styles.gameDescription}>{game.description}</Text>
              <View style={styles.gameMeta}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.gameMetaText}>{game.duration ?? '3 minutes'}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={() => handlePlayGame(game)}>
              <Text style={styles.primaryButtonText}>Jouer maintenant</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderGames = () => {
    const dynamicGames = games.filter((game) => game.experienceType === 'Parcours dynamique');
    const chanceGames = games.filter((game) => game.experienceType === 'Jeu de hasard');
    const otherGames = games.filter((game) => game.experienceType === 'Expérience interactive');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Jeux interactifs</Text>
        <Text style={styles.sectionSubtitle}>
          KashUP s’associe à Drimify pour proposer des parcours dynamiques et des jeux de hasard avec cashback à la clé.
        </Text>
        {gamesLoading && (
          <View style={styles.centerRow}>
            <ActivityIndicator color={colors.primaryPurple} />
            <Text style={styles.loadingText}>Chargement des jeux…</Text>
          </View>
        )}
        {gamesError && <Text style={styles.errorText}>{gamesError}</Text>}
        {!gamesLoading && !gamesError && games.length === 0 && (
          <Text style={styles.placeholderText}>Aucun jeu disponible pour le moment. Revenez bientôt !</Text>
        )}
        {!gamesLoading && !gamesError && games.length > 0 && (
          <>
            <Text style={styles.gamesSubsectionTitle}>Parcours dynamiques</Text>
            <GameList
              data={dynamicGames}
              emptyMessage="Aucun parcours dynamique n’est disponible. Ajoutez-en depuis votre compte Drimify."
            />

            <Text style={styles.gamesSubsectionTitle}>Jeux de hasard</Text>
            <GameList
              data={chanceGames}
              emptyMessage="Aucun jeu de hasard n’est connecté pour le moment."
            />

            <Text style={styles.gamesSubsectionTitle}>Autres expériences</Text>
            <GameList
              data={otherGames}
              emptyMessage="Ajoutez d’autres expériences Drimify pour enrichir cette section."
            />
          </>
        )}
        <Text style={styles.gameHint}>
          Les jeux sont fournis par Drimify. Ajoutez votre clé API dans `EXPO_PUBLIC_DRIMIFY_API_KEY` pour charger vos expériences en direct.
        </Text>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'history':
        return renderHistory();
      case 'lotteries':
        return renderLotteries();
      case 'challenges':
        return renderChallenges();
      case 'boosts':
        return renderBoosts();
      case 'badges':
        return renderBadges();
      case 'games':
        return renderGames();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      {rewardsError && (
        <TouchableOpacity style={styles.errorBanner} onPress={refetchRewards} activeOpacity={0.85}>
          <Text style={styles.errorBannerText}>{rewardsError}</Text>
          <Text style={styles.errorBannerCta}>Réessayer</Text>
        </TouchableOpacity>
      )}
      <TabScreenHeader
        scrollY={scrollY}
        onNotificationPress={handleNotificationPress}
        onProfilePress={handleProfilePress}
        unreadCount={unreadCount}
        cashback={cashback}
        points={totalPoints}
        showPillsRow
      />
      <AnimatedScrollView
        style={styles.scrollFill}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(0, insets.top - 36) + TAB_HEADER_HEIGHT + 15 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={<RefreshControl refreshing={rewardsLoading} onRefresh={refetchRewards} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Récompenses</Text>
        </View>
        <LinearGradient
          colors={[colors.primaryBlue, colors.primaryPurple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.heroTitle}>Mes rewards</Text>
              <Text style={styles.heroSubtitle}>Suivez vos points, loteries et défis</Text>
            </View>
            <Ionicons name='gift-outline' size={28} color={colors.white} />
          </View>
          <View style={styles.heroPointsRow}>
            <Text style={styles.heroPointsLabel}>Points disponibles</Text>
            <Text style={styles.heroPointsValue}>{formatPointsValue(totalPoints)}</Text>
          </View>
        </LinearGradient>

        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            const content = (
              <View style={[styles.tabContent, isActive && styles.tabContentActive]}>
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={isActive ? colors.white : colors.textSecondary}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              </View>
            );
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabButton}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.85}>
                {isActive ? (
                  <LinearGradient
                    colors={[colors.primaryBlue, colors.primaryPurple]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tabButtonActive}>
                    {content}
                  </LinearGradient>
                ) : (
                  <View style={styles.tabButtonInactive}>{content}</View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {renderContent()}
      </AnimatedScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  scrollFill: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  pageHeader: {
    paddingTop: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textMain,
  },
  heroCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#F5F5FF',
    fontSize: 14,
  },
  heroPointsRow: {
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF22',
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroPointsLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  heroPointsValue: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '800',
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tabButton: {
    width: '48%',
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  tabButtonActive: {
    borderRadius: radius.pill,
  },
  tabButtonInactive: {
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  tabContentActive: {
    paddingVertical: spacing.sm,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.white,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    gap: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
  },
  sectionLink: {
    color: colors.primaryBlue,
    fontWeight: '700',
  },
  sectionLinkDisabled: {
    opacity: 0.5,
  },
  cardList: {
    gap: spacing.md,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  errorText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  historyIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.greyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyContent: {
    flex: 1,
  },
  historyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMain,
  },
  historyDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  historyPoints: {
    fontSize: 16,
    fontWeight: '700',
  },
  pointsPositive: {
    color: colors.primaryGreen,
  },
  pointsNegative: {
    color: '#F87171',
  },
  lotteryCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  lotteryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  lotteryDescription: {
    fontSize: 13,
    color: '#F4F4FF',
  },
  lotteryTickets: {
    fontSize: 13,
    color: '#E0E7FF',
    fontWeight: '600',
  },
  lotteryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lotteryBadge: {
    color: colors.white,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lotteryPrize: {
    color: colors.white,
    fontWeight: '700',
  },
  lotteryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lotteryDrawBlock: {
    flex: 1,
    marginRight: spacing.md,
  },
  lotteryDraw: {
    color: '#F5F5FF',
    fontSize: 13,
  },
  lotteryButton: {
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  lotteryButtonText: {
    color: colors.primaryBlue,
    fontWeight: '700',
  },
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pastLabel: {
    flex: 1,
    color: colors.textMain,
    fontWeight: '600',
  },
  pastReward: {
    color: colors.primaryGreen,
    fontWeight: '600',
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorBanner: {
    backgroundColor: '#FDECEB',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 13,
  },
  errorBannerCta: {
    color: '#B91C1C',
    fontWeight: '600',
    marginTop: spacing.xs / 2,
  },
  challengeCard: {
    borderRadius: radius.md,
    backgroundColor: colors.greyLight,
    padding: spacing.md,
    gap: spacing.sm,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  progressBar: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primaryPurple,
  },
  challengeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeStatus: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  challengeReward: {
    color: colors.primaryBlue,
    fontWeight: '700',
  },
  boostCard: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.greyLight,
  },
  boostTabs: {
    flexDirection: 'row',
    backgroundColor: colors.greyLight,
    borderRadius: radius.pill,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  boostTabButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  boostTabButtonActive: {
    backgroundColor: colors.white,
  },
  boostTabLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  boostTabLabelActive: {
    color: colors.primaryBlue,
    fontWeight: '700',
  },
  boostCardDisabled: {
    opacity: 0.6,
  },
  boostTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
  },
  boostTitleDisabled: {
    color: colors.textSecondary,
  },
  boostValidity: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  boostDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginVertical: spacing.xs / 2,
  },
  boostBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  boostBadgeActive: {
    backgroundColor: colors.primaryGreen,
  },
  boostBadgeExpired: {
    backgroundColor: '#CBD5F5',
  },
  boostBadgeText: {
    color: colors.white,
    fontWeight: '700',
  },
  boostShopCard: {
    width: '100%',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  boostShopCardFocused: {
    borderWidth: 2,
    borderColor: '#FACC15',
  },
  boostGrid: {
    gap: spacing.md,
  },
  boostPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  boostShopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  boostShopIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boostShopTitle: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  boostShopDescription: {
    color: '#F2F2FF',
    fontSize: 14,
    lineHeight: 20,
  },
  boostShopFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boostShopDuration: {
    color: '#E0E7FF',
    fontSize: 13,
  },
  boostShopButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  boostShopButtonDisabled: {
    opacity: 0.7,
  },
  boostShopButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  gameCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.greyLight,
    padding: spacing.md,
    gap: spacing.sm,
  },
  gameImage: {
    height: 150,
    marginBottom: spacing.sm,
  },
  gameImageRadius: {
    borderRadius: radius.md,
  },
  gameTag: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  gameCategory: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gameContent: {
    gap: spacing.xs,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  gameDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  gameMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  gameMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  gameImageOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  gamesSubsectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  gameHint: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  badgeGrid: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  badgeItem: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  badgeItemLocked: {
    opacity: 0.9,
  },
  badgeEmoji: {
    fontSize: 30,
  },
  badgeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeEmojiBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmojiBubbleLocked: {
    backgroundColor: '#E2E8F0',
  },
  badgeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMain,
  },
  badgeLabelLocked: {
    color: colors.textSecondary,
  },
  badgeStatus: {
    fontSize: 11,
    color: colors.primaryBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeStatusLocked: {
    color: colors.textSecondary,
  },
  badgeProgressBar: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  badgeProgressFill: {
    height: '100%',
    backgroundColor: colors.primaryBlue,
  },
  badgeProgressFillLocked: {
    backgroundColor: colors.textSecondary,
  },
  badgeProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  badgeHint: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textSecondary,
  },
  primaryButton: {
    borderRadius: radius.pill,
    backgroundColor: colors.primaryBlue,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  secondaryButtonText: {
    color: colors.primaryBlue,
    fontWeight: '700',
  },
});

