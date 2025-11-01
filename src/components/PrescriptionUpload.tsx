import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Camera, FileText, CheckCircle, Loader2, X, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface PrescriptionUploadProps {
  userId: string;
  onUploadComplete?: () => void;
}

export const PrescriptionUpload = ({ userId, onUploadComplete }: PrescriptionUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `prescription-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setUploadedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            stopCamera();
            toast.success("Photo captured!");
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    setUploading(true);

    try {
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `prescriptions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Will be saved after migration runs
      console.log('Prescription uploaded:', publicUrl, notes);
      
      toast.success("Prescription uploaded successfully!");
      setUploadedFile(null);
      setPreviewUrl(null);
      setNotes("");
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadComplete?.();
    } catch (error) {
      toast.error("Failed to upload prescription");
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card className="shadow-md touch-manipulation">
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <FileText className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <CardTitle className="text-base md:text-lg">Upload Prescription</CardTitle>
            <CardDescription className="text-xs md:text-sm">Upload or capture prescription image</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 space-y-4">
        {isCameraActive ? (
          /* Camera View */
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border-2 border-primary bg-black">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                className="w-full h-auto"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={capturePhoto}
                className="flex-1 h-11"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture Photo
              </Button>
              <Button
                onClick={stopCamera}
                variant="outline"
                className="h-11"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : !previewUrl ? (
          <div className="space-y-3">
            {/* Upload from file */}
            <div className="border-2 border-dashed border-border rounded-lg p-4 md:p-6 text-center hover:border-primary/50 transition-smooth">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="prescription-upload"
              />
              <label htmlFor="prescription-upload" className="cursor-pointer">
                <Image className="h-8 w-8 md:h-10 md:w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs md:text-sm font-medium mb-1">Upload from gallery</p>
                <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
              </label>
            </div>

            {/* Capture with camera */}
            <div 
              className="border-2 border-dashed border-border rounded-lg p-4 md:p-6 text-center hover:border-primary/50 transition-smooth cursor-pointer"
              onClick={startCamera}
            >
              <Camera className="h-8 w-8 md:h-10 md:w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs md:text-sm font-medium mb-1">Capture with camera</p>
              <p className="text-xs text-muted-foreground">Take a photo now</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img src={previewUrl} alt="Prescription preview" className="w-full h-auto" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={clearFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prescription-notes" className="text-xs md:text-sm">Notes (Optional)</Label>
              <Textarea
                id="prescription-notes"
                placeholder="Add any notes about this prescription..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full h-10 md:h-11 touch-manipulation active:scale-95"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Upload Prescription
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrescriptionUpload;
