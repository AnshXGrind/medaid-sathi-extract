import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Languages,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface MultiLanguageVoiceProps {
  onTranscript: (text: string, language: string) => void;
  isActive: boolean;
}

// Language codes for speech recognition
const LANGUAGE_CODES = {
  en: { code: 'en-IN', name: 'English', native: 'English' },
  hi: { code: 'hi-IN', name: 'Hindi', native: 'हिंदी' },
  te: { code: 'te-IN', name: 'Telugu', native: 'తెలుగు' },
  kn: { code: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ' },
  ml: { code: 'ml-IN', name: 'Malayalam', native: 'മലയാളം' },
  ta: { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்' },
  gu: { code: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી' },
  pa: { code: 'pa-IN', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' }
};

export const MultiLanguageVoice = ({ onTranscript, isActive }: MultiLanguageVoiceProps) => {
  const [isListening, setIsListening] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [detectedText, setDetectedText] = useState<string>('');
  const [detectedLangKey, setDetectedLangKey] = useState<keyof typeof LANGUAGE_CODES | null>(null);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [isAutoDetecting, setIsAutoDetecting] = useState(true);
  const [currentLangCode, setCurrentLangCode] = useState<string>('en-IN');
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    // Set initial language based on UI language
    const langKey = language as keyof typeof LANGUAGE_CODES;
    if (LANGUAGE_CODES[langKey]) {
      setCurrentLangCode(LANGUAGE_CODES[langKey].code);
    }
  }, [language]);

  const startAutoDetection = async () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast.error("Voice detection not supported. Please use Chrome or Edge browser.");
        return;
      }

      setIsListening(true);
      setIsAutoDetecting(true);
      
      // Try multiple languages sequentially for auto-detection
      const languagesToTry = Object.values(LANGUAGE_CODES);
      let detectionAttempt = 0;

      const tryLanguage = (langConfig: typeof LANGUAGE_CODES[keyof typeof LANGUAGE_CODES]) => {
        const recognition = new SpeechRecognition();
        recognition.lang = langConfig.code;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 3;

        let detectionTimeout: NodeJS.Timeout;

        recognition.onstart = () => {
          console.log(`Trying ${langConfig.name}...`);
          // Give 2 seconds to detect speech in this language
          detectionTimeout = setTimeout(() => {
            recognition.stop();
            detectionAttempt++;
            
            if (detectionAttempt < languagesToTry.length && isAutoDetecting) {
              tryLanguage(languagesToTry[detectionAttempt]);
            } else {
              setIsListening(false);
              setIsAutoDetecting(false);
              toast.error("Could not detect speech. Please try again or select language manually.");
            }
          }, 2000);
        };

        recognition.onresult = (event: any) => {
          clearTimeout(detectionTimeout);
          const result = event.results[0][0];
          const detectedText = result.transcript;
          const confidence = result.confidence;

          console.log(`Detected in ${langConfig.name}: "${detectedText}" (confidence: ${confidence})`);

          if (confidence > 0.5) {
            setDetectedLanguage(langConfig.name);
            setDetectedText(detectedText);
            setTranscript(detectedText);
            setCurrentLangCode(langConfig.code);
            
            // Find the language key for this detected language
            const langKey = Object.keys(LANGUAGE_CODES).find(
              key => LANGUAGE_CODES[key as keyof typeof LANGUAGE_CODES].code === langConfig.code
            ) as keyof typeof LANGUAGE_CODES | undefined;
            
            if (langKey) {
              setDetectedLangKey(langKey);
              // Show dialog to confirm language change
              setShowLanguageDialog(true);
            }

            onTranscript(detectedText, langConfig.code);
            setIsListening(false);
            setIsAutoDetecting(false);
            
            toast.success(`🎤 Detected ${langConfig.native} (${langConfig.name})`);
          } else {
            // Confidence too low, try next language
            detectionAttempt++;
            if (detectionAttempt < languagesToTry.length) {
              tryLanguage(languagesToTry[detectionAttempt]);
            }
          }
        };

        recognition.onerror = (event: any) => {
          clearTimeout(detectionTimeout);
          console.error(`Error with ${langConfig.name}:`, event.error);
          
          if (event.error !== 'no-speech') {
            detectionAttempt++;
            if (detectionAttempt < languagesToTry.length && isAutoDetecting) {
              tryLanguage(languagesToTry[detectionAttempt]);
            }
          }
        };

        recognition.onend = () => {
          clearTimeout(detectionTimeout);
        };

        recognition.start();
      };

      toast.info("🎤 Auto-detecting language... Please speak", {
        duration: 3000
      });
      
      tryLanguage(languagesToTry[0]);

    } catch (error) {
      console.error('Auto-detection error:', error);
      setIsListening(false);
      setIsAutoDetecting(false);
      toast.error("Failed to start voice detection");
    }
  };

  const startListeningInLanguage = async (langCode: string) => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast.error("Voice recognition not supported in your browser.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = langCode;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        const langInfo = Object.values(LANGUAGE_CODES).find(l => l.code === langCode);
        toast.success(`🎤 Listening in ${langInfo?.native || langInfo?.name}...`);
      };

      recognition.onresult = (event: any) => {
        const detectedText = event.results[0][0].transcript;
        setTranscript(detectedText);
        onTranscript(detectedText, langCode);
        
        const langInfo = Object.values(LANGUAGE_CODES).find(l => l.code === langCode);
        toast.success(`Recorded: ${detectedText}`);
        speakResponse("Thank you, I have recorded your message", langCode);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'no-speech') {
          toast.error("No speech detected. Please try again.");
        } else if (event.error === 'not-allowed') {
          toast.error("Microphone access denied. Please enable permissions.");
        } else {
          toast.error("Could not understand. Please try again.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();

    } catch (error) {
      console.error('Voice recognition error:', error);
      setIsListening(false);
      toast.error("Failed to start voice recording");
    }
  };

  const speakResponse = (text: string, langCode: string) => {
    try {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      synth.speak(utterance);
    } catch (error) {
      console.error('Speech synthesis error:', error);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setIsAutoDetecting(false);
    window.speechSynthesis.cancel();
  };

  return (
    <Card className="shadow-md border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isListening ? 'bg-red-100 dark:bg-red-900 animate-pulse' : 'bg-primary/10'}`}>
              {isListening ? (
                <Mic className="h-6 w-6 text-red-600" />
              ) : (
                <Languages className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-base md:text-lg">
                Smart Voice Assistant (स्मार्ट आवाज़)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Speaks & understands all 8 Indian languages
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Display */}
        {detectedLanguage && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-900 dark:text-green-100">
                Language Detected: {detectedLanguage}
              </span>
            </div>
            {transcript && (
              <p className="text-sm text-green-700 dark:text-green-300 bg-white/50 dark:bg-black/20 p-2 rounded">
                "{transcript}"
              </p>
            )}
          </div>
        )}

        {/* Main Control */}
        <div className="flex gap-2">
          {!isListening ? (
            <>
              <Button
                onClick={startAutoDetection}
                className="flex-1 h-12 text-base"
                disabled={!isActive}
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Voice Recording
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => speakResponse("This is MedAid Smart Assistant. I can understand and speak 8 Indian languages.", currentLangCode)}
                disabled={!isActive}
              >
                <Volume2 className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button
              onClick={stopListening}
              variant="destructive"
              className="flex-1 h-12 text-base"
            >
              {isAutoDetecting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Detecting Language...
                </>
              ) : (
                <>
                  <MicOff className="h-5 w-5 mr-2" />
                  Stop Recording
                </>
              )}
            </Button>
          )}
        </div>

        {/* Info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex gap-2 text-xs text-blue-700 dark:text-blue-300">
            <Languages className="h-5 w-5 flex-shrink-0 mt-0.5 text-blue-600" />
            <div className="space-y-1">
              <p><strong>Auto Language Detection:</strong> Just speak naturally</p>
              <p>• Supports 8 Indian languages (हिंदी, தமிழ், తెలుగు, ಕನ್ನಡ, മലയാളം, ગુજરાતી, ਪੰਜਾਬੀ, English)</p>
              <p>• System automatically detects which language you're speaking</p>
              <p>• Perfect for illiterate users - no reading required</p>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Language Change Confirmation Dialog */}
      <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Language Detected
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              We detected you're speaking in <strong>{detectedLanguage}</strong>.
              <br /><br />
              <div className="p-3 bg-muted rounded-md text-sm">
                <strong>Your speech:</strong><br />
                "{detectedText}"
              </div>
              <br />
              Would you like to switch the app interface to {detectedLanguage}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowLanguageDialog(false);
                toast.info("Language kept as is. You can change it from the menu anytime.");
              }}
            >
              Keep Current Language
            </Button>
            <Button
              onClick={() => {
                if (detectedLangKey) {
                  setLanguage(detectedLangKey);
                  toast.success(`✓ Switched to ${detectedLanguage}!`);
                  const langConfig = LANGUAGE_CODES[detectedLangKey];
                  speakResponse(`I understood your ${langConfig.name}`, langConfig.code);
                }
                setShowLanguageDialog(false);
              }}
            >
              Yes, Switch to {detectedLanguage}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default MultiLanguageVoice;
