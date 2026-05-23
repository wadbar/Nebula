import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  mediaElement: HTMLMediaElement | null;
  isActive: boolean;
}

// Track connected elements globally to avoid "MediaElementAudioSourceNode has already been created for this element" error
const connectedSources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
let sharedAudioContext: AudioContext | null = null;

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ mediaElement, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!mediaElement || !isActive || !canvasRef.current) return;

    // Initialize Shared Audio Context
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume();
    }

    // Initialize or get source and analyser
    try {
      let source = connectedSources.get(mediaElement);
      
      if (!source) {
        source = sharedAudioContext.createMediaElementSource(mediaElement);
        connectedSources.set(mediaElement, source);
      }

      const analyser = sharedAudioContext.createAnalyser();
      source.connect(analyser);
      analyser.connect(sharedAudioContext.destination);
      
      analyser.fftSize = 256;
      analyserRef.current = analyser;
    } catch (e) {
      console.warn("Audio Visualizer node connection issue:", e);
      // If analyser already exists in ref from previous run, we might be fine
    }

    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient color based on height/frequency
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)'); 
        gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.7)'); 
        gradient.addColorStop(1, 'rgba(6, 182, 212, 1)'); 

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect();
        } catch (e) {}
      }
    };
  }, [mediaElement, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-16 opacity-30 pointer-events-none group-hover:opacity-60 transition-opacity"
      width={300}
      height={64}
    />
  );
};

export default AudioVisualizer;
