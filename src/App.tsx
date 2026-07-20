import React, { useState, useEffect, FormEvent, MouseEvent } from "react";
import {
  Mail,
  Sparkles,
  History,
  Check,
  Copy,
  RotateCcw,
  Trash2,
  Info,
  Smartphone,
  Monitor,
  AlertCircle,
  X,
  FileText,
  Sliders,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  Edit2
} from "lucide-react";
import {
  FormInput,
  CopyVariant,
  GenerationResponse,
  CampaignHistory,
  EMAIL_TYPES,
  RECIPIENT_SEGMENTS,
  TONE_STYLES,
  PRESET_EXAMPLES
} from "./types";

const INITIAL_FORM: FormInput = {
  emailType: "welcome",
  recipientSegment: "new_leads",
  topic: "",
  tone: "friendly",
  includeEmojis: true,
  customEmailType: "",
  customSegment: "",
  customTone: ""
};

const TIPS_ROTATOR = [
  "Keep subject lines under 50 characters to prevent truncation on mobile inbox screens.",
  "Preview text should act as a secondary hook—use it to build on the subject line, never repeat it.",
  "Personalization tags like {{First Name}} can lift email open rates by up to 22%.",
  "Avoid spam trigger words like 'FREE', 'CASH', 'GUARANTEE' in all caps to bypass modern junk filters.",
  "Using a question in your subject line generates curiosity and can increase open rates by 15-20%."
];

