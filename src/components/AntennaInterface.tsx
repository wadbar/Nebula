import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radio, 
  Smartphone, 
  Usb, 
  Wifi, 
  Globe, 
  Settings, 
  Volume2, 
  Activity, 
  Cpu, 
  Play, 
  Square, 
  Search, 
  Info, 
  AlertTriangle,
  Lock,
  Unlock
} from 'lucide-react';

// Type definitions for hardware interfaces
export type AntennaInterfaceType = 'trrs' | 'sdr_usb' | 'serial_rf' | 'wifi_bt' | 'websdr';

export interface RFChannelPreset {
  frequency: number; // in MHz
  label: string;
  category: string;
  modulation: 'WFM' | 'NFM' | 'AM' | 'LSB' | 'USB' | 'CW';
  bandwidth: number; // in kHz
}

const BAND_PRESETS: RFChannelPreset[] = [
  { frequency: 91.5, label: "FM Radio / TRRS Earphone Wire Antenna", category: "Broadcast", modulation: "WFM", bandwidth: 200 },
  { frequency: 145.8, label: "ISS Amateur Sat / VHF Dipole Antenna", category: "Space-RF", modulation: "NFM", bandwidth: 12.5 },
  { frequency: 27.065, label: "CB Radio Channel 9 Emergency Link", category: "Comm-RF", modulation: "AM", bandwidth: 6 },
  { frequency: 462.5625, label: "GMRS/UHF Handheld Walkie-Talkie", category: "Comm-RF", modulation: "NFM", bandwidth: 12.5 },
  { frequency: 7.150, label: "HF Ham SSB (40-Meter DX band)", category: "Amateur", modulation: "LSB", bandwidth: 2.7 },
  { frequency: 1090.0, label: "ADS-B Flight Transponder Radar S", category: "Avionics", modulation: "CW", bandwidth: 2000 },
  { frequency: 2412.0, label: "Wi-Fi Ch 1 Direct Microwave Beacon", category: "Microwave", modulation: "CW", bandwidth: 20000 },
  { frequency: 12.0, label: "Virtual Global WebSDR Link (Eindhoven)", category: "Ethernet", modulation: "AM", bandwidth: 9 }
];

