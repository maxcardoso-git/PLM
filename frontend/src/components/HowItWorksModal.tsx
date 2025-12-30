import { useState } from 'react';
import { X, HelpCircle, Lightbulb, Settings, ChevronRight } from 'lucide-react';

export interface HowItWorksSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export interface HowItWorksContent {
  title: string;
  subtitle: string;
  sections: HowItWorksSection[];
}

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: HowItWorksContent;
}

export function HowItWorksModal({ isOpen, onClose, content }: HowItWorksModalProps) {
  const [activeSection, setActiveSection] = useState(content.sections[0]?.id || '');

  if (!isOpen) return null;

  const currentSection = content.sections.find((s) => s.id === activeSection);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6bTAtMTZjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6bTE2IDE2YzAtMi4yMDktMS43OTEtNC00LTRzLTQgMS43OTEtNCA0IDEuNzkxIDQgNCA0IDQtMS43OTEgNC00em0tMzIgMGMwLTIuMjA5LTEuNzkxLTQtNC00cy00IDEuNzkxLTQgNCAxLjc5MSA0IDQgNCA0LTEuNzkxIDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl">
                <HelpCircle size={24} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">{content.title}</h2>
            </div>
            <p className="text-blue-100 ml-14">{content.subtitle}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 py-4 flex-shrink-0">
            <nav className="space-y-1 px-3">
              {content.sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    activeSection === section.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${
                    activeSection === section.id ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    {section.icon}
                  </div>
                  <span className="font-medium text-sm">{section.title}</span>
                  {activeSection === section.id && (
                    <ChevronRight size={16} className="ml-auto" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-8">
            {currentSection && (
              <div className="prose prose-blue max-w-none">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    {currentSection.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 m-0">{currentSection.title}</h3>
                </div>
                <div className="text-gray-600 leading-relaxed">
                  {currentSection.content}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
          >
            Entendi!
          </button>
        </div>
      </div>
    </div>
  );
}

// Button component to trigger the modal
interface HowItWorksButtonProps {
  onClick: () => void;
  variant?: 'default' | 'compact';
}

export function HowItWorksButton({ onClick, variant = 'default' }: HowItWorksButtonProps) {
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="Como funciona?"
      >
        <HelpCircle size={16} />
        <span>Ajuda</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl font-medium transition-colors border border-blue-200"
    >
      <HelpCircle size={18} />
      <span>Como Funciona?</span>
    </button>
  );
}

// Reusable content components for consistent styling
export function InfoCard({
  title,
  children,
  variant = 'default'
}: {
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'highlight';
}) {
  const variants = {
    default: 'bg-gray-50 border-gray-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
    highlight: 'bg-indigo-50 border-indigo-200',
  };

  return (
    <div className={`rounded-xl border p-4 ${variants[variant]}`}>
      <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
      <div className="text-sm text-gray-600">{children}</div>
    </div>
  );
}

export function FeatureList({ items }: { items: { icon?: React.ReactNode; text: string }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <div className="p-1 bg-green-100 text-green-600 rounded-lg mt-0.5">
            {item.icon || <ChevronRight size={14} />}
          </div>
          <span className="text-gray-700">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function ExampleBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-100">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={18} className="text-indigo-600" />
        <h4 className="font-semibold text-indigo-900">{title}</h4>
      </div>
      <div className="text-sm text-indigo-800">{children}</div>
    </div>
  );
}

export function RulesList({ rules }: { rules: string[] }) {
  return (
    <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
      <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
        <Settings size={16} />
        Regras Importantes
      </h4>
      <ul className="space-y-2">
        {rules.map((rule, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-amber-800">
            <span className="font-bold text-amber-600">{index + 1}.</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
