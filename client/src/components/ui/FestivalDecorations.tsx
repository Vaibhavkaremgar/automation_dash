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
        background: `linear-gradient(135deg, ${festival.theme.colors.primary}05 0%, ${festival.theme.colors.secondary}05 50%, ${festival.theme.colors.accent}05 100%)`
      }}
    >
      <div className="festival-decoration-overlay" />
    </div>
  );
}
