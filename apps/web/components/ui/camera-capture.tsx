'use client';

/**
 * Camera Capture Component
 *
 * Allows users to take photos using their device camera.
 * Supports both front and rear cameras.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  X,
  RotateCcw,
  Check,
  Trash2,
  SwitchCamera,
  Image as ImageIcon,
} from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (photos: string[]) => void;
  maxPhotos?: number;
  existingPhotos?: string[];
}

export function CameraCapture({
  onCapture,
  maxPhotos = 5,
  existingPhotos = [],
}: CameraCaptureProps) {
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [isCapturing, setIsCapturing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setError(null);
    setIsCapturing(true);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera. Please check permissions.');
      setIsCapturing(false);
    }
  }, [facingMode]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setPreview(null);
  }, []);

  // Switch camera
  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, [stopCamera]);

  // Restart camera with new facing mode
  useEffect(() => {
    if (isCapturing) {
      startCamera();
    }
  }, [facingMode, isCapturing, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPreview(dataUrl);
  }, []);

  // Accept captured photo
  const acceptPhoto = useCallback(() => {
    if (preview) {
      const newPhotos = [...photos, preview];
      setPhotos(newPhotos);
      onCapture(newPhotos);
      setPreview(null);

      if (newPhotos.length >= maxPhotos) {
        stopCamera();
      }
    }
  }, [preview, photos, onCapture, maxPhotos, stopCamera]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setPreview(null);
  }, []);

  // Delete photo
  const deletePhoto = useCallback(
    (index: number) => {
      const newPhotos = photos.filter((_, i) => i !== index);
      setPhotos(newPhotos);
      onCapture(newPhotos);
    },
    [photos, onCapture]
  );

  // Handle file input for gallery selection
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      const remainingSlots = maxPhotos - photos.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      filesToProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setPhotos((prev) => {
            const newPhotos = [...prev, dataUrl];
            onCapture(newPhotos);
            return newPhotos;
          });
        };
        reader.readAsDataURL(file);
      });

      event.target.value = '';
    },
    [photos.length, maxPhotos, onCapture]
  );

  return (
    <div className="space-y-4">
      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => deletePhoto(index)}
                className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Camera View */}
      {isCapturing && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Video/Preview */}
          <div className="relative h-full">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                autoPlay
                muted
              />
            )}

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-6">
              {preview ? (
                <>
                  <button
                    onClick={retakePhoto}
                    className="p-4 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                  >
                    <RotateCcw className="w-6 h-6" />
                  </button>
                  <button
                    onClick={acceptPhoto}
                    className="p-4 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
                  >
                    <Check className="w-8 h-8" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={switchCamera}
                    className="p-4 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                  >
                    <SwitchCamera className="w-6 h-6" />
                  </button>
                  <button
                    onClick={capturePhoto}
                    className="p-5 rounded-full bg-white text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <Camera className="w-8 h-8" />
                  </button>
                  <button
                    onClick={stopCamera}
                    className="p-4 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Photo count */}
            <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
              {photos.length + (preview ? 1 : 0)} / {maxPhotos}
            </div>
          </div>
        </div>
      )}

      {/* Add Photo Buttons */}
      {photos.length < maxPhotos && !isCapturing && (
        <div className="flex gap-2">
          <button
            onClick={startCamera}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Camera className="w-5 h-5" />
            Take Photo
          </button>
          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors">
            <ImageIcon className="w-5 h-5" />
            Gallery
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

export default CameraCapture;
