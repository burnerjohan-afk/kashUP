import type { ReactNode } from 'react';
import { Card } from './ui/card';
import { HelpCircle } from 'lucide-react';

type HowItWorksProps = {
  title?: string;
  content: string | ReactNode;
};

export const HowItWorks = ({ title = 'Comment ça marche ?', content }: HowItWorksProps) => {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-ink mb-2">{title}</h3>
          <div className="text-sm text-ink/70 leading-relaxed">
            {typeof content === 'string' ? <p>{content}</p> : content}
          </div>
        </div>
      </div>
    </Card>
  );
};

