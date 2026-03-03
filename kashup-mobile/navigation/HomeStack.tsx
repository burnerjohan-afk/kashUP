import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import DonationsScreen from '../screens/DonationsScreen';
import DonationContributionScreen from '../screens/DonationContributionScreen';
import DonationConfirmationScreen from '../screens/DonationConfirmationScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileDetailScreen from '../screens/ProfileDetailScreen';
import type { DonationAssociation, DonationCategory } from '@/src/services/donationService';

export type HomeStackParamList = {
  HomeLanding: undefined;
  Donations: undefined;
  DonationContribution: {
    association: DonationAssociation;
    category: Pick<DonationCategory, 'id' | 'title' | 'icon' | 'accent' | 'tint'>;
  };
  DonationConfirmation: {
    association: DonationAssociation;
    category: Pick<DonationCategory, 'id' | 'title' | 'icon' | 'accent' | 'tint'>;
    amount: number;
  };
  Notifications: undefined;
  Profile: undefined;
  ProfileDetail: { sectionId: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeLanding" component={HomeScreen} />
      <Stack.Screen name="Donations" component={DonationsScreen} />
      <Stack.Screen name="DonationContribution" component={DonationContributionScreen} />
      <Stack.Screen name="DonationConfirmation" component={DonationConfirmationScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ProfileDetail" component={ProfileDetailScreen} />
    </Stack.Navigator>
  );
}

