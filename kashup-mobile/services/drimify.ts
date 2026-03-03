const DRIMIFY_API_KEY =
  process.env.EXPO_PUBLIC_DRIMIFY_API_KEY || process.env.DRIMIFY_API_KEY || '';
const DRIMIFY_PROJECT_ID =
  process.env.EXPO_PUBLIC_DRIMIFY_PROJECT_ID || process.env.DRIMIFY_PROJECT_ID || '';

const DRIMIFY_BASE_URL = 'https://api.drimify.com/v1';

export type DrimifyExperienceType =
  | 'Parcours dynamique'
  | 'Jeu de hasard'
  | 'Expérience interactive';

export type DrimifyGame = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  playUrl: string;
  category?: string;
  duration?: string;
  experienceType: DrimifyExperienceType;
  tags?: string[];
};

const FALLBACK_GAMES: DrimifyGame[] = [
  {
    id: 'demo-1',
    title: 'Quiz boosté KashUP',
    description: 'Répondez à 5 questions sur vos commerces locaux et débloquez des points bonus.',
    thumbnail: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=800&q=80',
    playUrl: 'https://play.drimify.com/demo/quiz',
    category: 'Quiz interactif',
    duration: '2 min',
    experienceType: 'Expérience interactive',
    tags: ['quiz'],
  },
  {
    id: 'demo-2',
    title: 'Parcours dynamique “Mission locale”',
    description: 'Choisissez vos préférences et laissez KashUP créer un parcours d’achats personnalisés.',
    thumbnail: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=800&q=80',
    playUrl: 'https://play.drimify.com/demo/journey',
    category: 'Parcours interactif',
    duration: '3 min',
    experienceType: 'Parcours dynamique',
    tags: ['journey', 'parcours'],
  },
  {
    id: 'demo-3',
    title: 'Roue de la chance KashUP',
    description: 'Un jeu de hasard qui distribue des boosts et des points bonus en quelques secondes.',
    thumbnail: 'https://images.unsplash.com/photo-1509223197845-458d87318791?auto=format&fit=crop&w=800&q=80',
    playUrl: 'https://play.drimify.com/demo/wheel',
    category: 'Jeu de hasard',
    duration: '1 min',
    experienceType: 'Jeu de hasard',
    tags: ['wheel', 'chance'],
  },
];

const buildUrl = () => {
  if (DRIMIFY_PROJECT_ID) {
    return `${DRIMIFY_BASE_URL}/experiences?project=${DRIMIFY_PROJECT_ID}`;
  }
  return `${DRIMIFY_BASE_URL}/experiences`;
};

const resolveExperienceType = (
  source?: string,
  tags?: string[],
): DrimifyExperienceType => {
  const haystack = [source, ...(tags ?? [])]
    .filter(Boolean)
    .map((v) => v!.toLowerCase());

  if (haystack.some((value) => value.includes('journey') || value.includes('parcours') || value.includes('scenario'))) {
    return 'Parcours dynamique';
  }

  if (
    haystack.some(
      (value) =>
        value.includes('chance') ||
        value.includes('hasard') ||
        value.includes('wheel') ||
        value.includes('fortune') ||
        value.includes('spin') ||
        value.includes('lottery'),
    )
  ) {
    return 'Jeu de hasard';
  }

  return 'Expérience interactive';
};

export async function fetchDrimifyGames(): Promise<DrimifyGame[]> {
  if (!DRIMIFY_API_KEY) {
    return FALLBACK_GAMES;
  }

  try {
    const response = await fetch(buildUrl(), {
      headers: {
        Authorization: `Bearer ${DRIMIFY_API_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Drimify API error', response.status, response.statusText);
      throw new Error('Impossible de récupérer les jeux Drimify.');
    }

    const payload = await response.json();
    const list = Array.isArray(payload?.data) ? payload.data : payload;

    if (!Array.isArray(list) || list.length === 0) {
      return FALLBACK_GAMES;
    }

    return list.map((item: any) => {
      const tags: string[] = Array.isArray(item.tags)
        ? item.tags.map((tag: any) => (typeof tag === 'string' ? tag : tag?.name ?? '')).filter(Boolean)
        : [];
      const category = item.category ?? item.type ?? tags[0] ?? 'Expérience digitale';
      return {
        id: item.id?.toString() ?? Math.random().toString(),
        title: item.name ?? item.title ?? 'Jeu Drimify',
        description: item.description ?? 'Jeu interactif proposé par Drimify.',
        thumbnail:
          item.thumbnail ??
          item.image ??
          'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80',
        playUrl:
          item.links?.play ??
          item.embed_url ??
          item.url ??
          (item.slug ? `https://play.drimify.com/${item.slug}` : 'https://play.drimify.com'),
        category,
        duration: item.duration ?? item.estimated_duration ?? undefined,
        experienceType: resolveExperienceType(category, tags),
        tags,
      };
    });
  } catch (error) {
    console.warn('Drimify fetch failed', error);
    throw error;
  }
}

