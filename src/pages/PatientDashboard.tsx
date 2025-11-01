import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import HealthNews from "@/components/HealthNews";
import GovtSchemes from "@/components/GovtSchemes";
import SOSButton from "@/components/SOSButton";
import AadhaarUpload from "@/components/AadhaarUpload";
import PrescriptionUpload from "@/components/PrescriptionUpload";
import HospitalFinder from "@/components/HospitalFinder";
import AppointmentBooking from "@/components/AppointmentBooking";
import { Brain, Video, MapPin, FileText, Mic, Send, Loader2, CreditCard, User as UserIcon, Calendar, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { maskAadhaar } from "@/lib/aadhaar";

interface Consultation {
  id: string;
  symptoms: string;
  status: string;
  created_at: string;
}

const PatientDashboard = () => {
  const [symptoms, setSymptoms] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [aadhaarNumber, setAadhaarNumber] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadUserData = async () => {
    if (!user) return;
    
    // Get Aadhaar from user metadata
    const aadhaar = user.user_metadata?.aadhaar_number || "";
    const name = user.user_metadata?.full_name || user.email || "";
    
    setAadhaarNumber(aadhaar);
    setPatientName(name);
  };

  const loadConsultations = async () => {
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .eq("patient_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setConsultations(data);
    }
  };

  useEffect(() => {
    if (user) {
      loadConsultations();
      loadUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const symptomSchema = z.object({
    symptoms: z.string()
      .trim()
      .min(10, "Please provide more detail (at least 10 characters)")
      .max(2000, "Please keep under 2000 characters")
      .regex(/^[a-zA-Z0-9\s.,!?'-]+$/, "Only letters, numbers, and basic punctuation allowed")
  });

  const analyzeSymptoms = async () => {
    const result = symptomSchema.safeParse({ symptoms });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-symptoms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symptoms: result.data.symptoms })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze symptoms');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      toast.success("Symptoms analyzed successfully!");
    } catch (error) {
      toast.error("Failed to analyze symptoms");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      toast.success("Voice recording started");
      setIsRecording(true);
      
      // Implement actual voice recording logic here
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        toast.info("Voice recording feature coming soon!");
      }, 3000);
    } catch (error) {
      toast.error("Microphone access denied");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* SOS Emergency Button */}
      <SOSButton />
      
      <div className="container mx-auto px-3 md:px-4 pt-20 md:pt-24 pb-16 md:pb-20">
        <div className="mb-6 md:mb-8 animate-fade-in">
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">Patient Dashboard</h1>
          <p className="text-muted-foreground text-sm md:text-base">Welcome back! How can we help you today?</p>
        </div>

        {/* Patient Info Card - Aadhaar */}
        {aadhaarNumber && (
          <Card className="mb-4 md:mb-6 shadow-md border-primary/20 animate-fade-in touch-manipulation active:scale-[0.99]">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                    <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Government ID (Aadhaar)</p>
                    <p className="text-base md:text-lg font-semibold font-mono">{maskAadhaar(aadhaarNumber)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 bg-green-500/10 rounded-lg">
                    <UserIcon className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Patient Name</p>
                    <p className="text-sm md:text-base font-medium">{patientName}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs for Dashboard Features */}
        <Tabs defaultValue="symptoms" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 gap-1">
            <TabsTrigger value="symptoms" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1">
              <Brain className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">AI</span> Analysis
            </TabsTrigger>
            <TabsTrigger value="appointments" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1">
              <Calendar className="h-3 w-3 md:h-4 md:w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="hospitals" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1">
              <MapPin className="h-3 w-3 md:h-4 md:w-4" />
              Hospitals
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1">
              <Upload className="h-3 w-3 md:h-4 md:w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="records" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1">
              <FileText className="h-3 w-3 md:h-4 md:w-4" />
              Records
            </TabsTrigger>
          </TabsList>

          {/* AI Symptom Analysis Tab */}
          <TabsContent value="symptoms" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
              {/* AI Symptom Analysis */}
              <Card className="lg:col-span-2 shadow-md hover:shadow-lg transition-smooth animate-slide-up touch-manipulation">
                <CardHeader className="p-4 md:p-6">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg">
                      <Brain className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base md:text-lg">AI Symptom Analysis</CardTitle>
                      <CardDescription className="text-xs md:text-sm">Describe your symptoms in text or voice</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
                  <div className="relative">
                    <Textarea 
                      placeholder="Type your symptoms here... (e.g., 'I have a headache and fever for 2 days')"
                      className="min-h-[120px] md:min-h-[150px] pr-10 md:pr-12 text-sm md:text-base"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                    />
                    <Button 
                      size="icon"
                      variant="ghost"
                      className="absolute right-1 md:right-2 top-1 md:top-2 text-secondary hover:bg-secondary/10 h-8 w-8 md:h-10 md:w-10 touch-manipulation active:scale-95"
                      onClick={startRecording}
                  disabled={isRecording}
                >
                  <Mic className={`h-4 w-4 md:h-5 md:w-5 ${isRecording ? 'text-red-500 animate-pulse' : ''}`} />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-primary h-10 md:h-11 text-sm md:text-base touch-manipulation active:scale-95"
                  onClick={analyzeSymptoms}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Analyze Symptoms
                    </>
                  )}
                </Button>
              </div>
              
              {analysis && (
                <div className="mt-3 md:mt-4 p-3 md:p-4 bg-muted rounded-lg border border-border">
                  <h4 className="font-semibold mb-2 text-sm md:text-base">AI Analysis:</h4>
                  <p className="text-xs md:text-sm whitespace-pre-wrap">{analysis}</p>
                </div>
              )}

              <div className="mt-4 md:mt-6 p-3 md:p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-xs md:text-sm text-muted-foreground">
                  💡 Tip: Be as detailed as possible. Include duration, severity, and any other relevant information.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-3 md:space-y-4">
            <Card 
              className="shadow-md hover:shadow-lg transition-smooth cursor-pointer animate-slide-up touch-manipulation active:scale-[0.98]" 
              style={{ animationDelay: '0.1s' }}
              onClick={() => navigate("/doctors")}
            >
              <CardContent className="p-4 md:p-6">
                <div className="p-2 md:p-3 bg-accent/10 rounded-xl w-fit mb-3 md:mb-4">
                  <Video className="h-5 w-5 md:h-6 md:w-6 text-accent" />
                </div>
                <h3 className="font-semibold mb-1 md:mb-2 text-sm md:text-base">Consult Doctor</h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                  Book a video consultation with verified doctors
                </p>
                <Button className="w-full h-9 md:h-10 text-sm md:text-base touch-manipulation active:scale-95">View Doctors</Button>
              </CardContent>
            </Card>

            <Card 
              className="shadow-md hover:shadow-lg transition-smooth cursor-pointer animate-slide-up touch-manipulation active:scale-[0.98]" 
              style={{ animationDelay: '0.2s' }}
              onClick={() => navigate("/health-records")}
            >
              <CardContent className="p-4 md:p-6">
                <div className="p-2 md:p-3 bg-primary/10 rounded-xl w-fit mb-3 md:mb-4">
                  <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1 md:mb-2 text-sm md:text-base">Health Records</h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                  View and download your medical history
                </p>
                <Button variant="outline" className="w-full h-9 md:h-10 text-sm md:text-base touch-manipulation active:scale-95">View Records</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      {/* Appointments Tab */}
      <TabsContent value="appointments" className="space-y-4">
        {user && <AppointmentBooking userId={user.id} />}
      </TabsContent>

      {/* Hospitals Tab */}
      <TabsContent value="hospitals" className="space-y-4">
        <HospitalFinder />
      </TabsContent>

      {/* Documents Tab */}
      <TabsContent value="documents" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {user && (
            <>
              <AadhaarUpload userId={user.id} />
              <PrescriptionUpload userId={user.id} />
            </>
          )}
        </div>
      </TabsContent>

      {/* Records Tab */}
      <TabsContent value="records" className="space-y-4">
        {/* Recent Activity */}
        <Card className="shadow-md animate-slide-up touch-manipulation">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Recent Activity</CardTitle>
            <CardDescription className="text-xs md:text-sm">Your latest health checkups and consultations</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {consultations.length > 0 ? (
              <div className="space-y-2 md:space-y-3">
                {consultations.map((consultation) => (
                  <div 
                    key={consultation.id}
                    className="p-3 md:p-4 border border-border rounded-lg hover:bg-accent/5 transition-smooth touch-manipulation active:scale-[0.99]"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm md:text-base truncate">{consultation.symptoms.substring(0, 50)}...</p>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1">
                          Status: {consultation.status}
                        </p>
                      </div>
                      <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(consultation.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 md:py-8 text-muted-foreground text-xs md:text-sm">
                No recent activity. Start by analyzing your symptoms!
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

        {/* Healthcare News Section */}
        <div className="mt-6 md:mt-8 animate-slide-up">
          <HealthNews limit={3} compact={true} />
        </div>

        {/* Government Schemes Section */}
        <div className="mt-8 animate-slide-up">
          <GovtSchemes limit={2} compact={true} />
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
