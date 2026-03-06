import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PartnersScreen from '../screens/PartnersScreen';
import OffresDuMomentScreen from '../screens/OffresDuMomentScreen';

export type PartnersStackParamList = {
  PartnersList: undefined;
  OffresDuMoment: undefined;
};

const Stack = createNativeStackNavigator<PartnersStackParamList>();

export default function PartnersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PartnersList" component={PartnersScreen} />
      <Stack.Screen name="OffresDuMoment" component={OffresDuMomentScreen} />
    </Stack.Navigator>
  );
}
