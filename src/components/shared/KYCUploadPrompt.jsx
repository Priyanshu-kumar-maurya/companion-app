import React, { useState, useRef, useEffect } from "react";
import {
  FiShield,
  FiUploadCloud,
  FiCheckCircle,
  FiLock,
  FiAlertCircle,
  FiFileText,
  FiX,
  FiCamera,
  FiRefreshCw,
  FiArrowRight,
  FiArrowLeft,
  FiUserCheck,
  FiCheck,
} from "react-icons/fi";

const DOC_TYPES = [
  { id: "aadhaar", label: "Aadhaar Card", hint: "Front side with clear name & photo" },
  { id: "pan", label: "PAN Card", hint: "Clear readable PAN number" },
  { id: "dl", label: "Driving License", hint: "Valid government issued DL" },
  { id: "passport", label: "Passport", hint: "First page with personal details" },
];

const API_BASE = process.env.REACT_APP_API_URL || "https://rentgf-and-bf.onrender.com";
const API = `${API_BASE}/api`;

export default function KYCUploadPrompt({
  user,
  onUploadSuccess,
  onCancel,
  title = "Biometric KYC Verification",
  badge = "Security Gate",
  subtitle = "Safe and authentic dates ke liye apna Government ID Proof aur 1 Live Camera Selfie verify karana zaroori hai.",
  buttonText = "Submit KYC for Verification",
}) {
  // Step 1: ID Document, Step 2: Live Selfie, Step 3: Final Review
  const [step, setStep] = useState(1);
  const [selectedDocType, setSelectedDocType] = useState("aadhaar");

  // Document states
  const [idFile, setIdFile] = useState(null);
  const [idPreview, setIdPreview] = useState(null);

  // Live Selfie states
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("user"); // "user" or "environment"
  const [cameraError, setCameraError] = useState(null);
  const [flashEffect, setFlashEffect] = useState(false);

  // Submission states
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Start Camera Stream
  const startCamera = async (facing = cameraFacing) => {
    setCameraError(null);
    stopCamera();

    try {
      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err) {
      console.warn("Camera access failed:", err);
      setCameraError(
        "Camera access allow nahi ho paya. Kripya permissions check karein ya photo upload karein."
      );
      setCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Toggle Camera facing (Front/Back)
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(nextFacing);
    if (cameraActive) {
      startCamera(nextFacing);
    }
  };

  // Trigger camera whenever reaching Step 2
  useEffect(() => {
    if (step === 2 && !selfiePreview) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [step, selfiePreview]);

  // Handle Document selection
  const handleIdFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setError("Kripya image file (JPG, PNG, JPEG) select karein");
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError("File size 10MB se kam honi chahiye");
      return;
    }

    setError(null);
    setIdFile(selected);
    const reader = new FileReader();
    reader.onloadend = () => setIdPreview(reader.result);
    reader.readAsDataURL(selected);
  };

  // Handle Fallback Selfie File Upload
  const handleSelfieFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setError("Kripya selfie image file select karein");
      return;
    }

    setError(null);
    setSelfieBlob(selected);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelfiePreview(reader.result);
      stopCamera();
    };
    reader.readAsDataURL(selected);
  };

  // Capture Live Snapshot from Video Stream
  const captureSelfie = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 640;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    // Mirror front camera for natural selfie look
    if (cameraFacing === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    // Flash animation
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setSelfiePreview(dataUrl);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setSelfieBlob(blob);
        }
      },
      "image/jpeg",
      0.9
    );

    stopCamera();
  };

  // Retake Selfie
  const retakeSelfie = () => {
    setSelfiePreview(null);
    setSelfieBlob(null);
    startCamera();
  };

  // Submit Dual KYC
  const handleFinalSubmit = async () => {
    if (!idFile || !user) {
      setError("Kripya apna ID document select karein");
      setStep(1);
      return;
    }

    if (!selfieBlob && !selfiePreview) {
      setError("Kripya apni live selfie capture karein");
      setStep(2);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("id_document", idFile);
      formData.append("doc_type", selectedDocType);

      if (selfieBlob) {
        formData.append("live_selfie", selfieBlob, "live_selfie.jpg");
      } else if (selfiePreview) {
        formData.append("live_selfie_base64", selfiePreview);
      }

      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/kyc/${user.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "KYC upload fail ho gaya. Kripya punah prayas karein.");
      }

      setSuccess(true);
      const updatedUser = {
        ...user,
        kyc_status: data.kyc_status || "pending",
        id_proof_url: data.id_proof_url || idPreview,
        live_selfie_url: data.live_selfie_url || selfiePreview,
      };

      setTimeout(() => {
        if (typeof onUploadSuccess === "function") {
          onUploadSuccess(updatedUser);
        }
      }, 1500);
    } catch (err) {
      console.error("KYC upload error:", err);
      setError(err.message || "Upload me samasya aayi. Kripya internet check karein.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-[#121212] border border-[#262626] rounded-3xl p-5 sm:p-7 shadow-2xl animate-fade-in relative overflow-hidden">
      {/* Top Glowing Gradient Accent */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-32 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 blur-3xl pointer-events-none rounded-full" />

      {/* Header Icon & Status */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-inner">
            <FiShield size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400">
              {badge}
            </span>
            <h2 className="text-lg font-black text-white mt-0.5">{title}</h2>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition"
          >
            <FiX size={18} />
          </button>
        )}
      </div>

      {/* Multi-Step Progress Indicator */}
      {!success && (
        <div className="mb-5 bg-white/[0.03] border border-white/5 rounded-2xl p-2.5 flex items-center justify-between">
          <div
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 cursor-pointer transition ${
              step === 1 ? "text-pink-400 font-bold" : idPreview ? "text-emerald-400" : "text-gray-500"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                idPreview
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : step === 1
                    ? "bg-pink-500 text-white"
                    : "bg-white/10 text-gray-400"
              }`}
            >
              {idPreview ? "✓" : "1"}
            </div>
            <span className="text-xs">1. Govt ID</span>
          </div>

          <div className="w-8 h-0.5 bg-white/10 rounded" />

          <div
            onClick={() => idPreview && setStep(2)}
            className={`flex items-center gap-2 transition ${
              !idPreview ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            } ${
              step === 2
                ? "text-pink-400 font-bold"
                : selfiePreview
                  ? "text-emerald-400"
                  : "text-gray-500"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                selfiePreview
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : step === 2
                    ? "bg-pink-500 text-white"
                    : "bg-white/10 text-gray-400"
              }`}
            >
              {selfiePreview ? "✓" : "2"}
            </div>
            <span className="text-xs">2. Live Selfie</span>
          </div>

          <div className="w-8 h-0.5 bg-white/10 rounded" />

          <div
            onClick={() => idPreview && selfiePreview && setStep(3)}
            className={`flex items-center gap-2 transition ${
              !idPreview || !selfiePreview ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            } ${step === 3 ? "text-pink-400 font-bold" : "text-gray-500"}`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 3 ? "bg-pink-500 text-white" : "bg-white/10 text-gray-400"
              }`}
            >
              3
            </div>
            <span className="text-xs">3. Submit</span>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {success ? (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center flex flex-col items-center gap-3 animate-fade-in my-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FiCheckCircle size={32} />
          </div>
          <h3 className="text-lg font-bold text-emerald-300">Biometric KYC Submitted! 🎉</h3>
          <p className="text-xs text-gray-300 max-w-xs leading-relaxed">
            Aapka Government ID Proof aur Live Camera Selfie safalta-purvak upload ho gaya hai. Team review
            ke baad Verified Badge active ho jayega.
          </p>
        </div>
      ) : (
        <>
          {/* ───────────────── STEP 1: GOVT ID PROOF ───────────────── */}
          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <p className="text-xs text-gray-300 leading-relaxed">{subtitle}</p>

              {/* Document Type Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Document Ka Prakar Select Karein:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DOC_TYPES.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDocType(doc.id)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5 ${
                        selectedDocType === doc.id
                          ? "bg-pink-500/10 border-pink-500/50 text-white shadow-sm"
                          : "bg-white/[0.02] border-[#262626] text-gray-400 hover:bg-white/[0.05] hover:text-gray-300"
                      }`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <FiFileText
                          size={13}
                          className={selectedDocType === doc.id ? "text-pink-400" : "text-gray-500"}
                        />
                        {doc.label}
                      </span>
                      <span className="text-[10px] text-gray-500 truncate">{doc.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Box or Preview */}
              <div>
                {!idPreview ? (
                  <label className="w-full border-2 border-dashed border-[#262626] hover:border-pink-500/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-white/[0.01] hover:bg-pink-500/[0.02] group">
                    <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-pink-500/10 flex items-center justify-center text-gray-400 group-hover:text-pink-400 transition mb-3">
                      <FiUploadCloud size={24} />
                    </div>
                    <span className="text-sm font-bold text-white group-hover:text-pink-300 transition">
                      ID Document Photo Choose Karein
                    </span>
                    <span className="text-xs text-gray-500 mt-1">JPG, PNG ya WEBP (Max 10MB)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handleIdFileChange}
                    />
                  </label>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-[#262626] bg-black group">
                    <img
                      src={idPreview}
                      alt="Document Preview"
                      className="w-full max-h-48 object-contain mx-auto bg-black/60 p-2"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
                        ID Selected
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIdFile(null);
                          setIdPreview(null);
                        }}
                        className="w-7 h-7 rounded-full bg-black/80 hover:bg-red-500 text-white flex items-center justify-center transition backdrop-blur-md"
                        title="Remove & choose another"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 1 Next Button */}
              <button
                type="button"
                disabled={!idFile}
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                className={`w-full py-3.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg ${
                  !idFile
                    ? "bg-white/10 text-gray-500 cursor-not-allowed border border-white/5"
                    : "bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-pink-500/25 hover:opacity-95"
                }`}
              >
                <span>Aage Badhein: Live Selfie Step</span>
                <FiArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ───────────────── STEP 2: LIVE CAMERA SELFIE ───────────────── */}
          {step === 2 && (
            <div className="animate-fade-in space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <FiCamera size={14} className="text-emerald-400" />
                    <span>Live Camera Selfie (Liveness Check)</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Apna chehra camera ke samne rakhein aur natural smile karein.
                  </p>
                </div>
                {cameraActive && (
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white transition flex items-center gap-1 text-xs"
                    title="Switch camera"
                  >
                    <FiRefreshCw size={12} />
                    <span>Flip</span>
                  </button>
                )}
              </div>

              {/* Camera Container or Captured Preview */}
              <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 aspect-square max-h-[300px] flex items-center justify-center mx-auto w-full">
                {/* Flash white overlay on snapshot */}
                {flashEffect && (
                  <div className="absolute inset-0 bg-white z-30 animate-pulse pointer-events-none" />
                )}

                {selfiePreview ? (
                  // Captured Preview
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={selfiePreview}
                      alt="Captured Selfie"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                        Selfie Captured
                      </span>
                    </div>
                  </div>
                ) : cameraActive ? (
                  // Live Stream with Oval Face Guide
                  <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${cameraFacing === "user" ? "-scale-x-100" : ""}`}
                    />
                    {/* Face Oval Overlay Guide */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-60 border-2 border-dashed border-emerald-400/80 rounded-[50%] shadow-[0_0_20px_rgba(52,211,153,0.3)] flex flex-col justify-between items-center py-4">
                        <span className="text-[10px] font-bold text-emerald-300 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                          Keep Face Inside
                        </span>
                        <span className="text-[9px] text-gray-300 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                          Smile & Look Ahead 🙂
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Camera Error / Fallback File Picker
                  <div className="p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 mx-auto">
                      <FiCamera size={24} />
                    </div>
                    {cameraError ? (
                      <p className="text-xs text-amber-400">{cameraError}</p>
                    ) : (
                      <p className="text-xs text-gray-400">Camera start ho raha hai...</p>
                    )}
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 rounded-xl text-xs font-bold transition"
                      >
                        Try Camera Again
                      </button>
                      <label className="px-4 py-2 bg-white/10 hover:bg-white/15 text-gray-300 border border-white/10 rounded-xl text-xs font-bold transition cursor-pointer">
                        <span>Gallery se Selfie Select Karein</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleSelfieFileChange}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons for Step 2 */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setStep(1);
                  }}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <FiArrowLeft size={14} />
                  <span>Back</span>
                </button>

                {!selfiePreview && cameraActive ? (
                  <button
                    type="button"
                    onClick={captureSelfie}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <FiCamera size={15} />
                    <span>Capture Photo</span>
                  </button>
                ) : selfiePreview ? (
                  <>
                    <button
                      type="button"
                      onClick={retakeSelfie}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <FiRefreshCw size={13} />
                      <span>Retake</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        setStep(3);
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-pink-500/20 shadow-md"
                    >
                      <span>Next Step</span>
                      <FiArrowRight size={14} />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {/* ───────────────── STEP 3: REVIEW & SUBMIT ───────────────── */}
          {step === 3 && (
            <div className="animate-fade-in space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <FiUserCheck size={15} className="text-pink-400" />
                <span>Verification Preview & Confirmation</span>
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Kripya check karein ki aapka ID Document aur Live Selfie dono bilkul clear aur visible hain.
              </p>

              {/* Side-by-side preview cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* ID Doc Preview */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex flex-col justify-between">
                  <span className="text-[10px] text-gray-400 font-bold mb-1.5 flex items-center gap-1">
                    <FiFileText size={11} className="text-pink-400" />
                    <span>Govt ID ({selectedDocType.toUpperCase()})</span>
                  </span>
                  <div className="h-28 rounded-xl overflow-hidden bg-black/60 flex items-center justify-center">
                    <img
                      src={idPreview}
                      alt="ID Preview"
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="mt-2 text-[10px] text-pink-400 hover:underline font-bold text-center block"
                  >
                    Change ID
                  </button>
                </div>

                {/* Live Selfie Preview */}
                <div className="bg-white/5 border border-emerald-500/30 rounded-2xl p-2.5 flex flex-col justify-between">
                  <span className="text-[10px] text-emerald-400 font-bold mb-1.5 flex items-center gap-1">
                    <FiCamera size={11} />
                    <span>Live Selfie</span>
                  </span>
                  <div className="h-28 rounded-xl overflow-hidden bg-black/60 flex items-center justify-center">
                    <img
                      src={selfiePreview}
                      alt="Selfie Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="mt-2 text-[10px] text-emerald-400 hover:underline font-bold text-center block"
                  >
                    Retake Selfie
                  </button>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5">
                <FiLock size={16} className="text-emerald-400 shrink-0" />
                <span className="text-[11px] text-gray-300">
                  Documents are encrypted with 256-bit SSL and reviewed only by authorized security staff.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={uploading}
                  className="px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <FiArrowLeft size={14} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={uploading}
                  className="flex-1 py-3.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:opacity-95 text-white shadow-pink-500/25 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying & Uploading...</span>
                    </>
                  ) : (
                    <>
                      <FiShield size={16} />
                      <span>{buttonText}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Global Error Banner */}
          {error && (
            <div className="p-3 mt-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <FiAlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </>
      )}

      {/* Privacy & Trust Footer */}
      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <FiShield size={13} className="text-emerald-400" />
          256-Bit Bank Grade Encryption
        </span>
        <span className="text-gray-500">100% Confidential</span>
      </div>
    </div>
  );
}
