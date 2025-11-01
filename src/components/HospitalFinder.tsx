import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Phone, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Hospital {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  emergency_services: boolean;
  distance?: number;
}

const mockHospitals: Hospital[] = [
  {
    id: "1",
    name: "AIIMS Delhi",
    address: "Ansari Nagar, New Delhi, Delhi 110029",
    latitude: 28.5672,
    longitude: 77.2100,
    phone: "+91-11-26588500",
    emergency_services: true
  },
  {
    id: "2",
    name: "Apollo Hospital",
    address: "Sarita Vihar, Delhi, 110076",
    latitude: 28.5355,
    longitude: 77.2860,
    phone: "+91-11-26925858",
    emergency_services: true
  },
  {
    id: "3",
    name: "Max Super Speciality Hospital",
    address: "Saket, New Delhi, Delhi 110017",
    latitude: 28.5245,
    longitude: 77.2066,
    phone: "+91-11-26515050",
    emergency_services: true
  },
  {
    id: "4",
    name: "Fortis Hospital",
    address: "Shalimar Bagh, Delhi, 110088",
    latitude: 28.7174,
    longitude: 77.1639,
    phone: "+91-11-47135000",
    emergency_services: true
  },
  {
    id: "5",
    name: "Sir Ganga Ram Hospital",
    address: "Rajinder Nagar, New Delhi, Delhi 110060",
    latitude: 28.6436,
    longitude: 77.1855,
    phone: "+91-11-25750000",
    emergency_services: true
  }
];

export const HospitalFinder = () => {
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal
  };

  const getCurrentLocation = () => {
    setLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setLoading(false);
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        // Calculate distances and sort hospitals
        const hospitalsWithDistance = mockHospitals.map(hospital => ({
          ...hospital,
          distance: calculateDistance(latitude, longitude, hospital.latitude, hospital.longitude)
        }));

        hospitalsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        setHospitals(hospitalsWithDistance);
        setLoading(false);
        toast.success("Location detected! Showing nearby hospitals");
      },
      (error) => {
        setLoading(false);
        let errorMsg = "Unable to get your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMsg = "Location request timed out";
            break;
        }
        
        setLocationError(errorMsg);
        toast.error(errorMsg);
        
        // Show hospitals without distance
        setHospitals(mockHospitals);
      }
    );
  };

  const openGoogleMaps = (hospital: Hospital) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const callHospital = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  useEffect(() => {
    // Show all hospitals on load
    setHospitals(mockHospitals);
  }, []);

  return (
    <Card className="shadow-md touch-manipulation">
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <MapPin className="h-5 w-5 md:h-6 md:w-6 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <CardTitle className="text-base md:text-lg">Nearby Hospitals</CardTitle>
              <CardDescription className="text-xs md:text-sm">Find hospitals near you</CardDescription>
            </div>
          </div>
          <Button
            onClick={getCurrentLocation}
            disabled={loading}
            size="sm"
            className="h-8 md:h-9 text-xs md:text-sm touch-manipulation active:scale-95"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4 mr-1" />
            )}
            Detect Location
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 space-y-3">
        {locationError && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs md:text-sm text-yellow-800 dark:text-yellow-200">{locationError}</p>
          </div>
        )}

        {userLocation && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs md:text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Location detected: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </p>
          </div>
        )}

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {hospitals.map((hospital) => (
            <div
              key={hospital.id}
              className="p-3 md:p-4 border border-border rounded-lg hover:shadow-md transition-smooth touch-manipulation"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm md:text-base line-clamp-1">{hospital.name}</h4>
                    <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mt-1">{hospital.address}</p>
                  </div>
                  {hospital.emergency_services && (
                    <Badge variant="destructive" className="text-xs">Emergency</Badge>
                  )}
                </div>

                {hospital.distance !== undefined && (
                  <p className="text-xs md:text-sm font-medium text-primary">
                    📍 {hospital.distance} km away
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    onClick={() => openGoogleMaps(hospital)}
                    size="sm"
                    className="flex-1 h-9 text-xs md:text-sm touch-manipulation active:scale-95"
                  >
                    <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                    Get Directions
                  </Button>
                  {hospital.phone && (
                    <Button
                      onClick={() => callHospital(hospital.phone!)}
                      size="sm"
                      variant="outline"
                      className="flex-1 h-9 text-xs md:text-sm touch-manipulation active:scale-95"
                    >
                      <Phone className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                      Call
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default HospitalFinder;
