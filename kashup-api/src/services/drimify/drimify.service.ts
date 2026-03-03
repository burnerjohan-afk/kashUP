import { drimifyRequest } from './drimify.client';

export const listDrimifyExperiences = () => {
  return drimifyRequest<{ data: unknown[] }>({
    path: '/experiences'
  });
};

export const startDrimifyExperience = (experienceId: string, userId: string, payload?: Record<string, unknown>) => {
  return drimifyRequest({
    path: `/experiences/${experienceId}/entries`,
    method: 'POST',
    body: {
      user_reference: userId,
      ...payload
    }
  });
};

export const handleDrimifyWebhook = (event: unknown) => {
  // Placeholder pour traiter les events (gains, pertes, etc.)
  return { received: true, event };
};


