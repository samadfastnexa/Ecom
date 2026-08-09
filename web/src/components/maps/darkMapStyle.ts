/**
 * The app's ocean palette applied to Google's basemap, shared by every map on
 * the site so the rider tracker and a checkout pin do not read as two products.
 *
 * `styles` is only honoured when the map has NO mapId — cloud-based styling
 * takes over the moment one is set. Keeping mapId unset is deliberate: it means
 * a map works with nothing but an API key, no Cloud console map style or Map ID
 * to create first.
 */
export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0a1a2b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7fa8bd" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#061019" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#0d2b40" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#123449" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6d94a8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1a4a63" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#04121e" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d6d85" }] },
];
