import React from "react";
import { FiAlertTriangle, FiRefreshCw, FiHome, FiChevronDown } from "react-icons/fi";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Coffeely ErrorBoundary caught an unhandled render error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = "/";
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 bg-[#0D0D1A] text-white">
          <div className="w-full max-w-md bg-[#16162A]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
            {/* Ambient Background Aura */}
            <div className="absolute -top-16 -left-16 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Glowing Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-pink-500/20 via-purple-500/20 to-indigo-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-lg">
              <FiAlertTriangle size={32} className="animate-pulse" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">
              Oops! Kuch samasya aayi
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mb-6 leading-relaxed">
              Don't worry, your profile and chats are completely safe. A temporary display issue occurred.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f9ce3f] via-[#e1306c] to-[#833ab4] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 hover:opacity-95 active:scale-95 transition"
              >
                <FiRefreshCw size={14} /> Refresh App
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-bold flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition"
              >
                <FiHome size={14} /> Go to Home
              </button>
            </div>

            {/* Collapsible Error Debug Details */}
            {process.env.NODE_ENV !== "production" && this.state.error && (
              <details className="text-left text-[11px] text-gray-500 bg-black/40 rounded-xl p-3 border border-white/5 cursor-pointer">
                <summary className="font-semibold text-gray-400 flex items-center justify-between outline-none">
                  <span>Diagnostic Info</span>
                  <FiChevronDown size={14} />
                </summary>
                <pre className="mt-2 text-rose-400 overflow-x-auto whitespace-pre-wrap font-mono">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
