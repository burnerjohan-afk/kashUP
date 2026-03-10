import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeStack from './HomeStack';
import PartnersStack from './PartnersStack';
import CagnotteStack from './CagnotteStack';
import GiftCardsScreen from '../screens/GiftCardsScreen';
import RewardsStack from './RewardsStack';
import { radius, spacing } from '../constants/theme';

const TAB_BAR_ICON = '#3C3C3C';
const TAB_BAR_ACTIVE = '#047857';

export type BottomTabParamList = {
  Accueil: undefined;
  Partenaires:
    | {
        initialSearch?: string;
        openNearby?: boolean;
        nearbyRadiusKm?: number;
        screen?: 'OffresDuMoment';
      }
    | undefined;
  Cagnotte: undefined;
  "Bons d'achat": undefined;
  Rewards:
    | {
        initialTab?: 'history' | 'lotteries' | 'challenges' | 'boosts' | 'badges' | 'games';
        focusBoostId?: string;
      }
    | undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

const iconMap: Record<keyof BottomTabParamList, string> = {
  Accueil: 'home-outline',
  Partenaires: 'storefront-outline',
  Cagnotte: 'wallet-outline',
  "Bons d'achat": 'gift-outline',
  Rewards: 'star-outline',
};

/** Menu bas style WhatsApp : pilule ovale centrée, pas toute la largeur, fond blanc légèrement transparent */
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom, spacing.sm);

  return (
    <View style={[styles.container, { paddingBottom }]} pointerEvents="box-none">
      <View style={styles.pill}>
        <View style={styles.pillInner}>
          {state.routes.map((route) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === state.routes.indexOf(route);
            const routeName = route.name as keyof BottomTabParamList;
            const iconName = iconMap[routeName] as string;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (event.defaultPrevented) return;
              // Toujours aller à l'écran d'entrée du menu (réinitialise la pile si on reclique sur l'onglet actif)
              switch (route.name) {
                case 'Accueil':
                  navigation.navigate('Accueil', { screen: 'HomeLanding' });
                  break;
                case 'Partenaires':
                  navigation.navigate('Partenaires', { screen: 'PartnersList' });
                  break;
                case 'Cagnotte':
                  navigation.navigate('Cagnotte', { screen: 'Wallet' });
                  break;
                case "Bons d'achat":
                  navigation.navigate("Bons d'achat");
                  break;
                case 'Rewards':
                  navigation.navigate('Rewards', { screen: 'RewardsHome', params: route.params });
                  break;
                default:
                  navigation.navigate(route.name, route.params);
              }
            };

            return (
              <Pressable
                key={route.key}
                style={styles.tab}
                onPress={onPress}
                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}>
                <View style={[styles.tabContent, isFocused && styles.tabContentActive]}>
                  <Ionicons
                    name={iconName as any}
                    size={24}
                    color={isFocused ? TAB_BAR_ACTIVE : TAB_BAR_ICON}
                  />
                  <Text
                    style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    textAlign="center">
                    {options.title ?? route.name}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function BottomTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}>
      <Tab.Screen name="Accueil" component={HomeStack} options={{ title: 'Accueil' }} />
      <Tab.Screen
        name="Partenaires"
        component={PartnersStack}
        options={{ title: 'Partenaires', unmountOnBlur: true }}
      />
      <Tab.Screen name="Cagnotte" component={CagnotteStack} options={{ title: 'Cagnotte' }} />
      <Tab.Screen
        name="Bons d'achat"
        component={GiftCardsScreen}
        options={{ title: 'Cartes UP' }}
      />
      <Tab.Screen name="Rewards" component={RewardsStack} options={{ title: 'Rewards' }} />
    </Tab.Navigator>
  );
}

const PILL_BG = 'rgba(255,255,255,0.92)';
const TAB_PILL_ACTIVE = 'transparent';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pill: {
    width: '100%',
    maxWidth: '100%',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PILL_BG,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  pillInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    minWidth: 0,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: 999,
  },
  tabContentActive: {
    backgroundColor: TAB_PILL_ACTIVE,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 4,
    color: TAB_BAR_ICON,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: TAB_BAR_ACTIVE,
  },
});
