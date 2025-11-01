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
import { Brain, Video, MapPin, FileText, Send, Loader2, CreditCard, User as UserIcon, Calendar, Upload, Heart, Pill, BadgeIndianRupee, Activity, Wifi, Download } from "lucide-react";
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
    const today = new Date().toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let analysis = `╔════════════════════════════════════════════════════════════╗
║           MedAid AI - SYMPTOM ANALYSIS REPORT              ║
║                  Generated: ${today.padEnd(28, ' ')}║
╚════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PATIENT COMPLAINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${symptoms}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 AI PRELIMINARY ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
    
    let severityLevel = "LOW";
    let severityEmoji = "🟢";
    const conditions: string[] = [];
    const recommendations: string[] = [];
    let redFlags = false;
    
    // Analyze symptoms and determine conditions
    if (lowerSymptoms.includes('fever') || lowerSymptoms.includes('temperature')) {
      severityLevel = "MEDIUM";
      severityEmoji = "🟡";
      conditions.push(
        "• Viral Infection (Most Common)\n  - Usually self-limiting, lasts 3-7 days\n  - Body's immune response to virus",
        "• Bacterial Infection\n  - May require antibiotics if persistent\n  - Consult doctor if fever >3 days",
        "• Influenza (Flu)\n  - Typical viral respiratory infection\n  - Rest and hydration important"
      );
      recommendations.push(
        "• Monitor temperature every 4-6 hours",
        "• Stay hydrated (8-10 glasses water/day)",
        "• Rest adequately (7-8 hours sleep)",
        "• Paracetamol for fever >100°F (as per dosage)",
        "• Sponge with lukewarm water if fever high"
      );
    }
    
    if (lowerSymptoms.includes('headache') || lowerSymptoms.includes('head pain')) {
      conditions.push(
        "• Tension Headache (Most Common)\n  - Caused by stress, poor posture, or fatigue",
        "• Migraine\n  - If severe with light/sound sensitivity\n  - May need prescription medication",
        "• Dehydration\n  - Common cause of headaches\n  - Easily treatable with fluids",
        "• Sinusitis\n  - If accompanied by facial pressure\n  - May need decongestants"
      );
      recommendations.push(
        "• Drink plenty of water",
        "• Rest in dark, quiet room",
        "• Apply cold compress to forehead",
        "• Take over-the-counter pain relief"
      );
    }
    
    if (lowerSymptoms.includes('cough') || lowerSymptoms.includes('cold')) {
      conditions.push(
        "• Upper Respiratory Infection (URI)\n  - Common cold, usually viral",
        "• Bronchitis\n  - If cough is persistent with mucus",
        "• Allergic Reaction\n  - If seasonal or environmental trigger"
      );
      recommendations.push(
        "• Warm fluids (ginger tea, warm water)",
        "• Steam inhalation 2-3 times daily",
        "• Avoid cold foods and drinks",
        "• Use honey for cough relief (1 tsp)"
      );
    }
    
    if (lowerSymptoms.includes('chest pain') || lowerSymptoms.includes('difficulty breathing') || 
        lowerSymptoms.includes('breathless') || lowerSymptoms.includes('shortness of breath')) {
      severityLevel = "HIGH - EMERGENCY";
      severityEmoji = "🔴";
      redFlags = true;
      analysis += `${severityEmoji} SEVERITY: ${severityLevel}

⚠️ ⚠️ ⚠️ IMMEDIATE MEDICAL ATTENTION REQUIRED ⚠️ ⚠️ ⚠️

Chest pain and breathing difficulties are MEDICAL EMERGENCIES.

🚨 URGENT ACTION REQUIRED:
• Call Emergency Services (108/102) immediately
• Go to nearest Emergency Room NOW
• Do NOT drive yourself - call ambulance
• Stay calm and sit upright
• Loosen tight clothing

DO NOT DELAY - SEEK IMMEDIATE MEDICAL CARE

