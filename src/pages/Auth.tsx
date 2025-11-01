import { useState, FormEvent, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import { Activity, User, Stethoscope, Loader2, CreditCard, Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { validateAadhaar, formatAadhaar, getAadhaarError } from "@/lib/aadhaar";

const Auth = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<"patient" | "doctor">("patient");
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, user } = useAuth();

  // Sign In State
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up State
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [medicalId, setMedicalId] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarError, setAadhaarError] = useState<string | null>(null);

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      // Check user role and redirect
      const checkRoleAndRedirect = async () => {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        if (data?.role === "doctor") {
          navigate("/doctor-dashboard");
        } else {
          navigate("/patient-dashboard");
        }
      };
      
      checkRoleAndRedirect();
    }
  }, [user, navigate]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!signInEmail || !signInPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    await signIn(signInEmail, signInPassword);
    setLoading(false);
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setResetLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset email sent! Check your inbox.");
        setShowForgotPassword(false);
        setResetEmail("");
      }
    } catch (error) {
      toast.error("Failed to send reset email");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!signUpName || !signUpEmail || !signUpPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate Aadhaar for patients
    if (userType === "patient") {
      if (!aadhaarNumber) {
        toast.error("Aadhaar number is required for government healthcare");
        return;
      }
      
      const aadhaarValidationError = getAadhaarError(aadhaarNumber);
      if (aadhaarValidationError) {
        setAadhaarError(aadhaarValidationError);
        toast.error(aadhaarValidationError);
        return;
      }
    }

    if (userType === "doctor" && !medicalId) {
      toast.error("Medical ID is required for doctors");
      return;
    }

    if (signUpPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    await signUp(signUpEmail, signUpPassword, signUpName, userType, medicalId, aadhaarNumber);
    setLoading(false);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="p-2 bg-primary rounded-lg">
                <Activity className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                MedAid
              </span>
            </Link>
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to access your healthcare dashboard</p>
          </div>

          <Card className="shadow-lg border-0 gradient-card animate-slide-up">
            <CardHeader>
              <div className="flex gap-4 mb-4">
                <Button
                  variant={userType === "patient" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setUserType("patient")}
                >
                  <User className="h-4 w-4 mr-2" />
                  Patient
                </Button>
                <Button
                  variant={userType === "doctor" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setUserType("doctor")}
                >
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Doctor
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="you@example.com"
                        className="transition-smooth"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input 
                        id="password" 
                        type="password"
                        placeholder="••••••••"
                        className="transition-smooth"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                    
                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        variant="link"
                        className="text-xs md:text-sm text-primary hover:text-primary/80 p-0 h-auto"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot password?
                      </Button>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90 transition-smooth"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        `Sign In as ${userType === "patient" ? "Patient" : "Doctor"}`
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        type="text" 
                        placeholder="John Doe"
                        className="transition-smooth"
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input 
                        id="signup-email" 
                        type="email" 
                        placeholder="you@example.com"
                        className="transition-smooth"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                    {userType === "patient" && (
                      <div className="space-y-2">
                        <Label htmlFor="aadhaar" className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Aadhaar Number (Government ID)
                        </Label>
                        <Input 
                          id="aadhaar" 
                          type="text" 
                          placeholder="XXXX XXXX XXXX"
                          maxLength={14}
                          className={`transition-smooth ${aadhaarError ? 'border-red-500' : ''}`}
                          value={aadhaarNumber}
                          onChange={(e) => {
                            const formatted = formatAadhaar(e.target.value);
                            setAadhaarNumber(formatted);
                            setAadhaarError(null);
                          }}
                          onBlur={() => {
                            const error = getAadhaarError(aadhaarNumber);
                            setAadhaarError(error);
                          }}
                          disabled={loading}
                          required
                        />
                        {aadhaarError && (
                          <p className="text-sm text-red-500">{aadhaarError}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Required for government healthcare services
                        </p>
                      </div>
                    )}
                    {userType === "doctor" && (
                      <div className="space-y-2">
                        <Label htmlFor="medical-id">Medical ID</Label>
                        <Input 
                          id="medical-id" 
                          type="text" 
                          placeholder="Your medical license ID"
                          className="transition-smooth"
                          value={medicalId}
                          onChange={(e) => setMedicalId(e.target.value)}
                          disabled={loading}
                          required
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input 
                        id="signup-password" 
                        type="password"
                        placeholder="••••••••"
                        className="transition-smooth"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90 transition-smooth"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        `Sign Up as ${userType === "patient" ? "Patient" : "Doctor"}`
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <p className="text-center text-sm text-muted-foreground mt-6">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                disabled={resetLoading}
                required
                className="transition-smooth"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmail("");
                }}
                disabled={resetLoading}
                className="touch-manipulation active:scale-95"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={resetLoading}
                className="bg-primary hover:bg-primary/90 touch-manipulation active:scale-95"
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
