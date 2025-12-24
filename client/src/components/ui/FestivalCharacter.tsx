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
        return (
          <img 
            src="https://cdn-icons-png.flaticon.com/512/2913/2913133.png" 
            alt="Santa Sleigh" 
            className="h-20 w-auto"
          />
        );
      case 'Diwali':
        return (
          <img 
            src="https://cdn-icons-png.flaticon.com/512/2917/2917995.png" 
            alt="Diwali Diya" 
            className="h-16 w-auto"
          />
        );
      case 'Holi':
        return (
          <img 
            src="https://cdn-icons-png.flaticon.com/512/3242/3242257.png" 
            alt="Holi Colors" 
            className="h-20 w-auto"
          />
        );
      case 'Eid ul-Fitr':
      case 'Eid ul-Adha':
        return (
          <img 
            src="https://cdn-icons-png.flaticon.com/512/3242/3242452.png" 
            alt="Eid Mosque" 
            className="h-20 w-auto"
          />
        );
      case 'Ganesh Chaturthi':
        return (
          <img 
            src="https://cdn-icons-png.flaticon.com/512/2917/2917777.png" 
            alt="Ganesha" 
            className="h-20 w-auto"
          />
        );
      case 'Navratri':
        return (
          <img 
            src="https://cdn-icons-png.flaticon.com/512/3242/3242310.png" 
            alt="Navratri Dancer" 
            className="h-20 w-auto"
          />
        );
      case 'Easter':
        return (
          <img 
            src="https://cdn-icons-png.flaticon.com/512/2913/2913145.png" 
            alt="Easter Bunny" 
            className="h-18 w-auto"
          />
        );
      case 'New Year':
        return (
          <img 
            src="https://cdn-icons-png.flaticon.com/512/3242/3242082.png" 
            alt="New Year Celebration" 
            className="h-20 w-auto"
          />
        );
      case 'Raksha Bandhan':
        return (
          <img 
            src="https://cdn-icons-png.flaticon.com/512/3242/3242336.png" 
            alt="Rakhi" 
            className="h-16 w-auto"
          />
        );
      case 'Janmashtami':
        return (
          <img 
            src="https://cdn-icons-png.flaticon.com/512/2917/2917826.png" 
            alt="Krishna" 
            className="h-20 w-auto"
          />
        );
      case 'Dussehra':
        return (
          <img 
            src="https://cdn-icons-png.flaticon.com/512/3242/3242289.png" 
            alt="Dussehra" 
            className="h-20 w-auto"
          />
        );
      default:
        return (
          <div className="flex items-center gap-2">
            <span className="text-5xl">{festival.theme.emoji}</span>
          </div>
        );
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 pointer-events-none z-50 overflow-hidden">
      <div 
        className="absolute bottom-4"
        style={{
          animation: 'slideCharacter 20s linear infinite',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
        }}
      >
        {getCharacter()}
      </div>
    </div>
  );
}
