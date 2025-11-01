import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import { Brain, Video, MapPin, FileText, Mic, Send, Loader2, CreditCard, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { maskAadhaar } from "@/lib/aadhaar";

const PatientDashboard = () => {
  const [symptoms, setSymptoms] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [aadhaarNumber, setAadhaarNumber] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadConsultations();
      loadUserData();
    }
  }, [user]);

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
      
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2">Patient Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! How can we help you today?</p>
        </div>

        {/* Patient Info Card - Aadhaar */}
        {aadhaarNumber && (
          <Card className="mb-6 shadow-md border-primary/20 animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Government ID (Aadhaar)</p>
                    <p className="text-lg font-semibold font-mono">{maskAadhaar(aadhaarNumber)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <UserIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Patient Name</p>
                    <p className="font-medium">{patientName}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Symptom Analysis */}
          <Card className="lg:col-span-2 shadow-md hover:shadow-lg transition-smooth animate-slide-up">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>AI Symptom Analysis</CardTitle>
                  <CardDescription>Describe your symptoms in text or voice</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea 
                  placeholder="Type your symptoms here... (e.g., 'I have a headache and fever for 2 days')"
                  className="min-h-[150px] pr-12"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
                <Button 
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-2 text-secondary hover:bg-secondary/10"
                  onClick={startRecording}
                  disabled={isRecording}
                >
                  <Mic className={`h-5 w-5 ${isRecording ? 'text-red-500 animate-pulse' : ''}`} />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-primary"
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
                <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
                  <h4 className="font-semibold mb-2">AI Analysis:</h4>
                  <p className="text-sm whitespace-pre-wrap">{analysis}</p>
                </div>
              )}

              <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  💡 Tip: Be as detailed as possible. Include duration, severity, and any other relevant information.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-4">
            <Card 
              className="shadow-md hover:shadow-lg transition-smooth cursor-pointer animate-slide-up" 
              style={{ animationDelay: '0.1s' }}
              onClick={() => navigate("/doctors")}
            >
              <CardContent className="p-6">
                <div className="p-3 bg-accent/10 rounded-xl w-fit mb-4">
                  <Video className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold mb-2">Consult Doctor</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Book a video consultation with verified doctors
                </p>
                <Button className="w-full">View Doctors</Button>
              </CardContent>
            </Card>

            <Card 
              className="shadow-md hover:shadow-lg transition-smooth cursor-pointer animate-slide-up" 
              style={{ animationDelay: '0.2s' }}
              onClick={() => navigate("/hospitals")}
            >
              <CardContent className="p-6">
                <div className="p-3 bg-secondary/10 rounded-xl w-fit mb-4">
                  <MapPin className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-semibold mb-2">Find Hospitals</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Locate nearby hospitals and pharmacies
                </p>
                <Button variant="outline" className="w-full">Open Map</Button>
              </CardContent>
            </Card>

            <Card 
              className="shadow-md hover:shadow-lg transition-smooth cursor-pointer animate-slide-up" 
              style={{ animationDelay: '0.3s' }}
              onClick={() => navigate("/health-records")}
            >
              <CardContent className="p-6">
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Health Records</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  View and download your medical history
                </p>
                <Button variant="outline" className="w-full">View Records</Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="mt-8 shadow-md animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest health checkups and consultations</CardDescription>
          </CardHeader>
          <CardContent>
            {consultations.length > 0 ? (
              <div className="space-y-3">
                {consultations.map((consultation) => (
                  <div 
                    key={consultation.id}
                    className="p-4 border border-border rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{consultation.symptoms.substring(0, 50)}...</p>
                        <p className="text-sm text-muted-foreground">
                          Status: {consultation.status}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(consultation.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity. Start by analyzing your symptoms!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientDashboard;
