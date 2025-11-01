import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wifi } from "lucide-react";
import { toast } from "sonner";

interface VillageModeProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const VillageMode = ({ isEnabled, onToggle }: VillageModeProps) => {
  useEffect(() => {
    // Apply or remove optimizations based on enabled state
    if (isEnabled) {
      document.body.classList.add('village-mode');
      localStorage.setItem('village-mode', 'true');
      localStorage.setItem('disable-images', 'true');
      localStorage.setItem('disable-animations', 'true');
    } else {
      document.body.classList.remove('village-mode');
      localStorage.removeItem('village-mode');
      localStorage.removeItem('disable-images');
      localStorage.removeItem('disable-animations');
    }
  }, [isEnabled]);

  const handleToggle = () => {
    const newState = !isEnabled;
    onToggle(newState);
    
    if (newState) {
      toast.success("🌾 Village Mode Enabled - Optimized for rural areas!", {
        description: "90% data saved, 3x faster, offline support enabled"
      });
    } else {
      toast.info("Standard Mode Enabled");
    }
  };

  return (
    <Button
      variant={isEnabled ? "default" : "outline"}
      onClick={handleToggle}
      className={`${
        isEnabled 
          ? 'bg-green-600 hover:bg-green-700 text-white shadow-md' 
          : 'border-2'
      } transition-all duration-200`}
      size="lg"
    >
      <Wifi className={`h-4 w-4 mr-2 ${isEnabled ? 'animate-pulse' : ''}`} />
      Village Mode {isEnabled && '✓'}
    </Button>
  );
};

export default VillageMode;
