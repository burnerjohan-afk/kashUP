export type GeoFilter = {
  lat: number;
  lng: number;
  radiusKm: number;
};

export const parseAroundMe = (value?: string): GeoFilter | null => {
  if (!value) return null;
  const [lat, lng, radius] = value.split(',');
  const latNum = Number(lat);
  const lngNum = Number(lng);
  const radiusNum = Number(radius);

  if (Number.isNaN(latNum) || Number.isNaN(lngNum) || Number.isNaN(radiusNum)) {
    return null;
  }

  return { lat: latNum, lng: lngNum, radiusKm: radiusNum };
};

