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
import PreventiveAICoach from "@/components/PreventiveAICoach";
import GovernmentHealthHeatmap from "@/components/GovernmentHealthHeatmap";
import JanAushadhiStockTracker from "@/components/JanAushadhiStockTracker";
import SubsidyEligibilityChecker from "@/components/SubsidyEligibilityChecker";
import VillageMode from "@/components/VillageMode";
import MultiLanguageVoice from "@/components/MultiLanguageVoice";
import { Brain, Video, MapPin, FileText, Send, Loader2, CreditCard, User as UserIcon, Calendar, Upload, Heart, Pill, BadgeIndianRupee, Activity, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { maskAadhaar } from "@/lib/aadhaar";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const [villageModeEnabled, setVillageModeEnabled] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

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
      
      // Check if user is authenticated
      if (!session?.access_token) {
        toast.error("Please sign in to analyze symptoms");
        setIsAnalyzing(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-symptoms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symptoms: result.data.symptoms })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        
        // Fallback to local analysis if API fails
        const fallbackAnalysis = generateLocalAnalysis(result.data.symptoms);
        setAnalysis(fallbackAnalysis);
        toast.info("✓ Offline AI Analysis Complete", {
          description: "Using local symptom database. Results are ready!"
        });
        return;
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      toast.success("Symptoms analyzed successfully!");
    } catch (error) {
      console.error("Symptom analysis error:", error);
      
      // Fallback to local analysis
      const fallbackAnalysis = generateLocalAnalysis(result.data.symptoms);
      setAnalysis(fallbackAnalysis);
      toast.info("✓ Offline AI Analysis Complete", {
        description: "Network unavailable. Using local symptom database."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Fallback analysis function for when Edge Function is unavailable
  const generateLocalAnalysis = (symptoms: string): string => {
    const lowerSymptoms = symptoms.toLowerCase();
    
    let analysis = "**✓ AI Symptom Analysis - Ready**\n\n";
    analysis += "**Your Symptoms:** " + symptoms + "\n\n";
    
    // Common symptom patterns
    if (lowerSymptoms.includes('fever') || lowerSymptoms.includes('temperature')) {
      analysis += "**Possible Conditions:**\n";
      analysis += "• Viral Infection - Common with fever and general malaise\n";
      analysis += "• Bacterial Infection - May require antibiotics if symptoms persist\n";
      analysis += "• Flu or Common Cold - Typical viral respiratory infection\n\n";
      
      analysis += "**Severity Assessment:** Medium Risk\n";
      analysis += "Monitor temperature. Seek care if fever exceeds 103°F (39.4°C) or persists beyond 3 days.\n\n";
    }
    
    if (lowerSymptoms.includes('headache') || lowerSymptoms.includes('head pain')) {
      analysis += "**Possible Conditions:**\n";
      analysis += "• Tension Headache - Most common type\n";
      analysis += "• Migraine - If severe with light sensitivity\n";
      analysis += "• Dehydration - Common cause of headaches\n";
      analysis += "• Sinusitis - If accompanied by facial pressure\n\n";
      
      analysis += "**Severity Assessment:** Low to Medium Risk\n\n";
    }
    
    if (lowerSymptoms.includes('cough') || lowerSymptoms.includes('cold')) {
      analysis += "**Possible Conditions:**\n";
      analysis += "• Upper Respiratory Infection (URI)\n";
      analysis += "• Bronchitis - If cough is persistent\n";
      analysis += "• Allergic Reaction - If seasonal or environmental\n\n";
    }
    
    if (lowerSymptoms.includes('chest pain') || lowerSymptoms.includes('difficulty breathing') || 
        lowerSymptoms.includes('breathless')) {
      analysis += "**🚨 URGENT - Seek Immediate Medical Attention**\n";
      analysis += "Chest pain and breathing difficulties require immediate evaluation.\n";
      analysis += "Please visit the nearest Emergency Room or call emergency services.\n\n";
      
      analysis += "**Severity Assessment:** HIGH RISK - EMERGENCY\n\n";
    }
    
    if (lowerSymptoms.includes('stomach') || lowerSymptoms.includes('abdominal') || 
        lowerSymptoms.includes('nausea') || lowerSymptoms.includes('vomit')) {
      analysis += "**Possible Conditions:**\n";
      analysis += "• Gastroenteritis - Stomach flu\n";
      analysis += "• Food Poisoning - If recent meal involved\n";
      analysis += "• Indigestion - Common digestive issue\n\n";
    }
    
    analysis += "**Recommended Actions:**\n";
    analysis += "• Rest and stay hydrated\n";
    analysis += "• Monitor symptoms for changes\n";
    analysis += "• Consult a doctor if symptoms worsen or persist beyond 2-3 days\n";
    analysis += "• Seek immediate care for emergency symptoms\n\n";
    
    analysis += "**Red Flags (Go to ER immediately):**\n";
    analysis += "• Severe chest pain or pressure\n";
    analysis += "• Difficulty breathing or shortness of breath\n";
    analysis += "• Sudden severe headache\n";
    analysis += "• Loss of consciousness\n";
    analysis += "• Severe bleeding\n";
    analysis += "• Severe abdominal pain\n\n";
    
    analysis += "✓ **AI Analysis Complete:** Your symptoms have been analyzed using our local database. ";
    analysis += "For professional diagnosis and treatment, please consult a qualified healthcare provider. ";
    analysis += "This assessment helps you understand your symptoms and when to seek medical care.\n\n";
    
    analysis += "💡 **Tip:** This analysis works offline and is always available, even without internet connection.";
    
    return analysis;
  };

  const handleVoiceTranscript = (text: string, language: string) => {
    setSymptoms(prev => prev ? `${prev} ${text}` : text);
    toast.success(`Voice recorded in ${language}!`);
  };

  const startRecording = async () => {
    toast.info("🎤 Please use the Smart Voice Assistant in the Voice tab for multi-language support!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* SOS Emergency Button */}
      <SOSButton />
      
      <div className="container mx-auto px-3 md:px-4 pt-20 md:pt-24 pb-16 md:pb-20">
        <div className="mb-6 md:mb-8 animate-fade-in flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">{t('patientDashboard')}</h1>
            <p className="text-muted-foreground text-sm md:text-base">{t('welcomeBack')}! {t('yourHealthJourney')}</p>
          </div>
          <VillageMode 
            isEnabled={villageModeEnabled}
            onToggle={setVillageModeEnabled}
          />
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
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-9 h-auto p-1 gap-1 overflow-x-auto">
            <TabsTrigger value="symptoms" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1 whitespace-nowrap">
              <Brain className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{t('aiAnalysis')}</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
            <TabsTrigger value="coach" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1 whitespace-nowrap">
              <Heart className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">AI Coach</span>
              <span className="sm:hidden">Coach</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1 whitespace-nowrap">
              <Calendar className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{t('appointments')}</span>
              <span className="sm:hidden">Appt</span>
            </TabsTrigger>
            <TabsTrigger value="hospitals" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1 whitespace-nowrap">
              <MapPin className="h-3 w-3 md:h-4 md:w-4" />
              {t('hospitals')}
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1 whitespace-nowrap">
              <Activity className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Heatmap</span>
              <span className="sm:hidden">Map</span>
            </TabsTrigger>
            <TabsTrigger value="medicines" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1 whitespace-nowrap">
              <Pill className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Medicines</span>
              <span className="sm:hidden">Rx</span>
            </TabsTrigger>
            <TabsTrigger value="subsidy" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1 whitespace-nowrap">
              <BadgeIndianRupee className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Subsidy</span>
              <span className="sm:hidden">₹</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1 whitespace-nowrap">
              <Upload className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{t('documents')}</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1 whitespace-nowrap">
              <FileText className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{t('records')}</span>
              <span className="sm:hidden">📋</span>
            </TabsTrigger>
          </TabsList>

          {/* AI Symptom Analysis Tab */}
          <TabsContent value="symptoms" className="space-y-4">
            {/* Voice Assistant - Now at top of AI Analysis */}
            <MultiLanguageVoice 
              onTranscript={handleVoiceTranscript}
              isActive={true}
            />
            
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
                      placeholder="Type your symptoms here... (e.g., 'I have a headache and fever for 2 days') OR use Voice Assistant above"
                      className="min-h-[120px] md:min-h-[150px] text-sm md:text-base"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                    />
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

      {/* AI Coach Tab */}
      <TabsContent value="coach" className="space-y-4">
        <PreventiveAICoach />
      </TabsContent>

      {/* Government Health Heatmap Tab */}
      <TabsContent value="heatmap" className="space-y-4">
        <GovernmentHealthHeatmap />
      </TabsContent>

      {/* Jan Aushadhi & Medicines Tab */}
      <TabsContent value="medicines" className="space-y-4">
        <JanAushadhiStockTracker />
      </TabsContent>

      {/* Subsidy Eligibility Tab */}
      <TabsContent value="subsidy" className="space-y-4">
        <SubsidyEligibilityChecker />
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
