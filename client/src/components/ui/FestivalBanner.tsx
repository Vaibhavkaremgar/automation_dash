import { useEffect, useState } from 'react';
import { getCurrentFestival, Festival } from '../../utils/festivalThemes';
import { X } from 'lucide-react';

export default function FestivalBanner() {
  const [festival, setFestival] = useState<Festival | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const currentFestival = getCurrentFestival();
    setFestival(currentFestival);
    
    // Check if banner was dismissed today
    const dismissedDate = localStorage.getItem('festivalBannerDismissed');
    const today = new Date().toDateString();
    if (dismissedDate === today) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('festivalBannerDismissed', new Date().toDateString());
  };

  if (!festival || dismissed) return null;

  return (
    <div 
      className="relative overflow-hidden border-b border-slate-700/50"
      style={{
        background: `linear-gradient(135deg, ${festival.theme.colors.primary}15 0%, ${festival.theme.colors.secondary}15 50%, ${festival.theme.colors.accent}15 100%)`
      }}
    >
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-3xl animate-bounce">{festival.theme.emoji}</span>
          <div>
            <h3 
              className="font-semibold text-lg"
              style={{ color: festival.theme.colors.primary }}
            >
              {festival.name}
            </h3>
            <p className="text-sm text-slate-300">{festival.theme.greeting}</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-slate-700/50 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
