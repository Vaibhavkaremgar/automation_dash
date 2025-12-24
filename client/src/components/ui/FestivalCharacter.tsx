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
            src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f385.svg" 
            alt="Santa" 
            className="h-20 w-auto"
          />
        );
      case 'Diwali':
        return (
          <img 
            src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1fa94.svg" 
            alt="Diya" 
            className="h-16 w-auto"
          />
        );
      case 'Holi':
        return (
          <img 
            src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f3a8.svg" 
            alt="Holi" 
            className="h-20 w-auto"
          />
        );
      case 'Eid ul-Fitr':
      case 'Eid ul-Adha':
        return (
          <img 
            src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f54c.svg" 
            alt="Mosque" 
            className="h-20 w-auto"
          />
        );
      case 'Ganesh Chaturthi':
        return (
          <img 
            src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f418.svg" 
            alt="Elephant" 
            className="h-20 w-auto"
          />
        );
      case 'Navratri':
        return (
          <img 
            src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f483.svg" 
            alt="Dancer" 
            className="h-20 w-auto"
          />
        );
      case 'Easter':
        return (
          <img 
            src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f430.svg" 
            alt="Bunny" 
            className="h-18 w-auto"
          />
        );
      case 'New Year':
        return (
          <img 
            src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f389.svg" 
            alt="Party" 
            className="h-20 w-auto"
          />
        );
      case 'Raksha Bandhan':
        return (
          <img 
            src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f380.svg" 
            alt="Ribbon" 
            className="h-16 w-auto"
          />
        );
      case 'Janmashtami':
        return (
          <img 
            src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f99a.svg" 
            alt="Peacock" 
            className="h-20 w-auto"
          />
        );
      case 'Dussehra':
        return (
          <img 
            src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f3f9.svg" 
            alt="Bow" 
            className="h-20 w-auto"
          />
        );
      default:
        return (
          <div className="text-5xl">{festival.theme.emoji}</div>
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
