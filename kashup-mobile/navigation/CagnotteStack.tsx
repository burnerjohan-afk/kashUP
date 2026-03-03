import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WalletScreen from '../screens/WalletScreen';
import CoffreFortScreen from '../screens/CoffreFortScreen';

export type CagnotteStackParamList = {
  Wallet: undefined;
  CoffreFort: undefined;
};

const Stack = createNativeStackNavigator<CagnotteStackParamList>();

export default function CagnotteStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="CoffreFort" component={CoffreFortScreen} />
    </Stack.Navigator>
  );
}
