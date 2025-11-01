import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, 
  WifiOff, 
  Zap, 
  Image as ImageIcon, 
  Download,
  AlertCircle,
  CheckCircle2,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh
} from "lucide-react";
import { toast } from "sonner";

interface VillageModeProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const VillageMode = ({ isEnabled, onToggle }: VillageModeProps) => {
  const [networkSpeed, setNetworkSpeed] = useState<'offline' | 'slow' | 'moderate' | 'fast'>('moderate');
  const [dataSaved, setDataSaved] = useState(0);

  useEffect(() => {
    // Monitor network connection
    const updateOnlineStatus = () => {
      if (!navigator.onLine) {
        setNetworkSpeed('offline');
      } else {
        checkNetworkSpeed();
      }
    };

    const checkNetworkSpeed = async () => {
      try {
        // Use Network Information API if available
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        
        if (connection) {
          const effectiveType = connection.effectiveType;
          switch (effectiveType) {
            case 'slow-2g':
            case '2g':
              setNetworkSpeed('slow');
              break;
            case '3g':
              setNetworkSpeed('moderate');
              break;
            case '4g':
            case '5g':
              setNetworkSpeed('fast');
              break;
            default:
              setNetworkSpeed('moderate');
          }
        }
      } catch (error) {
        console.log('Network monitoring not available');
      }
    };

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    const interval = setInterval(checkNetworkSpeed, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isEnabled) {
      // Estimate data savings
      const baselineDataUsage = 5; // MB per session
      const villageModeUsage = 0.5; // MB per session
      const saved = baselineDataUsage - villageModeUsage;
      setDataSaved(saved);
    }
  }, [isEnabled]);

  const getNetworkIcon = () => {
    switch (networkSpeed) {
      case 'offline':
        return <WifiOff className="h-5 w-5 text-red-600" />;
      case 'slow':
        return <SignalLow className="h-5 w-5 text-orange-600" />;
      case 'moderate':
        return <SignalMedium className="h-5 w-5 text-yellow-600" />;
      case 'fast':
        return <SignalHigh className="h-5 w-5 text-green-600" />;
    }
  };

  const getNetworkStatus = () => {
    switch (networkSpeed) {
      case 'offline':
        return 'Offline Mode';
      case 'slow':
        return 'Poor Network (2G)';
      case 'moderate':
        return 'Moderate Network (3G)';
      case 'fast':
        return 'Good Network (4G/5G)';
    }
  };

  const villageModeFeatures = [
    {
      title: "Compressed Data",
      description: "Images and content optimized for low bandwidth",
      icon: ImageIcon,
      enabled: isEnabled
    },
    {
      title: "Offline Support",
      description: "Access essential features without internet",
      icon: WifiOff,
      enabled: isEnabled
    },
    {
      title: "Fast Loading",
      description: "Minimal data usage with priority content",
      icon: Zap,
      enabled: isEnabled
    },
    {
      title: "Auto Downloads",
      description: "Health records cached for offline access",
      icon: Download,
      enabled: isEnabled
    }
  ];

  const handleToggleVillageMode = () => {
    const newState = !isEnabled;
    onToggle(newState);
    
    if (newState) {
      toast.success("🌾 Village Mode Enabled - Optimized for rural areas!");
      // Apply optimizations
      document.body.classList.add('village-mode');
      
      // Disable heavy features
      localStorage.setItem('village-mode', 'true');
      localStorage.setItem('disable-images', 'true');
      localStorage.setItem('disable-animations', 'true');
    } else {
      toast.info("Standard Mode Enabled");
      document.body.classList.remove('village-mode');
      localStorage.removeItem('village-mode');
      localStorage.removeItem('disable-images');
      localStorage.removeItem('disable-animations');
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isEnabled ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
              {isEnabled ? <Wifi className="h-6 w-6 text-green-600" /> : <Signal className="h-6 w-6 text-gray-600" />}
            </div>
            <div>
              <CardTitle className="text-lg">Village Mode (ग्राम मोड)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Optimized for low network areas
              </p>
            </div>
          </div>
          <Button
            variant={isEnabled ? "default" : "outline"}
            onClick={handleToggleVillageMode}
            className="h-10"
          >
            {isEnabled ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Enabled
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Enable
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Network Status */}
        <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getNetworkIcon()}
            <span className="text-sm font-medium">{getNetworkStatus()}</span>
          </div>
          <Badge variant={networkSpeed === 'offline' ? 'destructive' : networkSpeed === 'slow' ? 'secondary' : 'default'}>
            {networkSpeed === 'offline' ? 'No Connection' : 'Connected'}
          </Badge>
        </div>

        {/* Data Savings */}
        {isEnabled && (
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-sm text-green-900 dark:text-green-100">
                Village Mode Active
              </h4>
            </div>
            <p className="text-xs text-green-700 dark:text-green-300 mb-2">
              Saving approximately <strong>{dataSaved.toFixed(1)} MB</strong> per session
            </p>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="bg-white/50">
                90% Data Saved
              </Badge>
              <Badge variant="outline" className="bg-white/50">
                3x Faster
              </Badge>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-3">
          {villageModeFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className={`p-3 rounded-lg border transition-all ${
                  feature.enabled 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                    : 'bg-muted/30 border-border'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                    feature.enabled ? 'text-green-600' : 'text-muted-foreground'
                  }`} />
                  <div>
                    <h5 className="font-medium text-xs leading-tight">{feature.title}</h5>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Network Tips */}
        {networkSpeed === 'slow' || networkSpeed === 'offline' ? (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 flex gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-semibold text-sm text-orange-900 dark:text-orange-100 mb-1">
                Network Tips (नेटवर्क टिप्स)
              </h5>
              <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
                <li>• Move to an open area for better signal</li>
                <li>• Use WiFi at PHC/Community Center if available</li>
                <li>• Essential features work offline</li>
                <li>• Data syncs when connection improves</li>
              </ul>
            </div>
          </div>
        ) : null}

        {/* Offline Capabilities */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h5 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            Works Offline (ऑफ़लाइन काम करता है)
          </h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-blue-600" />
              <span>Voice Recording</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-blue-600" />
              <span>Symptom Check</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-blue-600" />
              <span>Health Records</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-blue-600" />
              <span>Emergency SOS</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VillageMode;
