import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

interface PlacesState {
  places: PlaceResult[];
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });
  const { toast } = useToast();

  const getCurrentPosition = useCallback((): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = "你的瀏覽器不支援定位功能";
        setState(prev => ({ ...prev, error, loading: false }));
        toast({
          title: "定位不可用",
          description: error,
          variant: "destructive",
        });
        reject(new Error(error));
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setState({
            latitude,
            longitude,
            error: null,
            loading: false,
          });
          resolve({ latitude, longitude });
        },
        (error) => {
          let errorMessage = "無法取得你的位置";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "請允許網站存取你的位置";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "位置資訊不可用";
              break;
            case error.TIMEOUT:
              errorMessage = "取得位置逾時，請重試";
              break;
          }
          setState(prev => ({ ...prev, error: errorMessage, loading: false }));
          toast({
            title: "定位失敗",
            description: errorMessage,
            variant: "destructive",
          });
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, [toast]);

  return {
    ...state,
    getCurrentPosition,
  };
}

export function usePlacesSearch() {
  const [state, setState] = useState<PlacesState>({
    places: [],
    loading: false,
    error: null,
  });
  const { toast } = useToast();
  const { getCurrentPosition } = useGeolocation();

  const searchNearby = useCallback(async (
    keyword: string,
    options?: {
      radius?: number;
      maxResults?: number;
      useCurrentLocation?: boolean;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<PlaceResult[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let lat = options?.latitude;
      let lng = options?.longitude;

      if (options?.useCurrentLocation !== false && (!lat || !lng)) {
        const position = await getCurrentPosition();
        lat = position.latitude;
        lng = position.longitude;
      }

      if (!lat || !lng) {
        throw new Error("需要位置資訊才能搜尋附近地點");
      }

      const response = await apiRequest("POST", "/api/places/search", {
        keyword,
        latitude: lat,
        longitude: lng,
        radius: options?.radius || 1000,
        maxResults: options?.maxResults || 5,
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setState({
        places: data.places || [],
        loading: false,
        error: null,
      });

      return data.places || [];
    } catch (error: any) {
      const errorMessage = error.message || "搜尋地點時發生錯誤";
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      toast({
        title: "搜尋失敗",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }, [getCurrentPosition, toast]);

  const clearPlaces = useCallback(() => {
    setState({ places: [], loading: false, error: null });
  }, []);

  return {
    ...state,
    searchNearby,
    clearPlaces,
  };
}

export type { PlaceResult };
