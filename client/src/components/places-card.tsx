import { Star, MapPin, ExternalLink, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PlaceResult } from "@/hooks/use-places";

interface PlacesCardProps {
  places: PlaceResult[];
  keyword: string;
  onSelectPlace?: (place: PlaceResult) => void;
}

function formatDistance(meters: number | null): string {
  if (meters === null) return "";
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function PlaceItem({ place, onSelect }: { place: PlaceResult; onSelect?: () => void }) {
  return (
    <div 
      className="flex gap-3 p-3 rounded-lg bg-background/50 hover-elevate cursor-pointer"
      onClick={onSelect}
      data-testid={`place-item-${place.id}`}
    >
      {place.photoUrl && (
        <div className="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden">
          <img 
            src={place.photoUrl} 
            alt={place.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm truncate">{place.name}</h4>
          {place.isOpen !== null && (
            <Badge 
              variant={place.isOpen ? "default" : "secondary"} 
              className="flex-shrink-0 text-xs"
            >
              {place.isOpen ? "營業中" : "已打烊"}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {place.rating && (
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {place.rating.toFixed(1)}
              {place.userRatingCount && (
                <span className="text-muted-foreground/60">
                  ({place.userRatingCount})
                </span>
              )}
            </span>
          )}
          {place.distance !== null && (
            <span className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {formatDistance(place.distance)}
            </span>
          )}
        </div>

        {place.address && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {place.address}
          </p>
        )}

        <a
          href={place.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
          data-testid={`place-maps-link-${place.id}`}
        >
          <ExternalLink className="w-3 h-3" />
          在 Google Maps 開啟
        </a>
      </div>
    </div>
  );
}

export function PlacesCard({ places, keyword, onSelectPlace }: PlacesCardProps) {
  if (places.length === 0) {
    return (
      <Card className="my-2">
        <CardContent className="p-4 text-center text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">在你附近找不到「{keyword}」相關的地點</p>
          <p className="text-xs mt-1">試試其他關鍵字吧！</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-2" data-testid="places-card">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            附近的「{keyword}」（{places.length} 個結果）
          </span>
        </div>
        <div className="space-y-2">
          {places.map((place) => (
            <PlaceItem
              key={place.id}
              place={place}
              onSelect={() => onSelectPlace?.(place)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PlacesLoadingCard() {
  return (
    <Card className="my-2">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">正在搜尋附近地點...</span>
        </div>
      </CardContent>
    </Card>
  );
}
