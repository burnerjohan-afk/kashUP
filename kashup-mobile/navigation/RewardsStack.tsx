import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import RewardsScreen from '../screens/RewardsScreen';
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import ChallengeCategoryScreen from '../screens/ChallengeCategoryScreen';
import LotteryDetailScreen from '../screens/LotteryDetailScreen';
import BadgeDetailScreen from '../screens/BadgeDetailScreen';
import Header from '../components/Header';
import { RewardBadge, RewardChallenge, RewardLottery } from '../types/rewards';
import type { BottomTabParamList } from './BottomTabs';

export type RewardsStackParamList = {
  RewardsHome: BottomTabParamList['Rewards'];
  ChallengeCategory: { category: string; label: string };
  ChallengeDetail: { challenge: RewardChallenge };
  LotteryDetail: { lottery?: RewardLottery; lotteryId?: string };
  BadgeDetail: { badge: RewardBadge };
};

const Stack = createNativeStackNavigator<RewardsStackParamList>();

type Props = {
  route: RouteProp<BottomTabParamList, 'Rewards'>;
};

export default function RewardsStack({ route }: Props) {
  return (
    <Stack.Navigator
      screenOptions={{
        header: (props) => <Header {...props} />,
      }}>
      <Stack.Screen
        name="RewardsHome"
        component={RewardsScreen}
        initialParams={route.params}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="ChallengeCategory" component={ChallengeCategoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LotteryDetail" component={LotteryDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BadgeDetail" component={BadgeDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}


