import type { Request, Response } from "express";

const GOOGLE_PLACES_API_URL = "https://places.googleapis.com/v1/places:searchNearby";
const GOOGLE_PLACES_PHOTO_URL = "https://places.googleapis.com/v1";

interface PlaceSearchParams {
  keyword: string;
  latitude: number;
  longitude: number;
  radius?: number;
  maxResults?: number;
}

interface PlaceResult {
  id: string;
  name: string;
  rating: number | null;
  userRatingCount: number | null;
  address: string | null;
  types: string[];
  photoUrl: string | null;
  mapsUrl: string;
  isOpen: boolean | null;
  distance: number | null;
}

const PLACE_TYPE_MAPPING: Record<string, string[]> = {
  gym: ["gym", "fitness_center"],
  park: ["park"],
  library: ["library"],
  cafe: ["cafe", "coffee_shop"],
  restaurant: ["restaurant"],
  "vegan food": ["vegan_restaurant", "vegetarian_restaurant", "restaurant"],
  bookstore: ["book_store"],
  museum: ["museum"],
  spa: ["spa"],
  yoga: ["yoga_studio"],
  meditation: ["meditation_center", "spa"],
  hospital: ["hospital"],
  pharmacy: ["pharmacy"],
  grocery: ["grocery_store", "supermarket"],
  bank: ["bank", "atm"],
  temple: ["hindu_temple", "buddhist_temple", "place_of_worship"],
  church: ["church", "place_of_worship"],
  school: ["school", "university"],
  coworking: ["coworking_space"],
};

function getPlaceTypes(keyword: string): string[] {
  const lowerKeyword = keyword.toLowerCase();
  for (const [key, types] of Object.entries(PLACE_TYPE_MAPPING)) {
    if (lowerKeyword.includes(key)) {
      return types;
    }
  }
  return [];
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export async function searchNearbyPlaces(
  params: PlaceSearchParams
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Google API Key not configured");
  }

  const { keyword, latitude, longitude, radius = 1000, maxResults = 5 } = params;
  const includedTypes = getPlaceTypes(keyword);

  const requestBody: any = {
    locationRestriction: {
      circle: {
        center: {
          latitude,
          longitude,
        },
        radius: Math.min(radius, 50000),
      },
    },
    maxResultCount: Math.min(maxResults, 20),
    rankPreference: "DISTANCE",
  };

  if (includedTypes.length > 0) {
    requestBody.includedTypes = includedTypes;
  } else {
    requestBody.textQuery = keyword;
  }

  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.rating",
    "places.userRatingCount",
    "places.formattedAddress",
    "places.types",
    "places.photos",
    "places.googleMapsUri",
    "places.currentOpeningHours",
    "places.location",
  ].join(",");

  try {
    const url = includedTypes.length > 0 
      ? GOOGLE_PLACES_API_URL 
      : "https://places.googleapis.com/v1/places:searchText";
    
    const body = includedTypes.length > 0 
      ? requestBody 
      : {
          textQuery: keyword,
          locationBias: {
            circle: {
              center: { latitude, longitude },
              radius: Math.min(radius, 50000),
            },
          },
          maxResultCount: Math.min(maxResults, 20),
        };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Places API error:", errorText);
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();
    const places = data.places || [];

    return places.map((place: any) => {
      let photoRef = null;
      if (place.photos && place.photos.length > 0) {
        photoRef = place.photos[0].name;
      }

      const placeLat = place.location?.latitude;
      const placeLng = place.location?.longitude;
      const distance =
        placeLat && placeLng
          ? calculateDistance(latitude, longitude, placeLat, placeLng)
          : null;

      return {
        id: place.id,
        name: place.displayName?.text || "Unknown",
        rating: place.rating || null,
        userRatingCount: place.userRatingCount || null,
        address: place.formattedAddress || null,
        types: place.types || [],
        photoUrl: photoRef ? `/api/places/photo?ref=${encodeURIComponent(photoRef)}` : null,
        mapsUrl: place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${place.id}`,
        isOpen: place.currentOpeningHours?.openNow ?? null,
        distance,
      };
    });
  } catch (error) {
    console.error("Error searching nearby places:", error);
    throw error;
  }
}

export async function handlePlacesSearch(req: Request, res: Response) {
  try {
    const { keyword, latitude, longitude, radius, maxResults } = req.body;

    if (!keyword || typeof keyword !== "string") {
      return res.status(400).json({ error: "Keyword is required" });
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "Valid latitude and longitude are required" });
    }

    const places = await searchNearbyPlaces({
      keyword,
      latitude,
      longitude,
      radius: radius || 1000,
      maxResults: maxResults || 5,
    });

    res.json({ places });
  } catch (error: any) {
    console.error("Places search error:", error);
    res.status(500).json({ error: error.message || "Failed to search places" });
  }
}

export async function handlePlacePhoto(req: Request, res: Response) {
  try {
    const photoRef = req.query.ref as string;
    
    if (!photoRef) {
      return res.status(400).json({ error: "Photo reference is required" });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }

    const photoUrl = `${GOOGLE_PLACES_PHOTO_URL}/${photoRef}/media?maxHeightPx=200&maxWidthPx=300&key=${apiKey}`;
    
    const response = await fetch(photoUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch photo" });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Photo proxy error:", error);
    res.status(500).json({ error: "Failed to fetch photo" });
  }
}

export function formatPlacesForChat(places: PlaceResult[], keyword: string): string {
  if (places.length === 0) {
    return `抱歉，在你附近找不到「${keyword}」相關的地點。要不要試試其他關鍵字？`;
  }

  let response = `我找到了${places.length}個附近的「${keyword}」：\n\n`;

  places.forEach((place, index) => {
    const stars = place.rating ? "⭐".repeat(Math.round(place.rating)) : "";
    const ratingText = place.rating ? `${place.rating}分 ${stars}` : "尚無評分";
    const distanceText = place.distance ? `${place.distance}公尺` : "距離未知";
    const openText = place.isOpen === true ? "🟢 營業中" : place.isOpen === false ? "🔴 已打烊" : "";

    response += `**${index + 1}. ${place.name}**\n`;
    response += `   📍 ${distanceText} | ${ratingText}`;
    if (openText) response += ` | ${openText}`;
    response += `\n`;
    if (place.address) {
      response += `   📫 ${place.address}\n`;
    }
    response += `   🗺️ [在 Google Maps 開啟](${place.mapsUrl})\n\n`;
  });

  return response;
}
