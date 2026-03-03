import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { guideSections } from '../data/guideSections';

export default function Guide() {
  const { t } = useLanguage();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{t('guide.title')}</h1>
        <p className="page-description">{t('guide.description') || 'Learn how to use the system'}</p>
      </div>

      <div className="bg-card rounded-lg shadow border border-border">
        {guideSections.map((section, index) => (
          <div key={index} className="border-b border-border last:border-b-0">
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <span className="font-semibold text-lg text-foreground">{t(section.titleKey)}</span>
              {expandedIndex === index ? (
                <ChevronUp className="text-muted-foreground" />
              ) : (
                <ChevronDown className="text-muted-foreground" />
              )}
            </button>
            {expandedIndex === index && (
              <div className="px-6 pb-6">
                <p className="text-muted-foreground mb-4">{t(section.contentKey)}</p>
                <div className="space-y-2">
                  {section.steps.map((step, stepIndex) => (
                    <div key={stepIndex} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <span className="text-xs font-bold text-primary">{stepIndex + 1}</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
