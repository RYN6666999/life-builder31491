import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { 
  Flame, 
  CalendarClock, 
  Users, 
  Trash2,
  GripVertical
} from "lucide-react";

export type QuadrantType = "Q1" | "Q2" | "Q3" | "Q4";

export interface QuadrantInfo {
  id: QuadrantType;
  label: string;
  labelCn: string;
  description: string;
  icon: typeof Flame;
  className: string;
  badgeClass: string;
}

export const QUADRANTS: QuadrantInfo[] = [
  {
    id: "Q1",
    label: "Do First",
    labelCn: "緊急重要",
    description: "危機、截止日期",
    icon: Flame,
    className: "text-red-500",
    badgeClass: "bg-red-500/20 text-red-400 border-red-500/30"
  },
  {
    id: "Q2",
    label: "Schedule",
    labelCn: "重要不緊急",
    description: "規劃、成長",
    icon: CalendarClock,
    className: "text-blue-500",
    badgeClass: "bg-blue-500/20 text-blue-400 border-blue-500/30"
  },
  {
    id: "Q3",
    label: "Delegate",
    labelCn: "緊急不重要",
    description: "干擾、會議",
    icon: Users,
    className: "text-amber-500",
    badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30"
  },
  {
    id: "Q4",
    label: "Eliminate",
    labelCn: "不緊急不重要",
    description: "浪費時間",
    icon: Trash2,
    className: "text-gray-500",
    badgeClass: "bg-gray-500/20 text-gray-400 border-gray-500/30"
  }
];

const STORAGE_KEY = "quadrant-tab-order";

function getStoredOrder(): QuadrantType[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const order = JSON.parse(stored);
      if (Array.isArray(order) && order.length === 4) {
        return order as QuadrantType[];
      }
    }
  } catch {
  }
  return ["Q1", "Q2", "Q3", "Q4"];
}

function saveOrder(order: QuadrantType[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

interface QuadrantTabsProps {
  activeQuadrant: QuadrantType | null;
  onQuadrantChange: (quadrant: QuadrantType | null) => void;
  taskCounts?: Record<QuadrantType, number>;
}

export function QuadrantTabs({ 
  activeQuadrant, 
  onQuadrantChange,
  taskCounts = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
}: QuadrantTabsProps) {
  const [order, setOrder] = useState<QuadrantType[]>(getStoredOrder);
  const [draggedItem, setDraggedItem] = useState<QuadrantType | null>(null);
  const [dragOverItem, setDragOverItem] = useState<QuadrantType | null>(null);

  useEffect(() => {
    saveOrder(order);
  }, [order]);

  const handleDragStart = (e: React.DragEvent, quadrant: QuadrantType) => {
    setDraggedItem(quadrant);
    e.dataTransfer.effectAllowed = "move";
    hapticLight();
  };

  const handleDragOver = (e: React.DragEvent, quadrant: QuadrantType) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== quadrant) {
      setDragOverItem(quadrant);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetQuadrant: QuadrantType) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== targetQuadrant) {
      const newOrder = [...order];
      const draggedIndex = newOrder.indexOf(draggedItem);
      const targetIndex = newOrder.indexOf(targetQuadrant);
      
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedItem);
      
      setOrder(newOrder);
      hapticMedium();
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const orderedQuadrants = order.map(id => QUADRANTS.find(q => q.id === id)!);

  return (
    <div className="flex gap-1 p-1 bg-muted/30 rounded-lg overflow-x-auto">
      <Button
        variant={activeQuadrant === null ? "secondary" : "ghost"}
        size="sm"
        onClick={() => {
          hapticLight();
          onQuadrantChange(null);
        }}
        className="shrink-0 px-3"
        data-testid="tab-quadrant-all"
      >
        全部
      </Button>

      {orderedQuadrants.map((quadrant) => {
        const Icon = quadrant.icon;
        const isActive = activeQuadrant === quadrant.id;
        const isDragging = draggedItem === quadrant.id;
        const isDragOver = dragOverItem === quadrant.id;
        const count = taskCounts[quadrant.id];

        return (
          <div
            key={quadrant.id}
            draggable
            onDragStart={(e) => handleDragStart(e, quadrant.id)}
            onDragOver={(e) => handleDragOver(e, quadrant.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, quadrant.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative group",
              isDragging && "opacity-50",
              isDragOver && "border-l-2 border-primary"
            )}
          >
            <Button
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                hapticLight();
                onQuadrantChange(quadrant.id);
              }}
              className={cn(
                "shrink-0 gap-1 px-2",
                isActive && quadrant.className
              )}
              data-testid={`tab-quadrant-${quadrant.id}`}
            >
              <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-50 cursor-grab" />
              <Icon className={cn("w-4 h-4", quadrant.className)} />
              <span className="hidden sm:inline">{quadrant.labelCn}</span>
              {count > 0 && (
                <Badge 
                  variant="secondary" 
                  className="h-5 w-5 p-0 justify-center text-xs ml-1"
                >
                  {count}
                </Badge>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export function getQuadrantInfo(quadrant: QuadrantType | null): QuadrantInfo | undefined {
  if (!quadrant) return undefined;
  return QUADRANTS.find(q => q.id === quadrant);
}

export function QuadrantBadge({ quadrant }: { quadrant: QuadrantType | null }) {
  const info = getQuadrantInfo(quadrant);
  if (!info) return null;

  const Icon = info.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={cn("text-xs py-0 gap-1", info.badgeClass)}
    >
      <Icon className="w-3 h-3" />
      {info.labelCn}
    </Badge>
  );
}
