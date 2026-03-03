import apiClient from './apiClient';

export const requestPasswordReset = async (email: string) => {
  const payload = { email };
  const { data } = await apiClient.post('/auth/password/forgot', payload);
  return data;
};


