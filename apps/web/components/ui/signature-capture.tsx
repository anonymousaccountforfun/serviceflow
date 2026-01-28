'use client';

/**
 * Signature Capture Component
 *
 * Canvas-based signature capture for customer sign-off.
 */

import { useState, useRef, useEffect, useCallback, TouchEvent, MouseEvent } from 'react';
import { Eraser, Check, X } from 'lucide-react';

interface SignatureCaptureProps {
  onCapture: (signature: string | null) => void;
  existingSignature?: string | null;
  label?: string;
}

export function SignatureCapture({
  onCapture,
  existingSignature = null,
  label = 'Customer Signature',
}: SignatureCaptureProps) {
  const [hasSignature, setHasSignature] = useState(!!existingSignature);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set up canvas size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(dpr, dpr);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#1f2937';
    context.lineWidth = 2;
    contextRef.current = context;

    // Draw existing signature if any
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = existingSignature;
    }
  }, [existingSignature]);

  // Get coordinates from event
  const getCoordinates = useCallback(
    (event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();

      if ('touches' in event) {
        if (event.touches.length === 0) return null;
        const touch = event.touches[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      } else {
        return {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
      }
    },
    []
  );

  // Start drawing
  const startDrawing = useCallback(
    (event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const coords = getCoordinates(event);
      if (!coords || !contextRef.current) return;

      contextRef.current.beginPath();
      contextRef.current.moveTo(coords.x, coords.y);
      setIsDrawing(true);
      setHasSignature(true);
    },
    [getCoordinates]
  );

  // Draw
  const draw = useCallback(
    (event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      if (!isDrawing) return;

      const coords = getCoordinates(event);
      if (!coords || !contextRef.current) return;

      contextRef.current.lineTo(coords.x, coords.y);
      contextRef.current.stroke();
    },
    [isDrawing, getCoordinates]
  );

  // Stop drawing
  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    contextRef.current?.closePath();
  }, [isDrawing]);

  // Clear signature
  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    onCapture(null);
  }, [onCapture]);

  // Save signature
  const save = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const dataUrl = canvas.toDataURL('image/png');
    onCapture(dataUrl);
  }, [hasSignature, onCapture]);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {/* Signature Canvas */}
      <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full touch-none"
          style={{ height: '160px' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Signature line */}
        <div className="absolute bottom-8 left-4 right-4 border-b border-gray-300" />

        {/* X mark */}
        <div className="absolute bottom-10 left-4 text-gray-400 text-sm font-medium">X</div>

        {/* Placeholder text */}
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-400 text-sm">Sign here</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={clear}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Eraser className="w-4 h-4" />
          Clear
        </button>
        <button
          onClick={save}
          disabled={!hasSignature}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Check className="w-4 h-4" />
          Accept
        </button>
      </div>
    </div>
  );
}

export default SignatureCapture;
