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
      className="relative overflow-hidden border-b-2"
      style={{
        background: `linear-gradient(135deg, ${festival.theme.colors.primary}25 0%, ${festival.theme.colors.secondary}25 50%, ${festival.theme.colors.accent}25 100%)`,
        borderColor: festival.theme.colors.primary,
        boxShadow: `0 4px 12px ${festival.theme.colors.primary}40`
      }}
    >
      <div className="relative z-10 flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-4 flex-1">
          <div 
            className="w-12 h-12 rounded-full animate-pulse"
            style={{
              background: `radial-gradient(circle, ${festival.theme.colors.primary}, ${festival.theme.colors.secondary})`,
              boxShadow: `0 0 20px ${festival.theme.colors.primary}80`
            }}
          />
          <div>
            <h3 
              className="font-bold text-2xl"
              style={{ 
                color: festival.theme.colors.primary,
                textShadow: `0 0 10px ${festival.theme.colors.primary}80`
              }}
            >
              {festival.name}
            </h3>
            <p className="text-base text-white font-medium mt-1">{festival.theme.greeting}</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-2 hover:bg-slate-700/70 rounded-lg transition-colors border border-slate-600"
          aria-label="Dismiss"
        >
          <X className="w-6 h-6 text-slate-300" />
        </button>
      </div>
      
      {/* Animated border */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${festival.theme.colors.primary}, ${festival.theme.colors.secondary}, ${festival.theme.colors.accent}, ${festival.theme.colors.primary})`,
          backgroundSize: '200% 100%',
          animation: 'gradientShift 3s linear infinite'
        }}
      />
    </div>
  );
}
