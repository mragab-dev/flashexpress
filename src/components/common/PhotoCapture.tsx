import React, { useRef, useState, useCallback } from 'react';
import { CameraIcon, XIcon } from '../Icons';

interface PhotoCaptureProps {
    onSave: (photo: string) => void;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onSave }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isStreamActive, setIsStreamActive] = useState(false);
    const [capturedPhoto, setCapturedPhoto] = useState<string>('');
    const [error, setError] = useState<string>('');

    const startCamera = useCallback(async () => {
        try {
            setError('');
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } // Use back camera on mobile
            });
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setStream(mediaStream);
                setIsStreamActive(true);
            }
        } catch (err) {
            setError('Failed to access camera. Please allow camera permissions or upload a photo instead.');
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsStreamActive(false);
        }
    }, [stream]);

    const capturePhoto = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            if (context) {
                context.drawImage(video, 0, 0);
                const photoDataURL = canvas.toDataURL('image/jpeg', 0.8);
                setCapturedPhoto(photoDataURL);
                stopCamera();
            }
        }
    }, [stopCamera]);

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setCapturedPhoto(result);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const retakePhoto = useCallback(() => {
        setCapturedPhoto('');
        startCamera();
    }, [startCamera]);

    const savePhoto = useCallback(() => {
        if (capturedPhoto) {
            onSave(capturedPhoto);
        }
    }, [capturedPhoto, onSave]);

    return (
        <div className="space-y-4">
            {!capturedPhoto ? (
                <>
                    {/* Camera View */}
                    {isStreamActive ? (
                        <div className="relative">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full max-w-md mx-auto rounded-lg bg-black"
                            />
                            <div className="flex justify-center gap-3 mt-4">
                                <button
                                    onClick={capturePhoto}
                                    className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
                                >
                                    <CameraIcon className="w-5 h-5"/>
                                    Capture Photo
                                </button>
                                <button
                                    onClick={stopCamera}
                                    className="px-4 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition"
                                >
                                    <XIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <button
                                    onClick={startCamera}
                                    className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition flex items-center gap-2 justify-center"
                                >
                                    <CameraIcon className="w-5 h-5"/>
                                    Take Photo
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 transition"
                                >
                                    Upload Photo
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </div>
                    )}
                </>
            ) : (
                <>
                    {/* Photo Preview */}
                    <div className="text-center space-y-4">
                        <img
                            src={capturedPhoto}
                            alt="Captured delivery proof"
                            className="max-w-md mx-auto rounded-lg border border-slate-200"
                        />
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={savePhoto}
                                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                            >
                                Save Photo
                            </button>
                            <button
                                onClick={retakePhoto}
                                className="px-6 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition"
                            >
                                Retake Photo
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Hidden canvas for photo capture */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};