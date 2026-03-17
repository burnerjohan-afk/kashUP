import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeStack from './HomeStack';
import PartnersStack from './PartnersStack';
import CagnotteStack from './CagnotteStack';
import GiftCardsScreen from '../screens/GiftCardsScreen';
import RewardsStack from './RewardsStack';
import { CARD_GRADIENT_COLORS, CARD_GRADIENT_LOCATIONS, spacing } from '../constants/theme';

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

type CustomTabBarProps = BottomTabBarProps & {
  tabBarOpen: boolean;
  setTabBarOpen: (open: boolean) => void;
};


/** Menu bas masqué par défaut ; bouton + pour ouvrir la barre (pilule style WhatsApp) */
function CustomTabBar({ state, descriptors, navigation, tabBarOpen, setTabBarOpen }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom, spacing.sm);
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: tabBarOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [tabBarOpen, animValue]);

  const pillOpacity = animValue;
  const fabOpacity = animValue.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const fabScale = animValue.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });

  const onTabPress = (route: (typeof state.routes)[0]) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (event.defaultPrevented) return;
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
    setTabBarOpen(false);
  };

  return (
    <View style={[styles.container, { paddingBottom }]} pointerEvents="box-none">
      {/* Overlay pour fermer en tapant à côté de la pilule */}
      {tabBarOpen && (
        <Pressable
          style={styles.overlay}
          onPress={() => setTabBarOpen(false)}
          pointerEvents="auto"
        />
      )}
      {/* Pilule des onglets (visible quand ouvert) — blanche avec transparence, comme à l'origine */}
      <Animated.View style={[styles.pillWrap, { opacity: pillOpacity, pointerEvents: tabBarOpen ? 'auto' : 'none' }]}>
        <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
          <View style={styles.pillInner}>
            {state.routes.map((route) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === state.routes.indexOf(route);
              const routeName = route.name as keyof BottomTabParamList;
              const iconName = iconMap[routeName] as string;
              return (
                <Pressable
                  key={route.key}
                  style={styles.tab}
                  onPress={() => onTabPress(route)}
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
      </Animated.View>
      {/* Bouton + (visible quand barre fermée) — dégradé vert comme la carte */}
      <Animated.View
        style={[
          styles.fabWrap,
          {
            bottom: paddingBottom + spacing.sm,
            opacity: fabOpacity,
            transform: [{ scale: fabScale }],
          },
        ]}
        pointerEvents={tabBarOpen ? 'none' : 'auto'}>
        <Pressable
          style={styles.fab}
          onPress={() => setTabBarOpen(true)}
          android_ripple={{ color: 'rgba(255,255,255,0.4)' }}>
          <LinearGradient
            colors={[...CARD_GRADIENT_COLORS]}
            locations={[...CARD_GRADIENT_LOCATIONS]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}>
            <Ionicons name="add" size={28} color="#FFF" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default function BottomTabs() {
  const [tabBarOpen, setTabBarOpen] = useState(false);
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} tabBarOpen={tabBarOpen} setTabBarOpen={setTabBarOpen} />}
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
const FAB_SIZE = 56;

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
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  pillWrap: {
    width: '100%',
    alignItems: 'center',
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
  fabWrap: {
    position: 'absolute',
    right: spacing.lg,
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  fabGradient: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
