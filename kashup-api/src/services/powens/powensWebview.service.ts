import env from '../../config/env';
import { generateState } from './powensAuth.service';

/** Connecteurs (banques) du Link Builder Powens — même liste que le lien sauvegardé */
const POWENS_CONNECTOR_UUIDS = [
  '3da1697b-59b0-5bb4-8ec8-08125c3390ce',
  'f711dd7a-6289-5bda-b3a4-f2febda8c046',
  '13949b61-e3e6-50ed-9d82-451943ec35d0',
  'd840908d-5157-5819-8296-474fa4534564',
  'fc6e059f-c3e6-52d7-8139-6e5e0297fe24',
  'f1309fa1-f1fd-51fd-ad9a-a7aba985ce67',
  '33f88657-7ab0-5dbe-b8c3-c98e614afc28',
  'ad5928c7-89ce-5977-a66d-3360e3aa4029',
  'f5c29767-1bc8-5337-9e4e-68a0fbd91c9a',
  'b247dd6e-4ccc-598c-9f12-ea740465e2f0',
  'ab3acf4c-cfbc-5b9f-b6d9-cd4eb1838cd4',
  'e9606d38-6b0f-5f76-b573-61a4d00a927d',
  '646e8e7f-0163-5d75-a95a-27438f82c1de',
  '07d76adf-ae35-5b38-aca8-67aafba13169',
  'de508df8-aa37-537e-a05f-1379526dfa84'
];

/**
 * Service pour générer l'URL Webview Powens
 */
export interface WebviewUrlParams {
  userId: string;
  temporaryCode?: string;
}

/**
 * Génère l'URL Webview Powens pour connecter une banque.
 * Format webview.powens.com (lien sauvegardé Powens) avec temporary code + state.
 */
export const getWebviewConnectUrl = ({ userId, temporaryCode }: WebviewUrlParams): string => {
  const state = generateState(userId);
  const domain = `${env.POWENS_DOMAIN}.biapi.pro`;

  const params = new URLSearchParams({
    domain,
    client_id: env.POWENS_CLIENT_ID,
    redirect_uri: env.POWENS_REDIRECT_URI,
    state,
    connector_capabilities: 'bank',
    account_types: 'card,checking',
    connector_uuids: POWENS_CONNECTOR_UUIDS.join(','),
    max_connections: '5'
  });

  if (temporaryCode) {
    params.set('code', temporaryCode);
  }

  return `https://webview.powens.com/fr/connect?${params.toString()}`;
};

