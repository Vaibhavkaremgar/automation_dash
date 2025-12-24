import { useEffect, useState } from 'react';
import { getCurrentFestivalTheme, Festival } from '../../utils/festivalThemes';

export default function FestivalDecorations() {
  const [festival, setFestival] = useState<Festival | null>(null);

  useEffect(() => {
    const currentFestival = getCurrentFestivalTheme();
    setFestival(currentFestival);
  }, []);

  if (!festival) return null;

  const getDecorationClass = () => {
    switch (festival.theme.decoration) {
      case 'fireworks': return 'festival-fireworks';
      case 'flowers': return 'festival-flowers';
      case 'lights': return 'festival-lights';
      case 'stars': return 'festival-stars';
      default: return '';
    }
  };

  return (
    <div 
      className={`fixed inset-0 pointer-events-none z-0 ${getDecorationClass()}`}
      style={{
        background: `linear-gradient(135deg, ${festival.theme.colors.primary}08 0%, ${festival.theme.colors.secondary}08 50%, ${festival.theme.colors.accent}08 100%)`
      }}
    >
      {/* Floating festival particles */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute text-2xl opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `floatParticle ${5 + Math.random() * 5}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          >
            {festival.theme.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}
