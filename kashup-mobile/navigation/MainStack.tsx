import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import Header from '../components/Header';
import BoxUpDetailScreen from '../screens/BoxUpDetailScreen';
import ConsentScreen from '../screens/ConsentScreen';
import DataExportScreen from '../screens/DataExportScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import KYCVerificationScreen from '../screens/KYCVerificationScreen';
import OfferTemplateScreen from '../screens/OfferTemplateScreen';
import PartnerDetailScreen from '../screens/PartnerDetailScreen';
import PowensLinkScreen from '../screens/PowensLinkScreen';
import QRScanScreen from '../screens/QRScanScreen';
import PrivacyInfoScreen from '../screens/PrivacyInfoScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import VoucherDetailScreen from '../screens/VoucherDetailScreen';
import type { GiftBox } from '@/src/services/giftCardService';
import { VoucherPayload } from '../types/vouchers';
import BottomTabs from './BottomTabs';
export type MainStackParamList = {
  Tabs: undefined;
  PartnerDetail: { partnerId: string };
  OfferTemplate: { partnerId: string; offerType: 'welcome' | 'permanent' | 'voucher' };
  BoxUpDetail: { boxId: string; box?: GiftBox };
  VoucherDetail: { voucher: VoucherPayload };
  QRScan: undefined;
  PowensLink: undefined;
  Consent: undefined;
  PrivacyInfo: undefined;
  DeleteAccount: undefined;
  DataExport: undefined;
  PrivacyPolicy: undefined;
  KYCVerification: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        header: (props) => <Header {...props} />,
      }}>
      <Stack.Screen name="Tabs" component={BottomTabs} options={{ title: 'KashUP' }} />
      <Stack.Screen
        name="PartnerDetail"
        component={PartnerDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OfferTemplate"
        component={OfferTemplateScreen}
        options={{ title: 'Détail de l’offre' }}
      />
      <Stack.Screen
        name="BoxUpDetail"
        component={BoxUpDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VoucherDetail"
        component={VoucherDetailScreen}
        options={{ title: 'Mon bon d’achat' }}
      />
      <Stack.Screen
        name="QRScan"
        component={QRScanScreen}
        options={{ headerShown: false, title: 'Scanner QR' }}
      />
      <Stack.Screen name="PowensLink" component={PowensLinkScreen} options={{ title: 'Connexion bancaire' }} />
      <Stack.Screen name="Consent" component={ConsentScreen} options={{ title: 'Consentements RGPD' }} />
      <Stack.Screen name="PrivacyInfo" component={PrivacyInfoScreen} options={{ title: 'Vie privée' }} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: 'Supprimer mon compte' }} />
      <Stack.Screen name="DataExport" component={DataExportScreen} options={{ title: 'Exporter mes données' }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: 'Politique de confidentialité' }} />
      <Stack.Screen name="KYCVerification" component={KYCVerificationScreen} options={{ title: 'Vérification d\'identité' }} />
    </Stack.Navigator>
  );
}