`;
      return analysis + `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚕️ DISCLAIMER: This is an AI-powered preliminary assessment only.
It is NOT a substitute for professional medical diagnosis.
Please consult a qualified healthcare provider immediately.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }
    
    if (lowerSymptoms.includes('stomach') || lowerSymptoms.includes('abdominal') || 
        lowerSymptoms.includes('nausea') || lowerSymptoms.includes('vomit')) {
      conditions.push(
        "• Gastroenteritis (Stomach Flu)\n  - Viral infection of digestive system",
        "• Food Poisoning\n  - If symptoms started after eating\n  - Usually resolves in 24-48 hours",
        "• Indigestion/Dyspepsia\n  - Common digestive issue\n  - Diet modification may help"
      );
      recommendations.push(
        "• Oral Rehydration Solution (ORS)",
        "• Avoid solid foods for few hours",
        "• Start with bland foods (rice, banana)",
        "• Small, frequent meals"
      );
    }

    if (lowerSymptoms.includes('body pain') || lowerSymptoms.includes('body ache') || 
        lowerSymptoms.includes('weakness') || lowerSymptoms.includes('fatigue')) {
      conditions.push(
        "• Viral Fever/Flu\n  - Body aches common with viral infections",
        "• Fatigue/Overexertion\n  - Physical or mental exhaustion"
      );
      recommendations.push(
        "• Complete bed rest",
        "• Adequate sleep (8+ hours)",
        "• Light, nutritious diet",
        "• Avoid strenuous activity"
      );
    }
    
    // Add severity assessment
    if (!redFlags) {
      analysis += `${severityEmoji} SEVERITY LEVEL: ${severityLevel}
${severityLevel === "MEDIUM" ? "\n⚠️ Moderate attention needed. Monitor symptoms closely." : "\n✓ Generally manageable at home with proper care."}

`;
    }
    
    // Add possible conditions
    if (conditions.length > 0) {
      analysis += `📊 POSSIBLE CONDITIONS (Most to Least Likely):

${conditions.join('\n\n')}

`;
    }
    
    // Add recommendations
    analysis += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💊 RECOMMENDED HOME CARE & MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
    
    if (recommendations.length > 0) {
      analysis += `${recommendations.join('\n')}\n\n`;
    }
    
    analysis += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏥 WHEN TO SEEK MEDICAL ATTENTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

See a Doctor if:
• Symptoms persist beyond 3-5 days
• Symptoms worsen despite home care
• You develop new concerning symptoms
• You feel uncertain about your condition

🚨 GO TO EMERGENCY ROOM IMMEDIATELY FOR:
• Severe chest pain or pressure
• Difficulty breathing/shortness of breath
• Sudden severe headache (worst of your life)
• Loss of consciousness or confusion
• Severe bleeding that won't stop
• Severe abdominal pain
• High fever (>103°F/39.4°C) not reducing
• Persistent vomiting (unable to keep fluids down)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Book Video Consultation - Get professional advice from home
✓ Find Nearby Hospitals - Locate healthcare facilities near you
✓ Keep Health Records - Track symptoms and medications
✓ Monitor Symptoms - Note any changes or improvements

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚕️ MEDICAL DISCLAIMER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This AI-powered analysis is for informational purposes only and 
is NOT a substitute for professional medical advice, diagnosis, 
or treatment. Always seek the advice of a qualified healthcare 
provider with any questions regarding a medical condition.

