import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius, spacing } from '../constants/theme';
import { RewardsStackParamList } from '../navigation/RewardsStack';
import { RewardLottery } from '../types/rewards';
import { useNotifications } from '../context/NotificationsContext';

type LotteryRoute = RouteProp<RewardsStackParamList, 'LotteryDetail'>;

type Props = {
  route: LotteryRoute;
};

export default function LotteryDetailScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RewardsStackParamList>>();
  const { lottery } = route.params;
  const [ticketsToBuy, setTicketsToBuy] = useState('1');
  const [countdown, setCountdown] = useState<string>('');
  const POINTS_PER_TICKET = 50;
  const { addNotification } = useNotifications();

  const drawDate = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + 3);
    return base;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = drawDate.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Tirage en cours...');
        clearInterval(interval);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setCountdown(`${days}j ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [drawDate]);

  const handleTicketsChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setTicketsToBuy(sanitized.length === 0 ? '0' : sanitized);
  };

  const incrementTickets = (delta: number) => {
    setTicketsToBuy((prev) => {
      const next = Math.max(0, (parseInt(prev, 10) || 0) + delta);
      return String(next);
    });
  };

  const handlePurchase = () => {
    const quantity = parseInt(ticketsToBuy, 10) || 0;
    if (quantity <= 0) {
      alert('Sélectionnez au moins 1 ticket.');
      return;
    }
    const total = quantity * POINTS_PER_TICKET;
    alert(`✅ ${quantity} ticket(s) réservés pour ${lottery.title} (−${total} pts)`);
    addNotification({
      category: 'lotteries',
      title: `${quantity} ticket(s) ajoutés`,
      description: `${lottery.title} • ${total} pts`,
    });
  };

  const RULES = [
    'Chaque ticket augmente vos chances de gagner mais ne garantit pas la victoire.',
    'Le tirage est effectué de manière aléatoire et contrôlé par KashUP.',
    'Les gagnants sont contactés par e-mail et via l’application.',
    'Les tickets ne sont pas remboursables une fois achetés.',
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={colors.textMain} />
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Loterie</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient
          colors={[colors.primaryPurple, colors.primaryBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <Text style={styles.heroLabel}>Loterie KashUP</Text>
          <Text style={styles.heroTitle}>{lottery.title}</Text>
          <Text style={styles.heroPrize}>{lottery.prize}</Text>
          <Text style={styles.heroDraw}>{lottery.drawDate}</Text>
        </LinearGradient>

        <Text style={styles.description}>{lottery.description}</Text>

        <View style={styles.countdownCard}>
          <Text style={styles.countdownLabel}>Tirage dans</Text>
          <Text style={styles.countdownValue}>{countdown}</Text>
        </View>

        <LinearGradient
          colors={[colors.primaryBlue, colors.primaryPurple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.purchaseCard}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketTitle}>Acheter des tickets</Text>
            <Text style={styles.ticketPrice}>1 ticket = {POINTS_PER_TICKET} pts</Text>
          </View>
          <Text style={styles.ticketText}>Choisis le nombre de tickets à miser sur cette loterie.</Text>
          <View style={styles.ticketRow}>
            <TouchableOpacity style={styles.stepButton} onPress={() => incrementTickets(-1)}>
              <Text style={styles.stepButtonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.ticketInput}
              keyboardType="numeric"
              value={ticketsToBuy}
              onChangeText={handleTicketsChange}
            />
            <TouchableOpacity style={styles.stepButton} onPress={() => incrementTickets(1)}>
              <Text style={styles.stepButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.ticketPrimaryButton} onPress={handlePurchase}>
            <Text style={styles.ticketPrimaryText}>Acheter mes tickets</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Règlement de la loterie</Text>
          {RULES.map((rule) => (
            <Text key={rule} style={styles.ruleLine}>
              • {rule}
            </Text>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  purchaseCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  ticketPrice: {
    color: '#F1F5FF',
    fontSize: 13,
  },
  ticketText: {
    color: '#E5E5FF',
    fontSize: 14,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroLabel: {
    color: '#F5F5FF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
  },
  heroPrize: {
    color: '#E0E7FF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroDraw: {
    color: '#E0E7FF',
    fontSize: 14,
  },
  countdownCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.greyLight,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  countdownLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  countdownValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
  },
  description: {
    fontSize: 15,
    color: colors.textMain,
    lineHeight: 22,
  },
  primaryButton: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  primaryGradient: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.white,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
  },
  cardText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  ticketInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FFFFFF66',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    backgroundColor: '#FFFFFF22',
  },
  ticketPrimaryButton: {
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  ticketPrimaryText: {
    color: colors.primaryBlue,
    fontWeight: '700',
  },
  ruleLine: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});


