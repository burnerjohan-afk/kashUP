import env from '../../config/env';
import { powensRequest } from './powens.client';

export const getLinkToken = () => {
  return powensRequest<{ token: string }>({
    path: '/users',
    method: 'POST',
    apiKey: env.POWENS_USERS_KEY
  });
};

export const listBankConnections = (userId: string) => {
  return powensRequest({
    path: `/users/${userId}/connections`,
    apiKey: env.POWENS_USERS_KEY
  });
};

export const getBudgetSummary = (userId: string) => {
  return powensRequest({
    path: `/users/${userId}/budgets`,
    apiKey: env.POWENS_USERS_KEY
  });
};

export const listPaymentMethods = (userId: string) => {
  return powensRequest({
    path: `/users/${userId}/payments`,
    apiKey: env.POWENS_USERS_KEY
  });
};

export const getSecurityEvents = (userId: string) => {
  return powensRequest({
    path: `/users/${userId}/security`,
    apiKey: env.POWENS_USERS_KEY
  });
};