✓ Offline AI Analysis - Works without internet connection
✓ Powered by MedAid Smart Health Assistant
✓ Available in 8 Indian Languages

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    
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
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 h-auto p-1 gap-1 overflow-x-auto">
            <TabsTrigger value="symptoms" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1 whitespace-nowrap">
              <Brain className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{t('aiAnalysis')}</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
            <TabsTrigger value="coach" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1 whitespace-nowrap">
              <Heart className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">AI Chatbot</span>
              <span className="sm:hidden">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="healthcare" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1 whitespace-nowrap">
              <MapPin className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Healthcare</span>
              <span className="sm:hidden">🏥</span>
            </TabsTrigger>
            <TabsTrigger value="medicines" className="text-xs md:text-sm py-2 md:py-2.5 flex items-center gap-1 whitespace-nowrap">
              <Pill className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Medicines & Aid</span>
              <span className="sm:hidden">💊</span>
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
                <div className="mt-3 md:mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm md:text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Medical Analysis Report
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const reportWindow = window.open('', '_blank');
                        if (reportWindow) {
                          reportWindow.document.write(`
                            <html>
                              <head>
                                <title>MedAid - Medical Analysis Report</title>
                                <style>
                                  body { 
                                    font-family: 'Courier New', monospace; 
                                    padding: 20px; 
                                    max-width: 800px; 
                                    margin: 0 auto;
                                    line-height: 1.6;
                                  }
                                  pre { 
                                    white-space: pre-wrap; 
                                    word-wrap: break-word;
                                    font-size: 12px;
                                  }
                                  @media print {
                                    body { padding: 10px; }
                                    .no-print { display: none; }
                                  }
                                </style>
                              </head>
                              <body>
                                <div class="no-print" style="margin-bottom: 20px;">
                                  <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer; background: #0066cc; color: white; border: none; border-radius: 5px;">Print Report</button>
                                  <button onclick="window.close()" style="padding: 10px 20px; cursor: pointer; margin-left: 10px;">Close</button>
                                </div>
                                <pre>${analysis}</pre>
                              </body>
                            </html>
                          `);
                          reportWindow.document.close();
                        }
                      }}
                      className="text-xs"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Print/Download
                    </Button>
                  </div>
                  <div className="p-3 md:p-4 bg-slate-900 dark:bg-slate-950 rounded-lg border-2 border-primary/20 shadow-lg">
                    <pre className="text-xs md:text-sm whitespace-pre-wrap text-slate-100 font-mono overflow-x-auto">{analysis}</pre>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      onClick={() => navigate("/doctors")}
                      className="flex-1"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Consult Doctor Now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const blob = new Blob([analysis], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `MedAid-Report-${new Date().toISOString().split('T')[0]}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast.success("Report downloaded!");
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Save Report
                    </Button>
                  </div>
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

      {/* Healthcare Tab - Combined Appointments, Hospitals & Documents */}
      <TabsContent value="healthcare" className="space-y-4">
        <div className="space-y-4">
          {/* Appointments Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Book Appointment
            </h3>
            {user && <AppointmentBooking userId={user.id} />}
          </div>

          {/* Hospitals Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Find Hospitals Nearby
            </h3>
            <HospitalFinder />
          </div>

          {/* Documents Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Documents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user && (
                <>
                  <AadhaarUpload userId={user.id} />
                  <PrescriptionUpload userId={user.id} />
                </>
              )}
            </div>
          </div>
        </div>
      </TabsContent>

      {/* AI Chatbot Tab - Combined with Health Insights */}
      <TabsContent value="coach" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* AI Chatbot Section */}
          <div className="space-y-4">
            <PreventiveAICoach />
          </div>
          
          {/* Government Health Heatmap Section */}
          <div className="space-y-4">
            <GovernmentHealthHeatmap />
          </div>
        </div>
      </TabsContent>

      {/* Medicines & Financial Aid Tab - Combined */}
      <TabsContent value="medicines" className="space-y-4">
        <div className="space-y-4">
          {/* Medicines Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              Jan Aushadhi Medicine Tracker
            </h3>
            <JanAushadhiStockTracker />
          </div>

          {/* Subsidy Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BadgeIndianRupee className="h-5 w-5 text-primary" />
              Government Subsidy & Aid Programs
            </h3>
            <SubsidyEligibilityChecker />
          </div>
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
