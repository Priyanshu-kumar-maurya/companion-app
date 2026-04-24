import React, { useState } from "react";

const faqs = [
    ["How do I rent a companion?", "Register as a Boy user, browse the Find page, select a companion, view their details, and click Rent Now. You pay per hour securely within the app."],
    ["Is my personal information safe?", "Absolutely. We use end-to-end encryption. Your personal data, calls, and chats are never made public. Recordings are stored only for safety review if disputes arise."],
    ["Why are calls and chats recorded?", "Recording is for the safety of both parties. If any harassment or inappropriate behavior occurs, we have evidence to take action. No recordings are ever shared publicly."],
    ["How does the rating system work?", "After each session, both parties can rate each other out of 5 stars and leave a written review. This helps maintain quality and trust in the community."],
    ["What if I experience harassment?", "Report immediately using the Report button in any chat or profile. Our safety team reviews all reports within 24 hours. Violators are permanently banned."],
    ["Can girls reject a booking?", "Yes. Girls have full control over who they accept. They can decline any booking request without explanation."],
    ["What activities are allowed?", "Coffee dates, movies, shopping, studying, walking, attending events, and other public activities. Physical intimacy is strictly prohibited."],
    ["How do payments work?", "You pay per hour, in advance, via the app. If a session is cancelled more than 2 hours in advance, you get a full refund."],
];

function HelpPage() {
    const [openIndex, setOpenIndex] = useState(null);

    return (
        <div className="pt-16 min-h-[100dvh]">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-3">
                        Help{" "}
                        <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                            Center
                        </span>
                    </h1>
                    <p className="text-gray-400 text-sm">Find answers to common questions</p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-10">
                    {[
                        ["📋", "Getting Started"],
                        ["💳", "Payments"],
                        ["🛡️", "Safety"],
                        ["⭐", "Reviews"],
                        ["📞", "Support"],
                        ["🚫", "Report Issue"],
                    ].map(([icon, label]) => (
                        <div
                            key={label}
                            className="bg-[#16162A] border border-white/5 rounded-xl p-3 text-center cursor-pointer hover:border-pink-500/30 transition"
                        >
                            <div className="text-2xl mb-1">{icon}</div>
                            <div className="text-xs text-gray-400">{label}</div>
                        </div>
                    ))}
                </div>

                <h3 className="text-xl font-bold mb-4">Frequently Asked Questions</h3>

                <div className="space-y-3">
                    {faqs.map(([q, a], i) => (
                        <div
                            key={i}
                            className="bg-[#16162A] border border-white/5 rounded-xl overflow-hidden"
                        >
                            <button
                                className="w-full flex justify-between items-center px-5 py-4 text-left font-medium text-sm hover:bg-pink-500/5 transition"
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                            >
                                <span>{q}</span>
                                <span
                                    className={`text-pink-400 text-xl transition-transform duration-200 ${openIndex === i ? "rotate-45" : ""
                                        }`}
                                >
                                    +
                                </span>
                            </button>
                            {openIndex === i && (
                                <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">
                                    {a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-10 bg-[#16162A] border border-white/5 rounded-2xl p-8 text-center">
                    <div className="text-3xl mb-3">📧</div>
                    <h4 className="text-base font-semibold mb-2">Still need help?</h4>
                    <p className="text-sm text-gray-400 mb-5">Our support team is available 24/7</p>
                    <button className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-semibold text-sm hover:opacity-90 transition">
                        Contact Support
                    </button>
                </div>
            </div>

            <footer className="border-t border-white/5 py-10 text-center text-gray-500 text-sm">
                <p>💞 RentGF — Safe, Verified & Respectful Companionship</p>
                <p className="mt-2 text-xs">© 2026 RentGF. All rights reserved.</p>
            </footer>
        </div>
    );
}

export default HelpPage;