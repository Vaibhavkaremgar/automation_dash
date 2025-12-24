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
      {/* Santa GIF - Top Right */}
      {festival.name === 'Christmas' && (
        <img 
          src="https://media.giphy.com/media/3o6ZsZdNs3yE5l6hWM/giphy.gif" 
          alt="Santa" 
          className="absolute top-4 right-4 w-32 h-32 opacity-80"
          style={{ mixBlendMode: 'screen' }}
        />
      )}
      
      {/* Diwali Diya GIF */}
      {festival.name === 'Diwali' && (
        <img 
          src="https://media.giphy.com/media/l0HlDtKDqfGMZHHKo/giphy.gif" 
          alt="Diya" 
          className="absolute top-4 right-4 w-32 h-32 opacity-80"
        />
      )}
      
      {/* Holi Colors GIF */}
      {festival.name === 'Holi' && (
        <img 
          src="https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif" 
          alt="Holi" 
          className="absolute top-4 right-4 w-32 h-32 opacity-80"
        />
      )}
    </div>
  );
}
