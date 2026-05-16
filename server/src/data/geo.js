const baseCenter = { lat: -23.5505, lng: -46.6333 };

export function deterministicGeocode(address = "") {
  let hash = 0;
  for (let i = 0; i < address.length; i += 1) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 1200) - 600) / 10000;
  const lngOffset = ((Math.abs(hash >> 3) % 1600) - 800) / 10000;
  return {
    lat: Number((baseCenter.lat + latOffset).toFixed(6)),
    lng: Number((baseCenter.lng + lngOffset).toFixed(6))
  };
}

export function haversineKm(a, b) {
  const radius = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Number((radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))).toFixed(2));
}