export default function App() {
  // Application State
  const [form, setForm] = useState<FormInput>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [history, setHistory] = useState<CampaignHistory[]>([]);
  const [activeTab, setActiveTab] = useState<"builder" | "history">("builder");
  
  // Interactive UI States
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [simulatedDevice, setSimulatedDevice] = useState<"mobile" | "desktop">("mobile");
  
  // Inline Editing State (per variant)
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedPreview, setEditedPreview] = useState("");

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ab_subject_lines_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  }, []);

  // Tip rotator loop when loading
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % TIPS_ROTATOR.length);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Form handlers
  const handleInputChange = (field: keyof FormInput, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset: typeof PRESET_EXAMPLES[0]) => {
    setForm({
      emailType: preset.emailType,
      recipientSegment: preset.recipientSegment,
      topic: preset.topic,
      tone: preset.tone,
      includeEmojis: preset.includeEmojis,
      customEmailType: "",
      customSegment: "",
      customTone: ""
    });
    setError(null);
  };

  const saveToHistory = (newResult: GenerationResponse, inputData: FormInput) => {
    try {
      const newHistoryItem: CampaignHistory = {
        id: "hist_" + Date.now(),
        timestamp: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }),
        input: { ...inputData },
        output: newResult
      };
      
      const updatedHistory = [newHistoryItem, ...history.slice(0, 19)]; // limit to 20
      setHistory(updatedHistory);
      localStorage.setItem("ab_subject_lines_history", JSON.stringify(updatedHistory));
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  };

  const deleteHistoryItem = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    localStorage.setItem("ab_subject_lines_history", JSON.stringify(updated));
  };

  const clearAllHistory = () => {
    if (confirm("Are you sure you want to clear your generation history?")) {
      setHistory([]);
      localStorage.removeItem("ab_subject_lines_history");
    }
  };

  // Submit form to generate copies
  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.topic.trim()) {
      setError("Please describe the core message or topic of your email first.");
      return;
    }
    if (form.emailType === "custom" && !form.customEmailType.trim()) {
      setError("Please specify your custom email type.");
      return;
    }
    if (form.recipientSegment === "custom" && !form.customSegment.trim()) {
      setError("Please specify your custom recipient segment.");
      return;
    }
    if (form.tone === "custom" && !form.customTone.trim()) {
      setError("Please specify your custom tone of voice.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setEditingVariantId(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        let errMsg = "Generation request failed";
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch {
          try {
            const rawText = await response.text();
            if (rawText && rawText.length < 200) {
              errMsg = rawText;
            }
          } catch {}
        }
        throw new Error(errMsg);
      }

      const data: GenerationResponse = await response.json();
      setResult(data);
      saveToHistory(data, form);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An error occurred while connecting to the copy generator server. Please ensure you have configured your GEMINI_API_KEY.");
    } finally {
      setIsLoading(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Save inline edits
  const handleSaveEdit = (variantId: string) => {
    if (!result) return;
    const updatedVariants = result.variants.map((v) => {
      if (v.id === variantId) {
        return {
          ...v,
          subjectLine: editedSubject,
          previewText: editedPreview,
          charCountSubject: editedSubject.length,
          charCountPreview: editedPreview.length
        };
      }
      return v;
    });
    setResult({ ...result, variants: updatedVariants });
    setEditingVariantId(null);
  };

  const handleStartEdit = (variant: CopyVariant) => {
    setEditingVariantId(variant.id);
    setEditedSubject(variant.subjectLine);
    setEditedPreview(variant.previewText);
  };

  const activeEmailTypeLabel = EMAIL_TYPES.find(t => t.value === form.emailType)?.label || "Email Campaign";
  const activeSegmentLabel = RECIPIENT_SEGMENTS.find(s => s.value === form.recipientSegment)?.label || "Target Audience";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans flex flex-col antialiased">
      <header className="sticky top-0 z-40 bg-neutral-900 border-b border-neutral-800 shadow-md px-6 py-4 flex flex-col sm:flex-row space-y-3 sm:space-y-0 items-center justify-between">
        <div className="flex items-center text-center sm:text-left">
          <div>
            <div className="flex flex-col sm:flex-row items-center sm:space-x-2 space-y-1 sm:space-y-0">
              <span className="text-xl font-extrabold italic tracking-tight text-white select-none" style={{ fontFamily: "'Noto Sans', sans-serif", fontWeight: 800 }}>
                SIGN
                <span className="text-brand inline-block mx-0.5" style={{ fontFamily: "'Blacksword', 'Pinyon Script', cursive", fontSize: '1.25em', transform: 'scale(1.25) translateY(1px)' }}>
                  2
                </span>
                &nbsp;SEAL
              </span>
              <span className="inline-block text-[9px] bg-brand-light text-brand border border-brand/20 px-1.5 py-0.5 rounded font-bold font-mono uppercase tracking-wider mb-2 sm:mb-0">
                COMMUNICATIONS
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-medium">
              A/B Hook & Subject Line Optimizer
            </p>
          </div>
        </div>
        
        {/* Navigation tabs */}
        <div className="flex items-center space-x-2">
          <button
            id="nav-builder-btn"
            onClick={() => setActiveTab("builder")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "builder"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
            }`}
          >
            <span className="flex items-center space-x-1.5">
              <Sliders className="w-4 h-4 text-brand" />
              <span>Copy Builder</span>
            </span>
          </button>
          <button
            id="nav-history-btn"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
              activeTab === "history"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
            }`}
          >
            <span className="flex items-center space-x-1.5">
              <History className="w-4 h-4 text-brand" />
              <span>Past Runs</span>
              {history.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {history.length}
                </span>
              )}
            </span>
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Inputs or History depending on active tab) */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          {activeTab === "builder" ? (
            <div id="builder-panel" className="bg-neutral-900 rounded-2xl border border-neutral-800 shadow-sm p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h2 className="font-display font-semibold text-white text-lg flex items-center space-x-2">
                  <span>Campaign Parameters</span>
                </h2>
                <button
                  id="reset-form-btn"
                  onClick={() => {
                    setForm(INITIAL_FORM);
                    setError(null);
                  }}
                  className="text-xs text-neutral-400 hover:text-brand flex items-center space-x-1.5 transition-colors font-medium"
                  title="Reset form parameters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Presets / Interactive Examples */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                  Quick-Start Examples
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_EXAMPLES.map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyPreset(example)}
                      className="text-xs bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 hover:border-brand/30 hover:text-brand px-2.5 py-1.5 rounded-lg transition-all text-left truncate max-w-full font-medium cursor-pointer"
                    >
                      {example.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form elements */}
              <form onSubmit={handleGenerate} className="space-y-4">
                
                {/* 1. Email Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-neutral-300 flex items-center justify-between">
                    <span>Email Campaign Type</span>
                  </label>
                  <select
                    id="email-type-select"
                    value={form.emailType}
                    onChange={(e) => handleInputChange("emailType", e.target.value)}
                    className="w-full text-sm border border-neutral-800 rounded-xl px-3 py-2.5 bg-neutral-950 text-white focus:outline-hidden focus:ring-2 focus:ring-brand-glow focus:border-brand font-medium transition-all"
                  >
                    {EMAIL_TYPES.map((type) => (
                      <option key={type.value} value={type.value} className="bg-neutral-950 text-white">
                        {type.label}
                      </option>
                    ))}
                  </select>
                  
                  {form.emailType === "custom" && (
                    <input
                      id="custom-email-type-input"
                      type="text"
                      placeholder="e.g. Abandoned Cart Recovery, Affiliate Promo"
                      value={form.customEmailType}
                      onChange={(e) => handleInputChange("customEmailType", e.target.value)}
                      className="mt-2 w-full text-sm border border-neutral-800 rounded-xl px-3 py-2 bg-neutral-950 text-white focus:outline-hidden focus:ring-2 focus:ring-brand-glow focus:border-brand"
                    />
                  )}
                </div>

                {/* 2. Recipient Segment Selection */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-neutral-300">
                    Recipient Segment
                  </label>
                  <select
                    id="recipient-segment-select"
                    value={form.recipientSegment}
                    onChange={(e) => handleInputChange("recipientSegment", e.target.value)}
                    className="w-full text-sm border border-neutral-800 rounded-xl px-3 py-2.5 bg-neutral-950 text-white focus:outline-hidden focus:ring-2 focus:ring-brand-glow focus:border-brand font-medium transition-all"
                  >
                    {RECIPIENT_SEGMENTS.map((seg) => (
                      <option key={seg.value} value={seg.value} className="bg-neutral-950 text-white">
                        {seg.label}
                      </option>
                    ))}
                  </select>

                  {form.recipientSegment === "custom" && (
                    <input
                      id="custom-recipient-segment-input"
                      type="text"
                      placeholder="e.g. Designers using Figma plugin, users inactive for 90 days"
                      value={form.customSegment}
                      onChange={(e) => handleInputChange("customSegment", e.target.value)}
                      className="mt-2 w-full text-sm border border-neutral-800 rounded-xl px-3 py-2 bg-neutral-950 text-white focus:outline-hidden focus:ring-2 focus:ring-brand-glow focus:border-brand"
                    />
                  )}
                </div>

                {/* 3. Tone of Voice */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-neutral-300">
                    Tone and Vibe
                  </label>
                  <select
                    id="tone-select"
                    value={form.tone}
                    onChange={(e) => handleInputChange("tone", e.target.value)}
                    className="w-full text-sm border border-neutral-800 rounded-xl px-3 py-2.5 bg-neutral-950 text-white focus:outline-hidden focus:ring-2 focus:ring-brand-glow focus:border-brand font-medium transition-all"
                  >
                    {TONE_STYLES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-neutral-950 text-white">
                        {t.label}
                      </option>
                    ))}
                  </select>

                  {form.tone === "custom" && (
                    <input
                      id="custom-tone-input"
                      type="text"
                      placeholder="e.g. Sophisticated, witty, rebellious"
                      value={form.customTone}
                      onChange={(e) => handleInputChange("customTone", e.target.value)}
                      className="mt-2 w-full text-sm border border-neutral-800 rounded-xl px-3 py-2 bg-neutral-950 text-white focus:outline-hidden focus:ring-2 focus:ring-brand-glow focus:border-brand"
                    />
                  )}
                </div>

                {/* 4. Core Message/Topic Area */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-neutral-300">
                      Core Topic & Key Message
                    </label>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {form.topic.length} chars
                    </span>
                  </div>
                  <textarea
                    id="topic-textarea"
                    placeholder="Provide specific details about your campaign. E.g. Introducing automatic invoice tracking, 3 tips on styling lists, 20% off using promo code AUTUMN20..."
                    value={form.topic}
                    onChange={(e) => handleInputChange("topic", e.target.value)}
                    rows={4}
                    className="w-full text-sm border border-neutral-800 rounded-xl px-3 py-2.5 bg-neutral-950 text-white focus:outline-hidden focus:ring-2 focus:ring-brand-glow focus:border-brand focus:bg-neutral-900/50 transition-all resize-none"
                  />
                  <p className="text-[10px] text-neutral-500 leading-normal">
                    💡 <strong>Pro-Tip:</strong> Concrete deadlines and specific benefits lead to much better optimized e-signature or notification rates.
                  </p>
                </div>

                {/* Emojis Toggle */}
                <div className="bg-neutral-950 rounded-xl p-3 border border-neutral-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="emoji-toggle" className="text-xs font-semibold text-neutral-300 cursor-pointer select-none">
                      Enable Emojis
                    </label>
                    <p className="text-[10px] text-neutral-500">Include icons in generated variants</p>
                  </div>
                  <input
                    id="emoji-toggle"
                    type="checkbox"
                    checked={form.includeEmojis}
                    onChange={(e) => handleInputChange("includeEmojis", e.target.checked)}
                    className="w-4 h-4 rounded text-brand focus:ring-brand border-neutral-700 cursor-pointer bg-neutral-900"
                  />
                </div>

                {/* Dynamic Token Helper Box */}
                <div className="bg-brand-light rounded-xl p-3 border border-brand/20 space-y-2">
                  <span className="text-[10px] font-bold text-brand uppercase tracking-wider block">
                    Copywriter Tags (Merge Fields)
                  </span>
                  <p className="text-[11px] text-brand leading-normal opacity-90">
                    Insert placeholders. The AI will integrate them into custom signature triggers:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["{{First Name}}", "{{Company}}", "{{Product Name}}"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          handleInputChange("topic", form.topic + " " + tag);
                        }}
                        className="text-[10px] bg-neutral-900 border border-brand/20 text-brand hover:bg-brand/20 px-2 py-0.5 rounded font-mono font-semibold transition-colors cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="bg-red-950/30 text-red-200 p-3.5 rounded-xl border border-red-900/50 text-xs flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                    <div>
                      <p className="font-semibold">Generation Failed</p>
                      <p className="mt-0.5 leading-normal">{error}</p>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  id="generate-button"
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-brand hover:bg-brand-hover disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md shadow-brand/10 hover:shadow-brand/20 active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Cooking Copy Formulas...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Optimize & Verify Copy</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* History Panel view in left rail */
            <div id="history-panel" className="bg-neutral-900 rounded-2xl border border-neutral-800 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h2 className="font-display font-semibold text-white text-lg flex items-center space-x-2">
                  <span>Recent Campaigns</span>
                </h2>
                {history.length > 0 && (
                  <button
                    id="clear-all-history-btn"
                    onClick={clearAllHistory}
                    className="text-xs text-red-400 hover:text-red-500 flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear all</span>
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-8 px-4 text-neutral-500 space-y-2">
                  <History className="w-8 h-8 mx-auto stroke-1 text-neutral-600" />
                  <p className="text-xs font-medium">No previous campaign runs found.</p>
                  <p className="text-[10px] leading-normal text-neutral-500 max-w-xs mx-auto">
                    Generate some copy variations first, and they will be safely kept here in your browser.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setResult(item.output);
                        setForm(item.input);
                        setActiveTab("builder");
                      }}
                      className="bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 rounded-xl p-3 text-left transition-all cursor-pointer group hover:border-brand/50 hover:ring-2 hover:ring-brand-glow"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full capitalize">
                          {item.input.emailType === "custom" ? item.input.customEmailType : item.input.emailType}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] text-neutral-500 font-mono">{item.timestamp}</span>
                          <button
                            onClick={(e) => deleteHistoryItem(item.id, e)}
                            className="text-neutral-500 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                            title="Delete campaign"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-neutral-200 line-clamp-1">
                        Segment: {item.input.recipientSegment === "custom" ? item.input.customSegment : item.input.recipientSegment}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                        {item.input.topic}
                      </p>
                      <div className="mt-2 text-[10px] text-brand font-bold flex items-center space-x-1 group-hover:text-brand-hover">
                        <span>Load copy variants</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Main Stage (Output variants dashboard & Inbox simulation) */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          
          {/* Default Empty Welcome State */}
          {!isLoading && !result && (
            <div id="empty-state-card" className="bg-neutral-900 rounded-2xl border border-neutral-800 shadow-sm p-8 text-center flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="bg-brand-light text-brand p-4 rounded-full ring-8 ring-brand-glow">
                <Mail className="w-10 h-10 stroke-1.5" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="font-display font-semibold text-white text-2xl tracking-tight">
                  Verify & Optimize Your Notifications
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Provide your notification parameters or sign-off requests in the left panel. Sign2Seal's delivery cognitive engine instantly generates A/B tested copy variations tailored for your recipients.
                </p>
              </div>

              {/* Quick statistics / Educational info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl pt-4">
                <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 text-left">
                  <span className="text-xl font-bold text-brand block">47%</span>
                  <span className="text-xs font-medium text-neutral-400 block mt-0.5">
                    of signees verify emails purely based on direct subject line clarity.
                  </span>
                </div>
                <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 text-left">
                  <span className="text-xl font-bold text-brand block">3x</span>
                  <span className="text-xs font-medium text-neutral-400 block mt-0.5">
                    faster sign-off speeds when using clear, legally optimized subject formats.
                  </span>
                </div>
                <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 text-left">
                  <span className="text-xl font-bold text-brand block">69%</span>
                  <span className="text-xs font-medium text-neutral-400 block mt-0.5">
                    of notification alerts bypass junk filters with clean, non-spam triggers.
                  </span>
                </div>
              </div>

              <div className="bg-brand-light border border-brand/20 rounded-xl p-4 w-full max-w-xl text-left flex items-start space-x-3 text-xs text-brand">
                <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-brand" />
                <div>
                  <p className="font-bold mb-0.5">How to guarantee signee engagement?</p>
                  <p className="leading-relaxed opacity-90">
                    High engagement comes from absolute security and clarity. By presenting your key actions explicitly, recipients feel secure in clicking the envelope to sign and seal.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading Transition Screen with tips */}
          {isLoading && (
            <div id="loading-state-card" className="bg-neutral-900 rounded-2xl border border-neutral-800 shadow-sm p-8 text-center flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-neutral-850 border-t-brand rounded-full animate-spin" />
                <Mail className="w-6 h-6 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              
              <div className="space-y-1.5">
                <p className="text-lg font-semibold text-white">Generating Secure Copy Formulas...</p>
                <p className="text-xs text-neutral-500 font-mono tracking-wider uppercase">Evaluating deliverability & compliance algorithms</p>
              </div>

              <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-5 text-left space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-brand" />
                <div className="flex items-center space-x-2 text-xs font-bold text-brand">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>SECURE ENGAGEMENT DELIVERY TIP</span>
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed font-medium transition-all duration-300">
                  "{TIPS_ROTATOR[currentTipIndex]}"
                </p>
              </div>
            </div>
          )}

          {/* Generation Result Dashboard */}
          {!isLoading && result && (
            <div id="result-dashboard" className="space-y-6 flex-1 flex flex-col">
              {/* Dashboard Summary Top Bar */}
              <div className="bg-neutral-900 text-white rounded-2xl p-5 border border-neutral-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-brand bg-brand-light px-2 py-0.5 rounded border border-brand/20 font-mono uppercase tracking-widest">
                      Formulas Signed Off
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">3 Verified Options Generated</span>
                  </div>
                  <h3 className="font-display font-semibold text-lg text-white">
                    A/B Copy Options for <span className="text-brand">{activeEmailTypeLabel}</span>
                  </h3>
                  <p className="text-xs text-neutral-300">
                    Segmented for: <strong className="text-neutral-100">{activeSegmentLabel}</strong>
                  </p>
                </div>

                {/* Device Selector for the Inbox Simulator */}
                <div className="bg-neutral-950 p-1 rounded-xl border border-neutral-800 flex items-center shrink-0 self-start md:self-center">
                  <button
                    id="sim-device-mobile-btn"
                    onClick={() => setSimulatedDevice("mobile")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 cursor-pointer ${
                      simulatedDevice === "mobile"
                        ? "bg-neutral-850 text-white shadow-2xs"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-brand" />
                    <span>Mobile (iOS)</span>
                  </button>
                  <button
                    id="sim-device-desktop-btn"
                    onClick={() => setSimulatedDevice("desktop")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 cursor-pointer ${
                      simulatedDevice === "desktop"
                        ? "bg-neutral-850 text-white shadow-2xs"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5 text-brand" />
                    <span>Desktop (Gmail)</span>
                  </button>
                </div>
              </div>

              {/* High Level Segment Marketing Advice */}
              <div className="bg-brand-light border border-brand/20 rounded-2xl p-4 flex items-start space-x-3 text-xs text-brand">
                <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-brand" />
                <div className="space-y-1.5">
                  <p className="font-bold">Conversion Strategy for {activeSegmentLabel}:</p>
                  <ul className="list-disc pl-4 space-y-1 leading-normal text-neutral-300">
                    {result.overallTips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* The Copy Cards Grid */}
              <div className="space-y-6">
                {result.variants.map((variant, index) => {
                  const isEditing = editingVariantId === variant.id;
                  const isSubjectWarning = variant.subjectLine.length > 55;
                  const isPreviewWarning = variant.previewText.length > 120;

                  return (
                    <div
                      key={variant.id}
                      className="bg-neutral-900 rounded-2xl border border-neutral-800 shadow-sm hover:shadow-md transition-all overflow-hidden relative flex flex-col"
                    >
                      {/* Certified Sign2Seal Seal Overlay */}
                      <div className="absolute right-12 top-[160px] pointer-events-none opacity-[0.08] select-none hidden md:block">
                        <div className="border-4 border-dashed border-brand rounded-full p-2 flex flex-col items-center justify-center w-28 h-28 rotate-12">
                           <span className="text-[11px] font-extrabold tracking-[0.2em] text-brand">SIGN2SEAL</span>
                           <span className="text-[9px] font-mono font-bold tracking-wider text-brand mt-1">APPROVED</span>
                           <span className="text-[6px] text-neutral-400 font-mono mt-0.5">VERIFIED #{variant.id}</span>
                        </div>
                      </div>

                      {/* Card Header */}
                      <div className="bg-neutral-950 px-5 py-3 border-b border-neutral-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <div>
                            <span className="font-display font-bold text-white text-sm">
                              Option {String.fromCharCode(65 + index)}: {variant.strategyName}
                            </span>
                            <span className="text-[10px] text-neutral-400 ml-2 font-mono hidden sm:inline-block">
                              ({variant.strategyDescription})
                            </span>
                          </div>
                        </div>

                        {/* Interactive Edit Actions */}
                        <div className="flex items-center space-x-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(variant.id)}
                                className="bg-brand text-white text-xs font-bold px-2.5 py-1 rounded-md hover:bg-brand-hover transition-colors cursor-pointer"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setEditingVariantId(null)}
                                className="text-neutral-400 text-xs font-medium px-2 py-1 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(variant)}
                              className="text-neutral-400 hover:text-white text-xs font-medium px-2 py-1 rounded-md hover:bg-neutral-800 flex items-center space-x-1 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Customize</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Editing fields inputs */}
                      {isEditing && (
                        <div className="p-4 bg-neutral-950 border-b border-neutral-850 space-y-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-neutral-400">Edit Subject Line</label>
                            <input
                              type="text"
                              value={editedSubject}
                              onChange={(e) => setEditedSubject(e.target.value)}
                              className="w-full text-sm font-medium border border-neutral-800 rounded-lg px-3 py-1.5 bg-neutral-900 text-white focus:outline-hidden focus:ring-1 focus:ring-brand focus:border-brand"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-neutral-400">Edit Preview Text</label>
                            <input
                              type="text"
                              value={editedPreview}
                              onChange={(e) => setEditedPreview(e.target.value)}
                              className="w-full text-sm text-neutral-300 border border-neutral-800 rounded-lg px-3 py-1.5 bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-brand focus:border-brand"
                            />
                          </div>
                        </div>
                      )}

                      {/* Dynamic Inbox Simulation Sandbox */}
                      <div className="p-5 border-b border-neutral-850 bg-neutral-950/40">
                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center space-x-1.5">
                          <span>Live Inbox Simulator</span>
                          <span className="text-[9px] bg-neutral-800 text-neutral-300 font-mono px-1.5 py-0.2 rounded capitalize">
                            {simulatedDevice}
                          </span>
                        </div>

                        {simulatedDevice === "mobile" ? (
                          /* iOS / Smartphone mail client layout */
                          <div className="max-w-sm mx-auto bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xs overflow-hidden font-sans">
                            {/* Simulator header status bar */}
                            <div className="bg-neutral-950 px-4 py-2 border-b border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                              <span className="font-semibold font-mono text-white">9:41 AM</span>
                              <div className="flex items-center space-x-1 text-[10px] font-mono text-neutral-500">
                                <span>Inbox</span>
                                <span>(1)</span>
                              </div>
                            </div>
                            
                            {/* Mail item cell */}
                            <div className="p-3.5 border-b border-neutral-800/60 flex flex-col text-left text-xs">
                              <div className="flex items-center justify-between text-neutral-500 mb-0.5">
                                <span className="font-bold text-white text-[13px]">
                                  Your Brand Campaign
                                </span>
                                <span className="text-[11px] text-neutral-500 font-mono">Now</span>
                              </div>
                              <p className="font-semibold text-[13px] leading-tight text-white">
                                {variant.subjectLine}
                              </p>
                              <p className="text-neutral-400 mt-1 line-clamp-2 leading-relaxed text-[12px]">
                                {variant.previewText}
                              </p>
                            </div>

                            {/* Inbox tail element */}
                            <div className="bg-neutral-950 p-2.5 text-center text-[10px] text-neutral-500 border-t border-neutral-800/40">
                              ⚡ Truncates on small device screens if too long.
                            </div>
                          </div>
                        ) : (
                          /* Gmail Desktop Client list simulator */
                          <div className="border border-neutral-800 bg-neutral-900 rounded-xl overflow-hidden text-xs text-left shadow-md">
                            {/* Tab selector mock */}
                            <div className="bg-neutral-950 border-b border-neutral-800 px-3 py-1.5 flex items-center space-x-4 text-[11px] text-neutral-400">
                              <span className="text-brand font-semibold border-b-2 border-brand pb-0.5">Primary</span>
                              <span className="text-neutral-500">Promotions</span>
                              <span className="text-neutral-500">Social</span>
                            </div>

                            {/* Mail list rows */}
                            <div className="divide-y divide-neutral-800/60">
                              <div className="px-3 py-2.5 bg-brand/5 hover:bg-neutral-800 flex items-center justify-between">
                                <div className="flex items-center space-x-3 truncate max-w-[85%]">
                                  {/* Selection checkers mock */}
                                  <div className="flex items-center space-x-1.5 shrink-0">
                                    <div className="w-3.5 h-3.5 border border-neutral-700 rounded-sm bg-neutral-950" />
                                    <span className="text-neutral-700">★</span>
                                  </div>

                                  <span className="font-bold text-white shrink-0 w-32 truncate">
                                    Your Brand Name
                                  </span>

                                  {/* Subject + preview run-on chain */}
                                  <div className="truncate flex items-center space-x-1.5">
                                    <span className="font-semibold text-neutral-200 shrink-0">
                                      {variant.subjectLine}
                                    </span>
                                    <span className="text-neutral-600 shrink-0 font-light">—</span>
                                    <span className="text-neutral-400 truncate font-light font-sans">
                                      {variant.previewText}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-neutral-500 font-mono font-medium">9:41 AM</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Main Data & Strategy Details */}
                      <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5 flex-1">
                        
                        {/* Copyable code elements */}
                        <div className="md:col-span-7 space-y-4">
                          {/* Subject Line Copy Block */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold text-neutral-400">
                              <span className="flex items-center space-x-1.5">
                                <span>Subject Line</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${
                                  isSubjectWarning ? "bg-amber-950/40 text-amber-400 border-amber-900/30 font-bold" : "bg-brand-light text-brand border-brand/20"
                                }`}>
                                  {variant.subjectLine.length} chars {isSubjectWarning ? "(Close to cut-off)" : "(Optimal)"}
                                </span>
                              </span>
                            </div>
                            <div className="bg-neutral-950 hover:bg-neutral-850 border border-neutral-850 rounded-xl p-3 flex items-start justify-between group transition-colors">
                              <p className="text-white font-semibold text-sm leading-relaxed pr-3 select-all">
                                {variant.subjectLine}
                              </p>
                              <button
                                onClick={() => handleCopy(variant.subjectLine, `${variant.id}-sub`)}
                                className="text-neutral-400 hover:text-brand p-1.5 rounded-lg border border-neutral-800 bg-neutral-900 shadow-sm shrink-0 transition-all active:scale-95 cursor-pointer"
                                title="Copy Subject Line"
                              >
                                {copiedId === `${variant.id}-sub` ? (
                                  <Check className="w-4 h-4 text-brand" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Preview Text Copy Block */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold text-neutral-400">
                              <span className="flex items-center space-x-1.5">
                                <span>Preview (Preheader) Text</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${
                                  isPreviewWarning ? "bg-amber-950/40 text-amber-400 border-amber-900/30 font-bold" : "bg-brand-light text-brand border-brand/20"
                                }`}>
                                  {variant.previewText.length} chars {isPreviewWarning ? "(Close to cut-off)" : "(Optimal)"}
                                </span>
                              </span>
                            </div>
                            <div className="bg-neutral-950 hover:bg-neutral-850 border border-neutral-850 rounded-xl p-3 flex items-start justify-between group transition-colors">
                              <p className="text-neutral-300 text-sm leading-relaxed pr-3 select-all">
                                {variant.previewText}
                              </p>
                              <button
                                onClick={() => handleCopy(variant.previewText, `${variant.id}-prev`)}
                                className="text-neutral-400 hover:text-brand p-1.5 rounded-lg border border-neutral-800 bg-neutral-900 shadow-sm shrink-0 transition-all active:scale-95 cursor-pointer"
                                title="Copy Preview Text"
                              >
                                {copiedId === `${variant.id}-prev` ? (
                                  <Check className="w-4 h-4 text-brand" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Strategy and rationale column */}
                        <div className="md:col-span-5 bg-neutral-950 rounded-xl p-4 border border-neutral-850 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-1.5 text-xs font-bold text-brand">
                              <Info className="w-3.5 h-3.5 stroke-[2]" />
                              <span className="text-neutral-400">PSYCHOLOGICAL HOOK</span>
                            </div>
                            <p className="text-xs text-neutral-300 leading-relaxed">
                              {variant.explanation}
                            </p>
                          </div>

                          {/* Quick details (Emojis/A-B testing ideas) */}
                          <div className="border-t border-neutral-850 pt-3.5 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-neutral-400">Best Matching Emojis:</span>
                              <div className="flex items-center space-x-1">
                                {variant.suggestedEmojis.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleCopy(emoji, `${variant.id}-${emoji}`)}
                                    className="bg-neutral-900 border border-neutral-800 hover:border-brand text-white w-6 h-6 rounded flex items-center justify-center text-xs transition-colors shadow-2xs cursor-pointer"
                                    title="Click to copy emoji"
                                  >
                                    {copiedId === `${variant.id}-${emoji}` ? "✓" : emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Instructions on setting up A/B testing */}
              <div className="bg-neutral-950 rounded-2xl border border-neutral-850 p-5 space-y-3 text-left">
                <h4 className="font-display font-semibold text-sm text-white flex items-center space-x-1.5">
                  <Sliders className="w-4 h-4 text-brand" />
                  <span>How to A/B test these variants in your email software:</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-400 leading-normal">
                  <div className="space-y-1">
                    <p className="font-semibold text-brand">1. Split your audience</p>
                    <p>Load your lists into Mailchimp, Klaviyo, HubSpot, etc. and configure an A/B test sent to 20-30% of your total recipients.</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-brand">2. Configure subject & preheader</p>
                    <p>Input Variant A and Variant B exactly as shown. Turn off other variables like send times to ensure accurate reporting.</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-brand">3. Set the winner criteria</p>
                    <p>Configure the system to wait 4-24 hours. The highest open-rate variant automatically wins and receives the remaining 70-80% payload.</p>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* Humble visual footer */}
      <footer className="bg-neutral-950 border-t border-neutral-850 py-6 px-6 text-center text-xs text-neutral-500 font-medium">
        <p>© 2026 Sign2Seal.co. Certified delivery notification optimization engine.</p>
      </footer>
    </div>
  );
}
