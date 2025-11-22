import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const InputField: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${className}`}
      type="text" // Keep as text to allow commas during typing
      inputMode="decimal"
      {...props}
    />
  </div>
);

interface ChipGroupProps<T> {
  label: string;
  options: { label: string; value: T | null }[];
  selectedValue: T | null;
  isCustom: boolean;
  onSelect: (value: T | null, isCustom: boolean) => void;
  customInputValue: string;
  onCustomInputChange: (val: string) => void;
  customLabel?: string;
}

export const ChipGroup = <T extends number>({
  label,
  options,
  selectedValue,
  isCustom,
  onSelect,
  customInputValue,
  onCustomInputChange,
  customLabel = 'Значение',
}: ChipGroupProps<T>) => {
  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {options.map((opt, idx) => {
          const isSelected = !isCustom && selectedValue === opt.value;
          return (
            <button
              key={idx}
              onClick={() => onSelect(opt.value, false)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
        <button
          onClick={() => onSelect(null, true)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
            isCustom
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Другое
        </button>
      </div>
      {isCustom && (
        <InputField
          label={customLabel}
          value={customInputValue}
          onChange={(e) => onCustomInputChange(e.target.value)}
        />
      )}
    </div>
  );
};

interface ResultBoxProps {
  result: string;
}

export const ResultBox: React.FC<ResultBoxProps> = ({ result }) => {
  if (!result) return null;
  return (
    <div className="mt-6 p-4 bg-white rounded-lg shadow border border-gray-200">
      <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">{result}</pre>
    </div>
  );
};