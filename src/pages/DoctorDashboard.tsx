import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { Users, Video, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayConsultations: 0,
    pending: 0,
    completed: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadConsultations();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('consultations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultations'
        },
        () => {
          loadConsultations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadConsultations = async () => {
    const { data, error } = await supabase
      .from("consultations")
      .select("*, profiles!consultations_patient_id_fkey(full_name)")
      .eq("doctor_id", user?.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setConsultations(data);
      
      // Calculate stats
      const today = new Date().toDateString();
      setStats({
        totalPatients: new Set(data.map(c => c.patient_id)).size,
        todayConsultations: data.filter(c => 
          new Date(c.created_at).toDateString() === today
        ).length,
        pending: data.filter(c => c.status === 'pending').length,
        completed: data.filter(c => c.status === 'completed').length
      });
    }
  };

  const handleConsultation = async (consultationId: string, status: 'accepted' | 'declined') => {
    const { error } = await supabase
      .from("consultations")
      .update({ status })
      .eq("id", consultationId);

    if (error) {
      toast.error("Failed to update consultation");
    } else {
      toast.success(`Consultation ${status}`);
      loadConsultations();
    }
  };

  const pendingConsultations = consultations.filter(c => c.status === 'pending');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2">Doctor Dashboard</h1>
          <p className="text-muted-foreground">Manage your consultations and patient requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-md animate-slide-up">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Patients</p>
                  <p className="text-3xl font-bold">{stats.totalPatients}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Today's Consultations</p>
                  <p className="text-3xl font-bold">{stats.todayConsultations}</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/10">
                  <Video className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending Requests</p>
                  <p className="text-3xl font-bold">{stats.pending}</p>
                </div>
                <div className="p-3 rounded-xl bg-accent/10">
                  <Clock className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Completed</p>
                  <p className="text-3xl font-bold">{stats.completed}</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/10">
                  <CheckCircle className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pending Consultations */}
          <Card className="lg:col-span-2 shadow-md animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle>Pending Consultation Requests</CardTitle>
              <CardDescription>Patients waiting for your response</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingConsultations.length > 0 ? (
                <div className="space-y-4">
                  {pendingConsultations.map((consultation) => (
                    <div 
                      key={consultation.id}
                      className="p-4 border border-border rounded-lg hover:shadow-md transition-smooth"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">
                            {consultation.profiles?.full_name || 'Patient'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {consultation.symptoms}
                          </p>
                        </div>
                        <Badge variant={consultation.priority === "high" ? "destructive" : "secondary"}>
                          {consultation.priority}
                        </Badge>
                      </div>
                      {consultation.ai_analysis && (
                        <div className="mb-3 p-2 bg-muted/50 rounded text-xs">
                          <p className="font-medium mb-1">AI Analysis:</p>
                          <p className="text-muted-foreground line-clamp-2">
                            {consultation.ai_analysis}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(consultation.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleConsultation(consultation.id, 'accepted')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleConsultation(consultation.id, 'declined')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No pending consultations
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile & Settings */}
          <div className="space-y-4">
            <Card className="shadow-md animate-slide-up" style={{ animationDelay: '0.5s' }}>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="mt-1 bg-secondary">Online</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Specialty</p>
                  <p className="font-medium">General Physician</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Consultation Fee</p>
                  <p className="font-medium">₹500</p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/doctor-profile")}
                >
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-md animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    const nextConsultation = consultations.find(c => c.status === 'accepted');
                    if (nextConsultation) {
                      navigate(`/consultation/${nextConsultation.id}`);
                    } else {
                      toast.error("No active consultations");
                    }
                  }}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Start Consultation
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/doctor-patients")}
                >
                  <Users className="h-4 w-4 mr-2" />
                  View All Patients
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
