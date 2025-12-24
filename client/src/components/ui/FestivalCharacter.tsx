import { useEffect, useState } from 'react';
import { getCurrentFestivalTheme, Festival } from '../../utils/festivalThemes';

export default function FestivalCharacter() {
  const [festival, setFestival] = useState<Festival | null>(null);

  useEffect(() => {
    const currentFestival = getCurrentFestivalTheme();
    setFestival(currentFestival);
  }, []);

  if (!festival) return null;

  const getCharacter = () => {
    switch (festival.name) {
      case 'Christmas':
        return '🎅🦌'; // Santa with reindeer
      case 'Diwali':
        return '🪔✨'; // Diya with sparkles
      case 'Holi':
        return '🎨🎉'; // Colors and celebration
      case 'Eid ul-Fitr':
      case 'Eid ul-Adha':
        return '🌙⭐'; // Moon and star
      case 'Ganesh Chaturthi':
        return '🐘🌺'; // Elephant and flower
      case 'Navratri':
        return '💃🪔'; // Dancer and diya
      case 'Easter':
        return '🐰🥚'; // Bunny and egg
      case 'New Year':
        return '🎉🎊'; // Party celebration
      default:
        return festival.theme.emoji + '✨';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 pointer-events-none z-50 overflow-hidden">
      <div 
        className="absolute bottom-4 text-5xl"
        style={{
          animation: 'slideCharacter 20s linear infinite',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
        }}
      >
        {getCharacter()}
      </div>
    </div>
  );
}
