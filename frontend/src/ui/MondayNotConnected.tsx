import React from "react";
import { useTheme } from "./ThemeContext";
import { useNavigation } from "./NavigationContext";

interface MondayNotConnectedProps {
  pageName: string;
}

export function MondayNotConnected({ pageName }: MondayNotConnectedProps) {
  const { theme } = useTheme();
  const { setView } = useNavigation();
  const isDark = theme === "dark";

  const handleNavigateToAdmin = (e: React.MouseEvent) => {
    e.preventDefault();
    setView("admin");
  };

  return (
    <div className={`min-h-[60vh] flex items-center justify-center p-8 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className={`max-w-2xl w-full ${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow-lg p-8`}>
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 rounded-full ${isDark ? "bg-yellow-900/20" : "bg-yellow-100"} flex items-center justify-center`}>
            <svg 
              className={`w-12 h-12 ${isDark ? "text-yellow-400" : "text-yellow-600"}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className={`text-2xl font-bold text-center mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Monday.com API Key Required
        </h2>

        {/* Main Message */}
        <div className={`text-center mb-6 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
          <p className="text-lg mb-2">
            You need to add your Monday.com API key to use the <strong>{pageName}</strong> page.
          </p>
          <p className="text-sm">
            Without an API connection, we cannot fetch or display data from Monday.com.
          </p>
        </div>

        {/* Instructions */}
        <div className={`${isDark ? "bg-gray-700/50" : "bg-blue-50"} rounded-lg p-6 mb-6`}>
          <h3 className={`font-semibold mb-3 ${isDark ? "text-blue-300" : "text-blue-900"}`}>
            📋 How to get your Monday.com API Key:
          </h3>
          <ol className={`space-y-2 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            <li className="flex items-start">
              <span className="font-bold mr-2">1.</span>
              <span>Log in to your <strong>Monday.com</strong> account</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">2.</span>
              <span>Click on your <strong>profile picture</strong> (top-right corner)</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">3.</span>
              <span>Select <strong>Developers → My Access Tokens</strong></span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">4.</span>
              <span>Click <strong>"Generate"</strong> or <strong>"Show"</strong> to reveal your Personal API Token</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">5.</span>
              <span>Copy the token</span>
            </li>
          </ol>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={handleNavigateToAdmin}
            className={`inline-flex items-center px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg`}
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
              />
            </svg>
            Go to Admin → Connect Monday.com
          </button>
        </div>

        {/* Additional Help */}
        <div className={`mt-6 text-center text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          <p>
            Need help? Check the{" "}
            <a 
              href="https://support.monday.com/hc/en-us/articles/360005144659-Does-monday-com-have-an-API-" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`underline ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
            >
              Monday.com API Documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

