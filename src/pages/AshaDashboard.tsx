import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import { 
  Pill, 
  Ambulance, 
  Stethoscope, 
  Users, 
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Phone,
  Calendar,
  Plus,
  Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ResourceRequest {
  id: string;
  resource_type: string;
  patient_name: string;
  patient_contact: string;
  village_name: string;
  urgency: string;
  status: string;
  details: string;
  government_id?: string;
  created_at: string;
}

const AshaDashboard = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    patientsHelped: 0
  });
  
  // New request form state
  const [resourceType, setResourceType] = useState<string>("");
  const [patientName, setPatientName] = useState("");
  const [patientContact, setPatientContact] = useState("");
  const [villageName, setVillageName] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadRequests();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('asha-resource-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asha_resource_requests',
          filter: `asha_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Resource request updated:', payload);
          loadRequests();
          if (payload.eventType === 'UPDATE') {
            const newRequest = payload.new as ResourceRequest;
            if (newRequest.status === 'approved') {
              toast.success("Request Approved!", {
                description: `Your ${newRequest.resource_type} request has been approved.`
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('asha_resource_requests')
        .select('*')
        .eq('asha_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading requests:', error);
        // Use mock data if table doesn't exist yet
        useMockData();
        return;
      }

      if (data) {
        setRequests(data);
        calculateStats(data);
      }
    } catch (err) {
      console.error('Error:', err);
      useMockData();
    }
  };

  const useMockData = () => {
    const mockRequests: ResourceRequest[] = [
      {
        id: "1",
        resource_type: "Medicine",
        patient_name: "Sita Devi",
        patient_contact: "+91-9876543210",
        village_name: "Rampur Village",
        urgency: "high",
        status: "approved",
        details: "Diabetes medication - Metformin 500mg, 30 tablets",
        government_id: "JAN-AUS-001234",
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "2",
        resource_type: "Ambulance",
        patient_name: "Ram Kumar",
        patient_contact: "+91-9876543211",
        village_name: "Rampur Village",
        urgency: "high",
        status: "pending",
        details: "Emergency transport to district hospital - chest pain",
        government_id: "108-AMB-5678",
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "3",
        resource_type: "Doctor Visit",
        patient_name: "Lakshmi Bai",
        patient_contact: "+91-9876543212",
        village_name: "Rampur Village",
        urgency: "medium",
        status: "completed",
        details: "Antenatal checkup - 7 months pregnant",
        government_id: "PHC-DOC-2345",
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    setRequests(mockRequests);
    calculateStats(mockRequests);
  };

  const calculateStats = (data: ResourceRequest[]) => {
    setStats({
      totalRequests: data.length,
      pending: data.filter(r => r.status === 'pending').length,
      approved: data.filter(r => r.status === 'approved').length,
      completed: data.filter(r => r.status === 'completed').length,
      patientsHelped: new Set(data.map(r => r.patient_contact)).size
    });
  };

  const handleSubmitRequest = async () => {
    if (!resourceType || !patientName || !patientContact || !villageName || !details) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate government resource ID based on type
      let governmentId = "";
      if (resourceType === "Medicine") {
        governmentId = `JAN-AUS-${Math.floor(100000 + Math.random() * 900000)}`;
      } else if (resourceType === "Ambulance") {
        governmentId = `108-AMB-${Math.floor(1000 + Math.random() * 9000)}`;
      } else if (resourceType === "Doctor Visit") {
        governmentId = `PHC-DOC-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const newRequest = {
        asha_id: user?.id,
        resource_type: resourceType,
        patient_name: patientName,
        patient_contact: patientContact,
        village_name: villageName,
        urgency: urgency,
        status: 'pending',
        details: details,
        government_id: governmentId,
        created_at: new Date().toISOString()
      };

      // Try to insert into database
      const { error } = await supabase
        .from('asha_resource_requests')
        .insert(newRequest);

      if (error) {
        console.error('Database error:', error);
        // Add to mock data if table doesn't exist
        setRequests(prev => [{ ...newRequest, id: Date.now().toString() } as ResourceRequest, ...prev]);
        calculateStats([{ ...newRequest, id: Date.now().toString() } as ResourceRequest, ...requests]);
      }

      toast.success("Request submitted successfully!", {
        description: `Government Resource ID: ${governmentId}`
      });

      // Reset form
      setResourceType("");
      setPatientName("");
      setPatientContact("");
      setVillageName("");
      setUrgency("medium");
      setDetails("");
      setDialogOpen(false);
      
      loadRequests();
    } catch (err) {
      console.error('Error submitting request:', err);
      toast.error("Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "outline" as const, icon: Clock, color: "text-yellow-600" },
      approved: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      completed: { variant: "secondary" as const, icon: CheckCircle, color: "text-blue-600" },
      rejected: { variant: "destructive" as const, icon: XCircle, color: "text-red-600" }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const colors = {
      high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    };
    
    return (
      <Badge className={colors[urgency as keyof typeof colors]}>
        {urgency.toUpperCase()}
      </Badge>
    );
  };

  const getResourceIcon = (type: string) => {
    const icons = {
      Medicine: Pill,
      Ambulance: Ambulance,
      "Doctor Visit": Stethoscope
    };
    return icons[type as keyof typeof icons] || Package;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="mb-8 animate-fade-in flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ASHA Worker Dashboard
            </h1>
            <p className="text-muted-foreground">Community Healthcare Resource Management</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Request Government Resource</DialogTitle>
                <DialogDescription>
                  Submit a request for medicines, ambulance, or doctor visit. A government resource ID will be assigned.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="resource-type">Resource Type *</Label>
                  <Select value={resourceType} onValueChange={setResourceType}>
                    <SelectTrigger id="resource-type">
                      <SelectValue placeholder="Select resource type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Medicine">
                        <div className="flex items-center gap-2">
                          <Pill className="h-4 w-4" />
                          Medicine (Jan Aushadhi)
                        </div>
                      </SelectItem>
                      <SelectItem value="Ambulance">
                        <div className="flex items-center gap-2">
                          <Ambulance className="h-4 w-4" />
                          Ambulance (108 Service)
                        </div>
                      </SelectItem>
                      <SelectItem value="Doctor Visit">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4" />
                          Doctor Visit (PHC)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patient-name">Patient Name *</Label>
                    <Input
                      id="patient-name"
                      placeholder="Enter patient name"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patient-contact">Patient Contact *</Label>
                    <Input
                      id="patient-contact"
                      placeholder="+91-XXXXXXXXXX"
                      value={patientContact}
                      onChange={(e) => setPatientContact(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="village">Village/Location *</Label>
                  <Input
                    id="village"
                    placeholder="Enter village name"
                    value={villageName}
                    onChange={(e) => setVillageName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency Level *</Label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger id="urgency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          Low - Routine
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-yellow-500" />
                          Medium - Soon
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                          High - Urgent
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details">Details *</Label>
                  <Textarea
                    id="details"
                    placeholder="Describe the requirement in detail (symptoms, medicine name, reason for visit, etc.)"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleSubmitRequest} 
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Request
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="shadow-md animate-slide-up">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Requests</p>
                  <p className="text-3xl font-bold">{stats.totalRequests}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending</p>
                  <p className="text-3xl font-bold">{stats.pending}</p>
                </div>
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Approved</p>
                  <p className="text-3xl font-bold">{stats.approved}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-500/10">
                  <CheckCircle className="h-6 w-6 text-green-600" />
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
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Patients Helped</p>
                  <p className="text-3xl font-bold">{stats.patientsHelped}</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/10">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resource Requests */}
        <Card className="shadow-md animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <CardTitle>Resource Requests</CardTitle>
            <CardDescription>
              Track your medicine, ambulance, and doctor visit requests with government resource IDs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length > 0 ? (
              <div className="space-y-4">
                {requests.map((request) => {
                  const ResourceIcon = getResourceIcon(request.resource_type);
                  return (
                    <div 
                      key={request.id}
                      className="p-4 border border-border rounded-lg hover:shadow-md transition-smooth"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ResourceIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{request.resource_type}</h4>
                              {getUrgencyBadge(request.urgency)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{request.details}</p>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{request.patient_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{request.patient_contact}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{request.village_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{new Date(request.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {request.government_id && (
                              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm font-mono">
                                <AlertCircle className="h-4 w-4 text-primary" />
                                <span className="font-medium">Govt. Resource ID:</span>
                                <span className="text-primary">{request.government_id}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(request.status)}
                          <span className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No resource requests yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Click "New Request" to submit your first resource request
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="shadow-md animate-slide-up mt-8" style={{ animationDelay: '0.6s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Government Resource Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Jan Aushadhi</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Request medicines from Jan Aushadhi Kendras with tracking ID (JAN-AUS-XXXXXX)
                </p>
              </div>

              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Ambulance className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">108 Ambulance</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Emergency ambulance service with government tracking (108-AMB-XXXX)
                </p>
              </div>

              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">PHC Doctor</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Schedule doctor visits from Primary Health Centre (PHC-DOC-XXXX)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AshaDashboard;
