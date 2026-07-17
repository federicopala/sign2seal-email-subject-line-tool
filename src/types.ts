export interface FormInput {
  emailType: string;
  recipientSegment: string;
  topic: string;
  tone: string;
  includeEmojis: boolean;
  customEmailType: string;
  customSegment: string;
  customTone: string;
}

export interface CopyVariant {
  id: string;
  strategyName: string;
  strategyDescription: string;
  subjectLine: string;
  previewText: string;
  charCountSubject: number;
  charCountPreview: number;
  includeEmoji: boolean;
  suggestedEmojis: string[];
  explanation: string;
}

export interface GenerationResponse {
  variants: CopyVariant[];
  overallTips: string[];
}

export interface CampaignHistory {
  id: string;
  timestamp: string;
  input: FormInput;
  output: GenerationResponse;
}

export const EMAIL_TYPES = [
  { value: "welcome", label: "Welcome / Onboarding Email" },
  { value: "newsletter", label: "Newsletter / Weekly Digest" },
  { value: "nurturing", label: "Nurturing Email" },
  { value: "product_launch", label: "Product Update / Feature Release" },
  { value: "promotional", label: "Promotional Offer / Discount" },
  { value: "educational", label: "Educational / Content Share" },
  { value: "reengagement", label: "Re-engagement / Win-back" },
  { value: "event_webinar", label: "Event / Webinar Invitation" },
  { value: "feedback_survey", label: "Feedback / Survey Request" },
  { value: "custom", label: "Custom Email Type..." }
];

export const RECIPIENT_SEGMENTS = [
  { value: "new_leads", label: "New Leads (Cold/Warm)" },
  { value: "free_trial", label: "Free Trial Users" },
  { value: "active_customers", label: "Active Customers / Power Users" },
  { value: "inactive_users", label: "Inactive Customers / Dormant" },
  { value: "vip_buyers", label: "VIP Buyers / High-Value" },
  { value: "subscribers", label: "Newsletter Subscribers" },
  { value: "custom", label: "Custom Recipient Segment..." }
];

export const TONE_STYLES = [
  { value: "professional", label: "Professional & Trustworthy" },
  { value: "friendly", label: "Friendly & Casual" },
  { value: "bold_urgent", label: "Urgent & Bold" },
  { value: "curious", label: "Intriguing / Curiosity Gap" },
  { value: "humorous", label: "Humorous & Playful" },
  { value: "minimalist", label: "Minimalist & Direct" },
  { value: "custom", label: "Custom Tone..." }
];

export interface PresetExample {
  title: string;
  emailType: string;
  recipientSegment: string;
  topic: string;
  tone: string;
  includeEmojis: boolean;
}

export const PRESET_EXAMPLES: PresetExample[] = [
  {
    title: "✍️ Pending Signature Request",
    emailType: "reengagement",
    recipientSegment: "inactive_users",
    topic: "Action Required: Please digitally sign the pending Mutual NDA agreement for our consulting onboarding. Access link expires in 48 hours.",
    tone: "professional",
    includeEmojis: false
  },
  {
    title: "🔒 Cryptographic Seal Launch",
    emailType: "product_launch",
    recipientSegment: "active_customers",
    topic: "Introducing our new Blockchain-secured Audit Trail. Every document signed on Sign2Seal now gets a cryptographic hash permanently timestamped for multi-factor legality.",
    tone: "friendly",
    includeEmojis: true
  },
  {
    title: "⚡ Welcome Free Trial onboarding",
    emailType: "welcome",
    recipientSegment: "new_leads",
    topic: "Welcome to Sign2Seal! Secure your documents in under 60 seconds. Upload any PDF, apply your legally binding signature, and send with bank-grade security.",
    tone: "bold_urgent",
    includeEmojis: true
  }
];
