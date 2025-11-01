import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, 
  Activity, 
  Apple, 
  Droplet, 
  TrendingUp, 
  Shield,
  AlertCircle,
  CheckCircle2,
  Brain,
  Sun
} from "lucide-react";
import { toast } from "sonner";

interface HealthMetric {
  name: string;
  value: number;
  target: number;
  status: 'good' | 'warning' | 'danger';
  icon: any;
  unit: string;
}

interface PreventiveTip {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: any;
}

export const PreventiveAICoach = () => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'tips' | 'habits'>('metrics');

  const healthMetrics: HealthMetric[] = [
    {
      name: "Daily Steps",
      value: 6500,
      target: 10000,
      status: 'warning',
      icon: Activity,
      unit: 'steps'
    },
    {
      name: "Water Intake",
      value: 1.8,
      target: 3.0,
      status: 'warning',
      icon: Droplet,
      unit: 'liters'
    },
    {
      name: "Sleep Quality",
      value: 75,
      target: 100,
      status: 'good',
      icon: Sun,
      unit: '%'
    },
    {
      name: "Heart Rate",
      value: 72,
      target: 70,
      status: 'good',
      icon: Heart,
      unit: 'bpm'
    }
  ];

  const preventiveTips: PreventiveTip[] = [
    {
      category: "Nutrition",
      title: "Include More Whole Grains",
      description: "Add brown rice, whole wheat, and millets to your diet for better digestion and sustained energy.",
      priority: 'high',
      icon: Apple
    },
    {
      category: "Exercise",
      title: "Morning Walk Routine",
      description: "A 30-minute brisk walk can improve cardiovascular health and boost immunity.",
      priority: 'high',
      icon: Activity
    },
    {
      category: "Hydration",
      title: "Increase Water Intake",
      description: "Drink at least 8 glasses of water daily to maintain optimal body functions.",
      priority: 'medium',
      icon: Droplet
    },
    {
      category: "Mental Health",
      title: "Daily Meditation",
      description: "10 minutes of meditation can reduce stress and improve focus significantly.",
      priority: 'medium',
      icon: Brain
    },
    {
      category: "Preventive Care",
      title: "Annual Health Checkup",
      description: "Schedule yearly health screenings for early detection of potential issues.",
      priority: 'high',
      icon: Shield
    }
  ];

  const healthHabits = [
    { name: "Morning Yoga", completed: true, streak: 15 },
    { name: "Healthy Breakfast", completed: true, streak: 22 },
    { name: "Evening Walk", completed: false, streak: 8 },
    { name: "8 Hours Sleep", completed: true, streak: 12 },
    { name: "No Smoking", completed: true, streak: 365 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'danger': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleGeneratePersonalPlan = () => {
    toast.success("Generating personalized health plan based on your metrics...");
    // TODO: Integrate with AI to generate personalized plan
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-base md:text-lg">Preventive AI Coach</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Your personalized health companion
              </CardDescription>
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={handleGeneratePersonalPlan}
            className="h-8 md:h-9 text-xs"
          >
            <Brain className="h-3 w-3 md:h-4 md:w-4 mr-1" />
            AI Plan
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6 space-y-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`pb-2 px-3 text-sm font-medium transition-colors ${
              activeTab === 'metrics'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Health Metrics
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`pb-2 px-3 text-sm font-medium transition-colors ${
              activeTab === 'tips'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            AI Tips
          </button>
          <button
            onClick={() => setActiveTab('habits')}
            className={`pb-2 px-3 text-sm font-medium transition-colors ${
              activeTab === 'habits'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Daily Habits
          </button>
        </div>

        {/* Health Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            {healthMetrics.map((metric, index) => {
              const Icon = metric.icon;
              const percentage = Math.min((metric.value / metric.target) * 100, 100);
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${getStatusColor(metric.status)}`} />
                      <span className="text-sm font-medium">{metric.name}</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {metric.value} / {metric.target} {metric.unit}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  {metric.status === 'warning' && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Need improvement
                    </p>
                  )}
                  {metric.status === 'good' && (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      On track!
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* AI Tips Tab */}
        {activeTab === 'tips' && (
          <div className="space-y-3">
            {preventiveTips.map((tip, index) => {
              const Icon = tip.icon;
              return (
                <div 
                  key={index}
                  className="p-3 border border-border rounded-lg hover:shadow-md transition-smooth"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-sm">{tip.title}</h4>
                          <p className="text-xs text-muted-foreground">{tip.category}</p>
                        </div>
                        <Badge className={`text-xs ${getPriorityColor(tip.priority)}`}>
                          {tip.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{tip.description}</p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-xs"
                        onClick={() => toast.success("Added to your daily routine!")}
                      >
                        Add to Routine
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Daily Habits Tab */}
        {activeTab === 'habits' && (
          <div className="space-y-3">
            {healthHabits.map((habit, index) => (
              <div 
                key={index}
                className="p-3 border border-border rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    habit.completed 
                      ? 'bg-green-100 dark:bg-green-900' 
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {habit.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{habit.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      🔥 {habit.streak} day streak
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant={habit.completed ? "outline" : "default"}
                  className="h-8 text-xs"
                  onClick={() => toast.success("Habit updated!")}
                >
                  {habit.completed ? "Completed" : "Mark Done"}
                </Button>
              </div>
            ))}
            
            <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg border border-primary/20 text-center">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold text-sm mb-1">Great Progress! 🎉</h4>
              <p className="text-xs text-muted-foreground">
                You're maintaining 80% of your healthy habits
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PreventiveAICoach;
