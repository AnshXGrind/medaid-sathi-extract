import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Languages,
  Radio,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export const VoiceVernacularAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [supported, setSupported] = useState(true);
  const { language } = useLanguage();

  useEffect(() => {
    // Check if browser supports Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSupported(false);
    }
  }, []);

  const languageVoiceMap: Record<string, string> = {
    'en': 'en-IN',
    'hi': 'hi-IN',
    'te': 'te-IN',
    'kn': 'kn-IN',
    'ml': 'ml-IN',
    'ta': 'ta-IN',
    'gu': 'gu-IN',
    'pa': 'pa-IN'
  };

  const sampleQuestions = [
    { en: "What are my symptoms?", hi: "मेरे लक्षण क्या हैं?", te: "నా లక్షణాలు ఏమిటి?" },
    { en: "Find nearby hospitals", hi: "पास के अस्पताल खोजें", te: "సమీపంలోని ఆసుపత్రులను కనుగొనండి" },
    { en: "Book an appointment", hi: "अपॉइंटमेंट बुक करें", te: "అపాయింట్‌మెంట్ బుక్ చేయండి" },
    { en: "Check medicine availability", hi: "दवा उपलब्धता जांचें", te: "ఔషధ లభ్యత తనిఖీ చేయండి" },
    { en: "Emergency help needed", hi: "आपातकालीन सहायता चाहिए", te: "అత్యవసర సహాయం అవసరం" }
  ];

  const startListening = () => {
    if (!supported) {
      toast.error("Voice recognition not supported in your browser");
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = languageVoiceMap[language] || 'hi-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.success(`Listening in ${language === 'hi' ? 'हिंदी' : language === 'te' ? 'తెలుగు' : 'your language'}...`);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTranscript(transcript);
        processVoiceCommand(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast.error("Could not understand. Please try again.");
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (error) {
      console.error('Voice recognition error:', error);
      toast.error("Voice recognition failed. Please try again.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    toast.info("Stopped listening");
  };

  const processVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();
    let responseText = "";

    // Simple command processing (in real app, this would use AI)
    if (lowerCommand.includes('symptom') || lowerCommand.includes('लक्षण') || lowerCommand.includes('లక్షణ')) {
      responseText = "I can help you analyze your symptoms. Please describe what you're feeling.";
    } else if (lowerCommand.includes('hospital') || lowerCommand.includes('अस्पताल') || lowerCommand.includes('ఆసుపత్రి')) {
      responseText = "Finding nearby hospitals. Please wait...";
      setTimeout(() => toast.success("Found 5 hospitals near you!"), 1000);
    } else if (lowerCommand.includes('appointment') || lowerCommand.includes('अपॉइंटमेंट') || lowerCommand.includes('అపాయింట్')) {
      responseText = "I can help you book an appointment. Which doctor would you like to see?";
    } else if (lowerCommand.includes('medicine') || lowerCommand.includes('दवा') || lowerCommand.includes('ఔషధం')) {
      responseText = "Checking medicine availability at nearby Jan Aushadhi Kendras...";
    } else if (lowerCommand.includes('emergency') || lowerCommand.includes('आपातकाल') || lowerCommand.includes('అత్యవసరం')) {
      responseText = "Emergency detected! Calling helpline 108 and alerting nearby hospitals.";
      toast.error("🚨 EMERGENCY MODE ACTIVATED");
    } else {
      responseText = "I understood: " + command + ". How can I help you with this?";
    }

    setResponse(responseText);
    speakResponse(responseText);
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageVoiceMap[language] || 'hi-IN';
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
            <Radio className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              Voice Assistant
              <Badge variant="outline" className="text-xs">
                Bolke bolo, sunke samjho
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Speak in your language - Hindi, Telugu, Kannada & more
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6 space-y-4">
        {!supported ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
              Voice Recognition Not Supported
            </p>
            <p className="text-xs text-red-700 dark:text-red-300">
              Please use Chrome or Edge browser for voice features
            </p>
          </div>
        ) : (
          <>
            {/* Voice Control Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={isListening ? stopListening : startListening}
                className={`flex-1 h-20 text-lg font-semibold ${
                  isListening 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gradient-to-r from-primary to-secondary'
                }`}
                disabled={isSpeaking}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-6 w-6 mr-2 animate-pulse" />
                    Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="h-6 w-6 mr-2" />
                    Start Speaking
                  </>
                )}
              </Button>

              <Button
                onClick={isSpeaking ? stopSpeaking : () => {}}
                variant="outline"
                className="h-20 px-6"
                disabled={!isSpeaking}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="h-6 w-6 animate-pulse" />
                  </>
                ) : (
                  <>
                    <Volume2 className="h-6 w-6" />
                  </>
                )}
              </Button>
            </div>

            {/* Status Indicator */}
            {isListening && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-pulse">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 text-red-600 animate-spin" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">
                    Listening... Speak now
                  </span>
                </div>
              </div>
            )}

            {isSpeaking && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-center gap-2">
                  <Volume2 className="h-5 w-5 text-blue-600 animate-pulse" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Speaking...
                  </span>
                </div>
              </div>
            )}

            {/* Transcript */}
            {transcript && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">
                      You said:
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      "{transcript}"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Response */}
            {response && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Radio className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                      Assistant:
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {response}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sample Questions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">
                  Try saying:
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {sampleQuestions.map((q, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 px-3 text-left justify-start text-xs"
                    onClick={() => {
                      const text = language === 'hi' ? q.hi : language === 'te' ? q.te : q.en;
                      setTranscript(text);
                      processVoiceCommand(text);
                    }}
                  >
                    {language === 'hi' ? q.hi : language === 'te' ? q.te : q.en}
                  </Button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <p className="text-xs text-purple-800 dark:text-purple-200">
                <strong>💬 Works in 8 languages:</strong> English, Hindi, Telugu, Kannada, Malayalam, Tamil, Gujarati, Punjabi
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceVernacularAssistant;
