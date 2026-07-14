import React, { useState } from "react";
import { FiArrowLeft, FiShield, FiFileText, FiAlertTriangle, FiAlertOctagon, FiMapPin, FiLock } from "react-icons/fi";

function LegalPages({ setPage, initialTab = "terms" }) {
    const [activeTab, setActiveTab] = useState(initialTab);

    const tabs = [
        { id: "terms", label: "Terms of Service", icon: <FiFileText size={14} /> },
        { id: "privacy", label: "Privacy Policy", icon: <FiShield size={14} /> },
        { id: "safety", label: "Safety Guidelines", icon: <FiAlertTriangle size={14} /> },
    ];

    return (
        <div className="min-h-[100dvh] bg-[#0D0D1A] pb-20">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-[#0D0D1A]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center gap-3">
                    <button onClick={() => setPage("HOME")} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition">
                        <FiArrowLeft size={18} />
                    </button>
                    <h1 className="font-bold text-white text-lg">Legal & Safety</h1>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-3xl mx-auto px-4 mt-4">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                                activeTab === tab.id
                                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow'
                                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                            }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 mt-6">
                <div className="bg-[#16162A] rounded-2xl border border-white/5 p-6 sm:p-8">
                    {activeTab === "terms" && <TermsContent />}
                    {activeTab === "privacy" && <PrivacyContent />}
                    {activeTab === "safety" && <SafetyContent />}
                </div>

                <div className="text-center mt-6 text-gray-600 text-xs">
                    Last updated: July 2026 · RentGF Platform
                </div>
            </div>
        </div>
    );
}