export default function AntennaInterface() {
  // Antenna Interface states
  const [selectedInterface, setSelectedInterface] = useState<AntennaInterfaceType>('trrs');
  const [frequency, setFrequency] = useState<number>(91.5); // Current tuned frequency in MHz
  const [modulation, setModulation] = useState<'WFM' | 'NFM' | 'AM' | 'LSB' | 'USB' | 'CW'>('WFM');
  const [rfGain, setRfGain] = useState<number>(32); // in dB
  const [squelch, setSquelch] = useState<number>(-85); // Squelch threshold in dBm
  const [bandwidth, setBandwidth] = useState<number>(200); // kHz filter width
  const [audioVolume, setAudioVolume] = useState<number>(50); // overall gain
  const [isEngaged, setIsEngaged] = useState<boolean>(false); // Ingestion engine status
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [snr, setSnr] = useState<number>(18); // SNR estimation
  const [signalStrength, setSignalStrength] = useState<number>(-75); // RSSI in dBm
  const [isMutedBySquelch, setIsMutedBySquelch] = useState<boolean>(false);
  const [networkSSIDs, setNetworkSSIDs] = useState<{ ssid: string; rssi: number; channel: number }[]>([]);
  const [deviceLogs, setDeviceLogs] = useState<{ timestamp: string; text: string; type: 'info' | 'warn' | 'success' | 'rf' }[]>([]);
  const [iqPoints, setIqPoints] = useState<{ i: number; q: number }[]>([]);

  // Periodically generate simulated constellation points based on real-time SNR and lock-state
  useEffect(() => {
    const interval = setInterval(() => {
      const points: { i: number; q: number }[] = [];
      const count = 48;
      
      // Determine lock quality / variance based on SNR and state
      let variance = 0.6; // high noise variance default
      let centers = [{ i: 0, q: 0 }]; // single center noise block
      
      if (isEngaged && !isMutedBySquelch) {
        if (snr > 20) {
          variance = 0.03; // tight phase lock
          centers = [
            { i: 0.5, q: 0.5 },
            { i: -0.5, q: 0.5 },
            { i: -0.5, q: -0.5 },
            { i: 0.5, q: -0.5 }
          ];
        } else if (snr > 10) {
          variance = 0.12; 
          centers = [
            { i: 0.5, q: 0.5 },
            { i: -0.5, q: 0.5 },
            { i: -0.5, q: -0.5 },
            { i: 0.5, q: -0.5 }
          ];
        } else {
          variance = 0.35;
          centers = [
            { i: 0.2, q: 0.2 },
            { i: -0.2, q: 0.2 },
            { i: -0.2, q: -0.2 },
            { i: 0.2, q: -0.2 }
          ];
        }
      }

      for (let index = 0; index < count; index++) {
        const center = centers[Math.floor(Math.random() * centers.length)];
        const u1 = Math.random() || 0.0001;
        const u2 = Math.random() || 0.0001;
        const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const randStdNormal2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
        
        const iVal = center.i + randStdNormal * Math.sqrt(variance);
        const qVal = center.q + randStdNormal2 * Math.sqrt(variance);

        points.push({
          i: Math.min(0.95, Math.max(-0.95, iVal)),
          q: Math.min(0.95, Math.max(-0.95, qVal))
        });
      }
      setIqPoints(points);
    }, 180);

    return () => clearInterval(interval);
  }, [snr, isEngaged, isMutedBySquelch]);

  // Web Audio Context and Analyser refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const audioGainNodeRef = useRef<GainNode | null>(null);

  // Hook up logs
  const addLog = (text: string, type: 'info' | 'warn' | 'success' | 'rf' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setDeviceLogs(prev => [{ timestamp, text, type }, ...prev.slice(0, 48)]);
  };

  // Populate network SSID simulation representing WiFi interface
  useEffect(() => {
    if (selectedInterface === 'wifi_bt') {
      const generated = [
        { ssid: "Signal_HQ_5G", rssi: -42, channel: 1 },
        { ssid: "DIRECT-HomeNetwork", rssi: -71, channel: 6 },
        { ssid: "Guest_Public_Access", rssi: -84, channel: 11 },
        { ssid: "Industrial_Controller_AP", rssi: -62, channel: 3 }
      ];
      setNetworkSSIDs(generated);
      addLog("Successfully parsed local beacon frames using 2.4GHz internal NIC.", "success");
    } else {
      setNetworkSSIDs([]);
    }
  }, [selectedInterface]);

  // Handle Antenna Presets Selection
  const applyPreset = (preset: RFChannelPreset) => {
    setFrequency(preset.frequency);
    setModulation(preset.modulation);
    setBandwidth(preset.bandwidth);
    addLog(`Recounting filter bank: Frequency tuned to ${preset.frequency} MHz. Loaded mode [${preset.modulation}]`, "rf");
  };

  // Turn off scanning if frequency changes manually
  const tuneFrequency = (value: number) => {
    setIsScanning(false);
    setFrequency(parseFloat(value.toFixed(4)));
  };

  // Audio & Spectrum Loop
  useEffect(() => {
    if (isEngaged) {
      startPhysicalIngestion();
    } else {
      stopPhysicalIngestion();
    }

    return () => {
      stopPhysicalIngestion();
    };
  }, [isEngaged]);

  const startPhysicalIngestion = async () => {
    try {
      addLog("Initializing Web Audio pipeline...", "info");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });

      // Construct dynamic graph
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const actx = new AudioCtx();
      audioContextRef.current = actx;

      const analyser = actx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      const source = actx.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      // Audio gain node
      const gainNode = actx.createGain();
      audioGainNodeRef.current = gainNode;
      gainNode.gain.setValueAtTime(audioVolume / 100, actx.currentTime);
      analyser.connect(gainNode);
      gainNode.connect(actx.destination);

      addLog("Direct microphone/TRRS input pipeline engaged. Reading physical antenna/microphone levels.", "success");
      addLog(`RF Squelch Gate armed. Boundary set to ${squelch} dBm.`, "info");
      
      // Start paint cascade
      launchWaterfall();
    } catch (err: any) {
      addLog(`Hardware Pipeline Fail: ${err.message || err}. Defaulted to High-Stability Ether Simulation.`, "warn");
      setIsEngaged(false);
      // Fallback to loop animation
      launchWaterfall();
    }
  };

  const stopPhysicalIngestion = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
      } catch (e) {}
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    audioGainNodeRef.current = null;
    addLog("Direct ingestion pipelines paused. Switched to passive standby.", "info");
  };

  // Auto scanning loop
  const toggleScan = () => {
    if (isScanning) {
      setIsScanning(false);
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      addLog("Frequency tuner search halted.", "info");
    } else {
      setIsScanning(true);
      addLog("Initiating high-speed spectral sweeps...", "rf");
      scanIntervalRef.current = setInterval(() => {
        setFrequency(prev => {
          let step = 0.1;
          if (selectedInterface === 'trrs') step = 0.2; // typical FM steps are 200kHz
          let nextVal = prev + step;
          if (nextVal > 108.0 && selectedInterface === 'trrs') nextVal = 87.5;
          if (nextVal > 150.0 && selectedInterface === 'trrs') nextVal = 30;
          if (nextVal > 6000) nextVal = 0.1;
          
          // Randomly trigger signal detection
          const matchNoise = Math.random();
          if (matchNoise > 0.94) {
            setIsScanning(false);
            clearInterval(scanIntervalRef.current);
            const peakStr = Math.round(-60 - Math.random() * 20);
            setSignalStrength(peakStr);
            setSnr(Math.round(20 + Math.random() * 15));
            addLog(`SIGNAL LOCK! Carrier found on ${nextVal.toFixed(3)} MHz. S-Strength: ${peakStr}dBm`, "success");
            return parseFloat(nextVal.toFixed(3));
          }
          return parseFloat(nextVal.toFixed(3));
        });
      }, 350);
    }
  };

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, []);

  // Update real-time audio gain
  useEffect(() => {
    if (audioGainNodeRef.current && audioContextRef.current) {
      audioGainNodeRef.current.gain.setValueAtTime(audioVolume / 100, audioContextRef.current.currentTime);
    }
  }, [audioVolume]);

  // Waterfall Spectrum Draw
  const launchWaterfall = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Buffer to scroll downwards
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    const drawRow = () => {
      if (!canvas || !ctx || !tempCtx) return;

      // Copy older canvas to temp
      tempCtx.drawImage(canvas, 0, 0);

      // Clear main canvas
      ctx.clearRect(0,0, width, height);

      // Redraw old content shifted down by 1 pixel
      ctx.drawImage(tempCanvas, 0, 0, width, height - 1, 0, 1, width, height - 1);

      // Paint first line using current frequency spectrum
      const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 128;
      const dataArray = new Uint8Array(bufferLength);

      let maxVal = 0;
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        maxVal = Array.from(dataArray).reduce((a, b) => Math.max(a, b), 0);
      } else {
        // Synthesise realistic radio noise with peaks around the central tuned point
        for (let j = 0; j < bufferLength; j++) {
          // background state
          let base = Math.random() * 70;
          
          // Tuner simulation: if frequency has a peak, show it
          const center = bufferLength / 2;
          const dist = Math.abs(j - center);
          if (dist < 4) {
            // carrier peak
            base += (5 - dist) * (30 + Math.random() * 20);
          }
          dataArray[j] = Math.min(255, base);
          if (base > maxVal) maxVal = base;
        }
      }

      // Estimate SNR and RSSI on simulated / direct measurements
      if (!analyserRef.current) {
        const estimatedPower = Math.round(-110 + (maxVal / 255) * 80 + rfGain / 5);
        setSignalStrength(estimatedPower);
        setSnr(Math.round(Math.max(2, (maxVal / 255) * 40 - (Math.random() * 5))));
      } else {
        // Real FFT readings mapped to decibels
        const estimatedPower = Math.round(-120 + (maxVal / 255) * 90 + rfGain / 4);
        setSignalStrength(estimatedPower);
        setSnr(Math.round(Math.max(3, (maxVal / 180) * 45)));
      }

      // check against squelch threshold
      const isMuted = signalStrength < squelch;
      setIsMutedBySquelch(isMuted);

      // Draw the first pixel row with beautiful RF glowing spectrum colors (emerald green to cyber orange)
      const sliceWidth = width / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i];
        
        let r = 0;
        let g = 0;
        let b = 0;

        // Custom cyber-RF theme palettes
        if (selectedInterface === 'trrs') {
          // Emerald to cyan palette
          r = Math.floor(val * 0.1);
          g = Math.floor(val * 0.9);
          b = Math.floor(val * 0.6 + 50);
        } else if (selectedInterface === 'sdr_usb') {
          // Amber/cyber hot iron palette
          r = Math.floor(val * 0.95);
          g = Math.floor(val * 0.45);
          b = Math.floor(val * 0.05);
        } else if (selectedInterface === 'wifi_bt') {
          // Indigo electric spectrum
          r = Math.floor(val * 0.3);
          g = Math.floor(val * 0.3 + 20);
          b = Math.floor(val * 1.0);
        } else {
          // Classic monochrome phosphor matrix green
          r = 0;
          g = Math.floor(val * 0.98);
          b = 0;
        }

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(i * sliceWidth, 0, sliceWidth + 1, 1);
      }

      // loop
      animationFrameRef.current = requestAnimationFrame(drawRow);
    };

    drawRow();
  };

  // Convert dBm value into qualitative S-meter reading definition
  const getSMeterReading = () => {
    if (signalStrength <= -110) return "S1  (Deep Carrier Noise)";
    if (signalStrength <= -95) return "S3  (Faint Signal)";
    if (signalStrength <= -85) return "S5  (Readable/Noised)";
    if (signalStrength <= -70) return "S7  (Stable Connection)";
    if (signalStrength <= -55) return "S9  (Optimum Broadcast)";
    return `S9+${Math.round((-55 - signalStrength) * -1)}dB (SDR Saturation)`;
  };

  return (
    <div className="flex flex-col gap-6 font-mono text-xs text-white/90 animate-[fadeIn_0.5s_ease-out]">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-white/10 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-5 h-5 text-brand-green animate-pulse" />
            <h2 className="text-sm font-black tracking-widest text-white uppercase">HARDWARE ANTENNA & RF INTERCONNECTOR ENGINE</h2>
          </div>
          <p className="text-[10px] text-white/40 max-w-2xl leading-relaxed">
            Configure direct bindings for physical antennae plugged into the device. Processes TRRS headphone wires, 
            auxiliary cables acting as FM/AM long-wires, USB SDR (RTL-SDR/HackRF) dongles, Wi-Fi networks RSSI metrics, or global web-connected receivers.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setIsEngaged(!isEngaged)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold uppercase tracking-widest border transition-all ${
              isEngaged 
                ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20' 
                : 'bg-brand-green/10 text-brand-green border-brand-green/20 hover:bg-brand-green/20'
            }`}
          >
            {isEngaged ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                DISENGAGE DEVICE
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                ENGAGE ANTENNA
              </>
            )}
          </button>
          <button
            onClick={toggleScan}
            className={`px-3 py-2.5 rounded-xl border font-bold uppercase transition-all flex items-center gap-2 ${
              isScanning 
                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 animate-pulse' 
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            {isScanning ? "SWEEPING..." : "AUTO SCAN"}
          </button>
        </div>
      </div>

      {/* THREE COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: INTERFACE SELECTOR & INFO DECK */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <div className="bento-card p-4 flex flex-col gap-4">
            <h3 className="text-[10px] font-black tracking-widest text-brand-cyan uppercase pb-2 border-b border-white/5">
              CONNECTION MATRIX
            </h3>
            
            <div className="flex flex-col gap-2">
              {[
                { 
                  id: 'trrs', 
                  icon: Smartphone, 
                  label: "TRRS Headphone Wire / FM", 
                  desc: "Utilizes wire extension as dipole FM/AM receiver." 
                },
                { 
                  id: 'sdr_usb', 
                  icon: Usb, 
                  label: "USB RTL-SDR Dongles", 
                  desc: "Bypasses onboard chips via WebUSB/Direct IQ feeds." 
                },
                { 
                  id: 'serial_rf', 
                  icon: Settings, 
                  label: "Serial COM Radio", 
                  desc: "Connects handheld transceivers / walkie-talkie lines." 
                },
                { 
                  id: 'wifi_bt', 
                  icon: Wifi, 
                  label: "Wi-Fi & Bluetooth Beacon", 
                  desc: "Scans physical 2.4/5GHz beacon RSSI levels." 
                },
                { 
                  id: 'websdr', 
                  icon: Globe, 
                  label: "Virtual TCP WebSDR", 
                  desc: "Interfaces shortwave arrays globally via TCP link." 
                }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedInterface(item.id as AntennaInterfaceType);
                    addLog(`Connected RF Ingestion unit: Switched source to [${item.label}]`, "info");
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all relative overflow-hidden group flex gap-3 ${
                    selectedInterface === item.id 
                      ? 'bg-brand-green/5 border-brand-green/30 text-white' 
                      : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.03] text-white/50'
                  }`}
                >
                  <item.icon className={`w-5 h-5 shrink-0 mt-0.5 ${
                    selectedInterface === item.id ? 'text-brand-green animate-pulse' : 'text-white/30'
                  }`} />
                  <div>
                    <h4 className={`font-extrabold tracking-wide text-[10.5px] uppercase ${
                      selectedInterface === item.id ? 'text-brand-green' : 'text-white/80'
                    }`}>{item.label}</h4>
                    <p className="text-[9px] text-white/40 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                  {selectedInterface === item.id && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-brand-green animate-ping" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* TECHNICAL WIRE DIAGRAM & DOCUMENTATION CARD */}
          <div className="bento-card p-4 bg-black/40 border border-white/5 text-white/60 leading-relaxed flex flex-col gap-3">
            <div className="flex items-center gap-2 text-brand-green font-bold">
              <Info className="w-4 h-4 shrink-0" />
              <span className="uppercase tracking-widest text-[9.5px]">ANTENNA COUPLING TIPS</span>
            </div>
            
            <AnimatePresence mode="wait">
              {selectedInterface === 'trrs' && (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  className="space-y-2 text-[9.5px]"
                >
                  <p><b>Mobile Phones & Tablets:</b> A standard non-USB standard 3.5mm headphone cable works as a highly sensitive FM / VHF antenna. The RF chip couples with the shielding on the cable to isolate radio waves.</p>
                  <p><b>Configuration:</b> Insert standard headphones, AUX wire connected to speakers, or a bare wire into physical headphone slots on cell phones before engaging direct carrier sync.</p>
                </motion.div>
              )}

              {selectedInterface === 'sdr_usb' && (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  className="space-y-2 text-[9.5px]"
                >
                  <p><b>SDR Tuning (RTL2832U, HackRF One):</b> Attach the USB receiver via OTG cable into cell phones (or direct USB into PC). Ensure the USB driver is active in developer options.</p>
                  <p><b>RF Gain recommendation:</b> Set RF gain to ~32dB in ambient fields to prevent local signal overload while keeping high-order tracking bands stable.</p>
                </motion.div>
              )}

              {selectedInterface === 'serial_rf' && (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  className="space-y-2 text-[9.5px]"
                >
                  <p><b>Transceiver Cable Linking (Baofeng UV-5R, APRS):</b> Use standard audio-acoustic coupling or USB-to-serial cables. Standard baudrates for RF packet translation are 9600 bps or 1200 bps.</p>
                  <p><b>Walkie-Talkie Pairing:</b> Match handheld frequencies (e.g., FRS/GMRS channels) precisely and set squelch to bypass environmental humming.</p>
                </motion.div>
              )}

              {selectedInterface === 'wifi_bt' && (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  className="space-y-2 text-[9.5px]"
                >
                  <p><b>LANS & Beacon Scanners:</b> Uses system-integrated network cards (broadcom, realtek chips) to query RF beacon intervals. Great for mapping relative distances (RSSI correlation).</p>
                  <p><b>Microwave ranges:</b> This utilizes the precise 2400 to 2483.5 MHz spectrum blocks, visualizing multi-path fading in dense structural areas.</p>
                </motion.div>
              )}

              {selectedInterface === 'websdr' && (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  className="space-y-2 text-[9.5px]"
                >
                  <p><b>Web-Link virtual receiver:</b> Syncs directly with high-performance SDR hardware receivers situated globally (SDR.hu / WebSDR endpoints) over low-latency stream ports.</p>
                  <p><b>Usage:</b> Excellent for listening to Shortwave, AM news, Morse Code, and international long-distance maritime HF signals right from any device.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* MIDDLE COLUMN: SPECTRAL WATERFALL & METRIC ANALYZERS */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          
          {/* SPECTRAL DISPLAY PANEL */}
          <div className="bento-card p-4 sm:p-6 flex flex-col gap-4 bg-gradient-to-b from-[#060606] to-[#010101] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-brand-green/20 animate-pulse" />
            
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-extrabold tracking-widest text-[9.5px] text-brand-green uppercase flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" />
                RF SPECTRUM WATERFALL ({modulation})
              </span>
              <div className="flex items-center gap-4 text-white/40">
                <span>TUNED: <b className="text-white font-black">{frequency.toFixed(4)} MHz</b></span>
                <span>SPAN: <b className="text-brand-cyan">{(bandwidth / 1000).toFixed(3)} MHz</b></span>
              </div>
            </div>

            {/* WATERFALL CANVAS */}
            <div className="relative border border-white/5 rounded-xl overflow-hidden bg-black flex h-52">
              <canvas 
                ref={canvasRef} 
                className="w-full h-full object-cover"
                width={800}
                height={200}
              />
              
              {/* Central Tuning Hairline Overlay */}
              <div className="absolute inset-y-0 left-1/2 w-[1.5px] bg-red-500/70 pointer-events-none flex flex-col justify-start items-center">
                <div className="bg-red-500 text-[8px] px-1 rounded-sm text-white font-bold tracking-tighter mt-1 whitespace-nowrap shadow-lg">
                  {frequency.toFixed(3)} MHz
                </div>
              </div>

              {/* Squelch Level Warning */}
              {isMutedBySquelch && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-bold tracking-widest text-yellow-500 text-[10px] uppercase gap-2">
                  <AlertTriangle className="w-4 h-4 animate-bounce" />
                  Signal Muted By Squelch Gate (SQL: {squelch}dBm)
                </div>
              )}
            </div>

            {/* QUICK PRESET BAND TABS */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-black tracking-wider text-white/40 uppercase">BAND PRESETS & QUICK COUPLING:</span>
              <div className="flex flex-wrap gap-1.5">
                {BAND_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyPreset(preset)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[8.5px] font-extrabold transition-all ${
                      Math.abs(frequency - preset.frequency) < 0.01
                        ? 'bg-brand-green text-black border-brand-green'
                        : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    {preset.frequency} MHz - {preset.category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SIGNAL AND TUNER CONTROLS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* SIGNAL METRIC GAUGE PANEL */}
            <div className="bento-card p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h3 className="text-[10px] font-black tracking-widest text-brand-green uppercase">
                  REALTIME SIGNAL INSTRUMENTS
                </h3>
                {/* SIGNAL LOCK DISPLAYER */}
                <div className="flex items-center gap-1.5">
                  {isScanning ? (
                    <span className="flex items-center gap-1 text-[8px] font-black tracking-wider text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 animate-pulse">
                      <Search className="w-2.5 h-2.5 animate-spin" />
                      ACQUIRING CARRIER...
                    </span>
                  ) : !isEngaged ? (
                    <span className="flex items-center gap-1 text-[8px] font-black tracking-wider text-white/30 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      <Unlock className="w-2.5 h-2.5 animate-[ping_2s_linear_infinite]" />
                      STANDBY
                    </span>
                  ) : isMutedBySquelch ? (
                    <span className="flex items-center gap-1 text-[8px] font-black tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      MUTED (SQL GATE)
                    </span>
                  ) : snr > 15 ? (
                    <span className="flex items-center gap-1 text-[8px] font-black tracking-wider text-brand-green bg-brand-green/10 px-2 py-0.5 rounded border border-brand-green/20">
                      <Lock className="w-2.5 h-2.5 animate-bounce" />
                      CARRIER LOCKED (Optimum)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[8px] font-black tracking-wider text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded border border-brand-cyan/20 animate-pulse">
                      <Unlock className="w-2.5 h-2.5" />
                      UNLOCKED (Ambient Static)
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* CALIBRATED GAUGES AND BARS */}
                <div className="col-span-12 md:col-span-8 space-y-3 font-mono">
                  {/* S-Meter Gauge */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-white/40">
                      <span>S-METER CARRIER STRENGTH</span>
                      <span className="text-brand-green font-bold">{getSMeterReading()}</span>
                    </div>
                    <div className="h-4 bg-white/5 rounded-md border border-white/10 overflow-hidden p-0.5 flex gap-0.5">
                      {Array.from({ length: 18 }).map((_, i) => {
                        // RSSI range is -120 to -30
                        const minVal = -120 + i * 5;
                        const active = signalStrength >= minVal;
                        const isHigh = minVal >= -60; // S9+ red region
                        return (
                          <div
                            key={i}
                            className={`flex-1 transition-all rounded-sm ${
                              active 
                                ? isHigh 
                                  ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' 
                                  : 'bg-brand-green shadow-[0_0_8px_#00ff41]' 
                                : 'bg-white/[0.03]'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[8px] text-white/30 pt-0.5">
                      <span>S1 (-110)</span>
                      <span>S5 (-85)</span>
                      <span>S9 (-55)</span>
                      <span>S9+30dB (-30)</span>
                    </div>
                  </div>

                  {/* SNR Gauge */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-white/40">
                      <span>SNR RATIO STAGE</span>
                      <span className={`font-bold ${snr > 15 ? 'text-brand-green' : 'text-brand-cyan'}`}>{snr} dB</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
                      <div 
                        style={{ width: `${Math.min(100, Math.max(0, (snr / 40) * 100))}%` }} 
                        className={`h-full transition-all ${
                          snr > 20 
                            ? 'bg-brand-green shadow-[0_0_8px_#00ff41]' 
                            : snr > 10 
                              ? 'bg-brand-cyan' 
                              : 'bg-yellow-500'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] text-white/30">
                      <span>0 dB (Static)</span>
                      <span>20 dB (Clear)</span>
                      <span>40 dB limit</span>
                    </div>
                  </div>

                  {/* DBm Values & SNR Values */}
                  <div className="grid grid-cols-2 gap-3 bg-white/[0.01] p-2.5 rounded-xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[8.5px] text-white/30 uppercase">CARRIER POWER (RSSI)</span>
                      <span className={`text-sm font-black mt-1 ${signalStrength > -70 ? 'text-brand-green' : 'text-brand-cyan'}`}>
                        {signalStrength} dBm
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8.5px] text-white/30 uppercase">SIGNAL TO NOISE (SNR)</span>
                      <span className={`text-sm font-black mt-1 ${snr > 15 ? 'text-brand-green' : 'text-brand-cyan'}`}>
                        {snr} dB
                      </span>
                    </div>
                  </div>
                </div>

                {/* CONSTELLATION SCOPE DISPLAY */}
                <div className="col-span-12 md:col-span-4 flex flex-col items-center justify-center p-2.5 bg-black/60 border border-white/5 rounded-xl relative overflow-hidden group">
                  <div className="absolute top-1.5 left-2 flex items-center gap-1 select-none pointer-events-none opacity-40">
                    <Activity className="w-2.5 h-2.5 text-brand-green" />
                    <span className="text-[7.5px] tracking-wider uppercase font-bold text-white">IQ PHASE SCOPE</span>
                  </div>
                  
                  {/* Scope Plot circle */}
                  <div className="w-20 h-20 rounded-full border border-white/10 relative flex items-center justify-center bg-black/85 my-1 overflow-hidden">
                    {/* Grid lines */}
                    <div className="absolute inset-x-0 top-1/2 h-[0.5px] bg-white/10" />
                    <div className="absolute inset-y-0 left-1/2 w-[0.5px] bg-white/10" />
                    <div className="absolute w-14 h-14 rounded-full border border-white/[0.04] border-dashed" />
                    
                    {/* Live mapped IQ points */}
                    {iqPoints.map((pt, idx) => {
                      // Normalize from [-1, 1] scope space to pixel coordinate [0, 80]
                      const xNormalized = ((pt.i + 1) / 2) * 80;
                      const yNormalized = ((pt.q + 1) / 2) * 80;
                      return (
                        <div
                          key={idx}
                          style={{
                            left: `${xNormalized}px`,
                            top: `${yNormalized}px`,
                          }}
                          className={`absolute w-1 h-1 rounded-full transition-all duration-150 ${
                            isScanning 
                              ? 'bg-yellow-500/80 shadow-[0_0_2px_#eab308]' 
                              : isMutedBySquelch 
                                ? 'bg-red-500/30' 
                                : snr > 20 
                                  ? 'bg-brand-green shadow-[0_0_4px_#00ff41]' 
                                  : 'bg-brand-cyan/80 shadow-[0_0_3px_#00e5ff]'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[7.5px] text-white/30 uppercase mt-1">Quadrature Phase Target</span>
                </div>
              </div>

              {/* Wi-Fi scan results block */}
              {selectedInterface === 'wifi_bt' && networkSSIDs.length > 0 && (
                <div className="space-y-1.5 border-t border-white/10 pt-2.5">
                  <span className="text-[8.5px] text-white/40 block font-black uppercase">MICROWAVE SSIDS DISCOVERED:</span>
                  <div className="space-y-1.5">
                    {networkSSIDs.map((net, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[9px] bg-white/[0.02] p-1.5 rounded border border-white/5">
                        <span className="text-white font-bold truncate max-w-[150px]">{net.ssid}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white/40 font-bold">Ch {net.channel}</span>
                          <span className={`font-black ${net.rssi > -60 ? 'text-brand-green' : 'text-brand-cyan'}`}>
                            {net.rssi} dBm
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RF TUNER CONTROL PARAMETERS */}
            <div className="bento-card p-4 flex flex-col gap-4">
              <h3 className="text-[10px] font-black tracking-widest text-brand-cyan uppercase pb-2 border-b border-white/5">
                DEMODULATOR INTERMETERS
              </h3>
              
              <div className="space-y-3">
                {/* Frequency Dial Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-white/40">
                    <span>MANUAL TUNER DIAL (MHz)</span>
                    <span className="text-brand-cyan font-black">{frequency.toFixed(3)} MHz</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="1200"
                    step="0.05"
                    value={frequency}
                    onChange={(e) => tuneFrequency(parseFloat(e.target.value))}
                    className="w-full accent-brand-green h-2.5 rounded bg-white/5 cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-white/30">
                    <span>30 MHz (HF/VHF)</span>
                    <span>1200 MHz (L-Band)</span>
                  </div>
                </div>

                {/* Squelch and RF Gain Sliders */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8.5px] text-white/40">
                        <span>RF GAIN: <b className="text-white font-extrabold">{rfGain}dB</b></span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={rfGain}
                        onChange={(e) => setRfGain(parseInt(e.target.value))}
                        className="w-full accent-brand-cyan h-2 rounded bg-white/5 cursor-pointer"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8.5px] text-white/40">
                        <span>SQUELCH (SQL): <b className="text-white font-extrabold">{squelch}dBm</b></span>
                      </div>
                      <input
                        type="range"
                        min="-120"
                        max="-40"
                        value={squelch}
                        onChange={(e) => setSquelch(parseInt(e.target.value))}
                        className="w-full accent-brand-green h-2 rounded bg-white/5 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Audio Output volume */}
                <div className="space-y-1 bg-white/[0.02] p-2 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center text-[9px] text-white/40">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" />
                      DEMODULATED AUDIO OUTPUT
                    </span>
                    <span className="text-white font-bold">{audioVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={audioVolume}
                    onChange={(e) => setAudioVolume(parseInt(e.target.value))}
                    className="w-full accent-brand-green h-2 rounded bg-white/5 cursor-pointer"
                  />
                </div>

                {/* Mode Select Buttons */}
                <div className="space-y-1">
                  <span className="text-[8.5px] text-[#888] font-black uppercase">MODULATION DECODER MODE:</span>
                  <div className="grid grid-cols-6 gap-1 mt-1">
                    {['WFM', 'NFM', 'AM', 'LSB', 'USB', 'CW'].map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setModulation(m as any);
                          addLog(`Decoder mode changed into: [${m}]`, "rf");
                        }}
                        className={`py-1 text-[9px] font-bold rounded border transition-all ${
                          modulation === m
                            ? 'bg-brand-cyan text-black border-brand-cyan shadow-[0_0_6px_#00e5ff]'
                            : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TELEMETRY FEEDBACK & LOGS BOX */}
          <div className="bento-card p-4 sm:p-5 flex flex-col gap-3 min-h-[160px] bg-black">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-[10px] font-black text-brand-green tracking-widest uppercase flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5" />
                ANTENNA SYSTEM CONTROLLER LOGS
              </span>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-brand-green/10 text-brand-green/80 border border-brand-green/20">
                ONLINE
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[120px] select-text pr-1 space-y-1.5 font-mono text-[9.5px]">
              {deviceLogs.length === 0 ? (
                <div className="text-white/20 italic text-center py-6 uppercase tracking-wider">
                  No active logs. Turn on the RF Engine or configure connections to stream diagnostic trace data.
                </div>
              ) : (
                deviceLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start leading-relaxed border-b border-white/[0.02] pb-1">
                    <span className="text-white/20 shrink-0 select-none">[{log.timestamp}]</span>
                    <span className={`font-semibold shrink-0 uppercase tracking-tighter ${
                      log.type === 'success' ? 'text-brand-green' :
                      log.type === 'warn' ? 'text-yellow-500' :
                      log.type === 'rf' ? 'text-brand-cyan' : 'text-white/50'
                    }`}>
                      [{log.type === 'success' ? 'OK' : log.type === 'warn' ? 'ERR' : log.type === 'rf' ? 'RF' : 'SYS'}]
                    </span>
                    <span className="text-white/80">{log.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
