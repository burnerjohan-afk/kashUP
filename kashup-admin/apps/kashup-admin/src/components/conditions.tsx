import { Card } from './ui/card';
import { FileText } from 'lucide-react';

type ConditionsProps = {
  conditions: string;
  title?: string;
};

export const Conditions = ({ conditions, title = 'Les conditions' }: ConditionsProps) => {
  if (!conditions) return null;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-ink mb-2">{title}</h3>
          <div className="text-sm text-ink/70 leading-relaxed whitespace-pre-line">
            {conditions}
          </div>
        </div>
      </div>
    </Card>
  );
};