function TermsContent() {
    return (
        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
            <div>
                <h2 className="text-xl font-bold text-white mb-2">Terms of Service</h2>
                <p className="text-gray-500 text-xs">Effective Date: July 1, 2026</p>
            </div>

            <Section title="1. Acceptance of Terms">
                By accessing or using RentGF ("Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform. RentGF is a companion connection platform — it is NOT an escort service or dating service. We facilitate platonic companionship for social events, conversations, and activities.
            </Section>

            <Section title="2. Eligibility">
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>You must be at least <b className="text-white">18 years old</b> to use this Platform</li>
                    <li>You must provide accurate, truthful information during registration</li>
                    <li>You must have a valid email address and phone number</li>
                    <li>You must comply with all applicable laws in your jurisdiction</li>
                </ul>
            </Section>

            <Section title="3. User Accounts">
                You are responsible for maintaining the confidentiality of your login credentials. You agree to immediately notify us of any unauthorized use of your account. RentGF is not liable for any loss arising from unauthorized use of your account.
            </Section>

            <Section title="4. Companion Services">
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>All meetings must occur in <b className="text-white">public places</b></li>
                    <li>Companions are independent individuals, NOT employees of RentGF</li>
                    <li>RentGF does not guarantee the quality, safety, or outcome of any meeting</li>
                    <li>Any form of illegal activity is strictly prohibited</li>
                    <li>Both parties must consent to the meeting terms</li>
                </ul>
            </Section>

            <Section title="5. Payments & Refunds">
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>All payments are processed through our secure payment gateway</li>
                    <li>RentGF charges a platform fee on each transaction</li>
                    <li>Refunds are processed for cancelled bookings as per our refund policy</li>
                    <li>Companions receive payment after successful completion of meetings</li>
                </ul>
            </Section>

            <Section title="6. Prohibited Conduct">
                Users must NOT:
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Harass, threaten, or abuse any user</li>
                    <li>Upload inappropriate, offensive, or illegal content</li>
                    <li>Create fake accounts or impersonate others</li>
                    <li>Use the platform for any illegal purposes</li>
                    <li>Attempt to circumvent platform payments</li>
                    <li>Share personal contact details to avoid platform fees</li>
                </ul>
            </Section>

            <Section title="7. Account Termination">
                RentGF reserves the right to suspend or terminate accounts that violate these terms, without prior notice. Users may also delete their own accounts at any time through the Settings page.
            </Section>

            <Section title="8. Limitation of Liability">
                RentGF is provided "as is" without warranties. We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the Platform.
            </Section>

            <Section title="9. Contact Us">
                For questions about these Terms, contact us at: <a href="mailto:support@rentgf.com" className="text-pink-400 underline">support@rentgf.com</a>
            </Section>
        </div>
    );
}

function PrivacyContent() {
    return (
        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
            <div>
                <h2 className="text-xl font-bold text-white mb-2">Privacy Policy</h2>
                <p className="text-gray-500 text-xs">Effective Date: July 1, 2026</p>
            </div>

            <Section title="1. Information We Collect">
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li><b className="text-white">Personal Information:</b> Name, email, phone number, age, city</li>
                    <li><b className="text-white">Profile Data:</b> Profile pictures, bio, tags, social links</li>
                    <li><b className="text-white">KYC Documents:</b> Government ID proof (encrypted & stored securely)</li>
                    <li><b className="text-white">Usage Data:</b> Login times, device info, IP address</li>
                    <li><b className="text-white">Chat Messages:</b> Stored for platform safety and dispute resolution</li>
                    <li><b className="text-white">Location Data:</b> Only when SOS feature is used (with your permission)</li>
                </ul>
            </Section>

            <Section title="2. How We Use Your Information">
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>To create and manage your account</li>
                    <li>To facilitate companion bookings</li>
                    <li>To verify identity (KYC)</li>
                    <li>To send OTP and notifications</li>
                    <li>To improve platform safety and prevent fraud</li>
                    <li>To resolve disputes between users</li>
                </ul>
            </Section>

            <Section title="3. Data Storage & Security">
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>All data is stored on secure, encrypted servers</li>
                    <li>Passwords are hashed using bcrypt (12 rounds)</li>
                    <li>JWT tokens expire after 7 days</li>
                    <li>KYC documents are stored on Cloudinary with restricted access</li>
                    <li>We use HTTPS/SSL for all data transmission</li>
                </ul>
            </Section>

            <Section title="4. Data Sharing">
                We do NOT sell your personal data. We may share limited information:
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>With other users (public profile info only)</li>
                    <li>With payment processors (for transactions)</li>
                    <li>With law enforcement (if legally required)</li>
                </ul>
            </Section>

            <Section title="5. Your Rights">
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li><b className="text-white">Access:</b> Request a copy of your data</li>
                    <li><b className="text-white">Correction:</b> Update your information via Settings</li>
                    <li><b className="text-white">Deletion:</b> Delete your account and all data permanently</li>
                    <li><b className="text-white">Opt-out:</b> Disable notifications in Settings</li>
                </ul>
            </Section>

            <Section title="6. Cookies">
                We use essential cookies and localStorage for authentication (JWT token). We do not use third-party tracking cookies.
            </Section>

            <Section title="7. Contact">
                Privacy concerns? Contact our Data Protection Officer at: <a href="mailto:privacy@rentgf.com" className="text-pink-400 underline">privacy@rentgf.com</a>
            </Section>
        </div>
    );
}

function SafetyContent() {
    return (
        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
            <div>
                <h2 className="text-xl font-bold text-white mb-2">Safety Guidelines</h2>
                <p className="text-gray-500 text-xs">Your safety is our #1 priority</p>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <h3 className="text-red-400 font-bold text-sm mb-2 flex items-center gap-1.5">
                    <FiAlertOctagon size={16} /> Emergency Numbers
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><b className="text-white">Police:</b> <a href="tel:112" className="text-red-400">112</a></div>
                    <div><b className="text-white">Women Helpline:</b> <a href="tel:1091" className="text-red-400">1091</a></div>
                    <div><b className="text-white">Cyber Crime:</b> <a href="tel:1930" className="text-red-400">1930</a></div>
                    <div><b className="text-white">Child Helpline:</b> <a href="tel:1098" className="text-red-400">1098</a></div>
                </div>
            </div>

            <Section title={<span className="flex items-center gap-1.5"><FiMapPin className="text-pink-500" /> Before Meeting</span>}>
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Always meet in a <b className="text-white">public place</b> (café, mall, restaurant)</li>
                    <li>Share your <b className="text-white">location</b> with a trusted friend or family</li>
                    <li>Set up <b className="text-white">Emergency Contacts</b> in SOS settings</li>
                    <li>Verify the companion's <b className="text-white">KYC badge</b> on their profile</li>
                    <li>Read their <b className="text-white">reviews</b> from other users</li>
                    <li>Never share personal financial information</li>
                </ul>
            </Section>

            <Section title={<span className="flex items-center gap-1.5"><FiShield className="text-pink-500" /> During Meeting</span>}>
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Stay in public areas at all times</li>
                    <li>Keep your phone charged and accessible</li>
                    <li>Use the <b className="text-white">SOS button</b> if you feel unsafe</li>
                    <li>Don't consume food/drinks left unattended</li>
                    <li>Trust your instincts — leave if uncomfortable</li>
                </ul>
            </Section>

            <Section title={<span className="flex items-center gap-1.5"><FiAlertTriangle className="text-pink-500" /> What to Report</span>}>
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Harassment or threatening behavior</li>
                    <li>Requests for illegal activities</li>
                    <li>Fake profiles or impersonation</li>
                    <li>Inappropriate content or messages</li>
                    <li>Payment fraud or scams</li>
                </ul>
                <p className="mt-2 text-pink-400 text-xs font-bold">Use the Report button on any profile or the SOS feature for emergencies.</p>
            </Section>

            <Section title={<span className="flex items-center gap-1.5"><FiLock className="text-pink-500" /> Account Security</span>}>
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Use a strong, unique password</li>
                    <li>Never share your OTP with anyone</li>
                    <li>Verify your email for account recovery</li>
                    <li>Log out from shared devices</li>
                    <li>Enable KYC verification for trust</li>
                </ul>
            </Section>

            <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-4 text-center">
                <p className="text-pink-300 text-xs font-bold">Remember: RentGF is for platonic companionship only.</p>
                <p className="text-gray-500 text-[10px] mt-1">Any misuse will result in permanent account ban.</p>
            </div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div>
            <h3 className="text-white font-bold text-sm mb-2">{title}</h3>
            <div className="text-gray-400 text-sm">{children}</div>
        </div>
    );
}

export default LegalPages;
