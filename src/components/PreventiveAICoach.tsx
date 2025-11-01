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
  CheckCircle2,
  Brain,
  ChevronRight,
  Target
} from "lucide-react";
import { toast } from "sonner";

interface HealthMetric {
  name: string;
  value: number;
  target: number;
  status: 'good' | 'warning' | 'danger';
  icon: typeof Activity;
  unit: string;
}

interface DailyTip {
  title: string;
  description: string;
  icon: typeof Apple;
  action: string;
}

export const PreventiveAICoach = () => {
  const [showFullMetrics, setShowFullMetrics] = useState(false);

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
      unit: 'L'
    }
  ];

  const todaysTips: DailyTip[] = [
    {
      title: "30-Minute Morning Walk",
      description: "Boosts immunity and cardiovascular health",
      icon: Activity,
      action: "Start Walk"
    },
    {
      title: "Drink 8 Glasses of Water",
      description: "Stay hydrated for optimal body functions",
      icon: Droplet,
      action: "Set Reminder"
    },
    {
      title: "Include Whole Grains",
      description: "Brown rice, millets for better digestion",
      icon: Apple,
      action: "View Recipes"
    }
  ];

  const healthScore = 75; // Overall health score out of 100

  const handleGeneratePersonalPlan = () => {
    toast.success("🎯 Generating your personalized 7-day health plan...");
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
              <CardTitle className="text-base md:text-lg">AI Health Coach</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Your daily wellness companion
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6 space-y-4">
        {/* Health Score Card */}
        <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Your Health Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">{healthScore}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-full">
              <Target className="h-8 w-8 text-primary" />
            </div>
          </div>
          <Progress value={healthScore} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground">
            {healthScore >= 80 ? '🎉 Excellent! Keep it up!' : 
             healthScore >= 60 ? '💪 Good progress! Room for improvement.' : 
             '⚠️ Needs attention. Let\'s improve together!'}
          </p>
        </div>

        {/* Quick Health Metrics */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Today's Goals
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowFullMetrics(!showFullMetrics)}
            >
              {showFullMetrics ? 'Show Less' : 'View All'}
            </Button>
          </div>
          
          <div className="space-y-3">
            {healthMetrics.slice(0, showFullMetrics ? undefined : 2).map((metric, index) => {
              const Icon = metric.icon;
              const percentage = Math.min((metric.value / metric.target) * 100, 100);
              
              return (
                <div key={index} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{metric.name}</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {metric.value} / {metric.target} {metric.unit}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's Tips - Simplified */}
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Recommendations
          </h3>
          
          <div className="space-y-2">
            {todaysTips.map((tip, index) => {
              const Icon = tip.icon;
              return (
                <div 
                  key={index}
                  className="p-3 border border-border rounded-lg hover:shadow-sm transition-smooth group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-0.5">{tip.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">{tip.description}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="h-8 px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => toast.success(`Starting: ${tip.title}`)}
                    >
                      {tip.action}
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-2">
          <Button 
            onClick={handleGeneratePersonalPlan}
            className="flex-1 h-10"
          >
            <Brain className="h-4 w-4 mr-2" />
            Generate 7-Day Plan
          </Button>
          <Button 
            variant="outline"
            className="h-10 px-4"
            onClick={() => toast.info("Opening progress tracker...")}
          >
            <TrendingUp className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">22</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-lg font-bold text-blue-600">85%</p>
            <p className="text-xs text-muted-foreground">Goals Met</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-purple-600">12</p>
            <p className="text-xs text-muted-foreground">Achievements</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PreventiveAICoach;
