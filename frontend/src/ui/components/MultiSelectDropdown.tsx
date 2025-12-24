import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../ThemeContext";

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  className = "",
}: MultiSelectDropdownProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const removeOption = (option: string) => {
    onChange(selected.filter((s) => s !== option));
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Selected Items Display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`min-h-[42px] px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
          isDark
            ? "bg-gray-800 border-gray-600 text-white hover:border-gray-500"
            : "bg-white border-gray-300 text-gray-900 hover:border-gray-400"
        } ${isOpen ? "ring-2 ring-blue-500" : ""}`}
      >
        {selected.length === 0 ? (
          <span className={isDark ? "text-gray-400" : "text-gray-500"}>
            {placeholder}
          </span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selected.map((item) => (
              <span
                key={item}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${
                  isDark
                    ? "bg-blue-900 text-blue-200"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {item}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(item);
                  }}
                  className={`hover:text-red-500 transition-colors`}
                  aria-label={`Remove ${item}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1 w-full rounded-lg border shadow-lg ${
            isDark
              ? "bg-gray-800 border-gray-600"
              : "bg-white border-gray-300"
          }`}
        >
          {/* Search Input */}
          <div className="p-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className={`w-full px-3 py-2 rounded border ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div
                className={`px-4 py-3 text-sm ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option);
                return (
                  <div
                    key={option}
                    onClick={() => toggleOption(option)}
                    className={`px-4 py-2 cursor-pointer flex items-center gap-2 transition-colors ${
                      isDark
                        ? "hover:bg-gray-700"
                        : "hover:bg-gray-100"
                    } ${
                      isSelected
                        ? isDark
                          ? "bg-blue-900/30"
                          : "bg-blue-50"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by parent div
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span
                      className={`text-sm ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {option}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          {selected.length > 0 && (
            <div
              className={`p-2 border-t ${
                isDark ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
                className={`text-sm px-3 py-1 rounded transition-colors ${
                  isDark
                    ? "text-red-400 hover:bg-red-900/20"
                    : "text-red-600 hover:bg-red-50"
                }`}
              >
                Clear All ({selected.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

