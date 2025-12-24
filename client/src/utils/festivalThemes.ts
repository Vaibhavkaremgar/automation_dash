// Festival Theme System - Auto-detects and applies festival themes
export interface Festival {
  name: string;
  startDate: string; // MM-DD format
  endDate: string; // MM-DD format
  theme: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    emoji: string;
    greeting: string;
    decoration: 'fireworks' | 'flowers' | 'lights' | 'stars' | 'none';
  };
}

export const festivals: Festival[] = [
  // Hindu Festivals
  {
    name: 'Diwali',
    startDate: '10-24', // Approximate - varies yearly
    endDate: '10-28',
    theme: {
      colors: { primary: '#FF6B35', secondary: '#F7931E', accent: '#FDB913' },
      emoji: '🪔',
      greeting: 'Happy Diwali! Wishing you prosperity and joy!',
      decoration: 'lights'
    }
  },
  {
    name: 'Holi',
    startDate: '03-08', // Approximate - varies yearly
    endDate: '03-09',
    theme: {
      colors: { primary: '#FF1493', secondary: '#00CED1', accent: '#FFD700' },
      emoji: '🎨',
      greeting: 'Happy Holi! May your life be filled with colors!',
      decoration: 'flowers'
    }
  },
  {
    name: 'Dussehra',
    startDate: '10-12', // Approximate - varies yearly
    endDate: '10-13',
    theme: {
      colors: { primary: '#DC143C', secondary: '#FFD700', accent: '#FF8C00' },
      emoji: '🏹',
      greeting: 'Happy Dussehra! Victory of good over evil!',
      decoration: 'fireworks'
    }
  },
  {
    name: 'Ganesh Chaturthi',
    startDate: '09-07', // Approximate - varies yearly
    endDate: '09-17',
    theme: {
      colors: { primary: '#FF6347', secondary: '#FFD700', accent: '#FF69B4' },
      emoji: '🐘',
      greeting: 'Ganpati Bappa Morya! Wishing you blessings!',
      decoration: 'flowers'
    }
  },
  {
    name: 'Navratri',
    startDate: '10-03', // Approximate - varies yearly
    endDate: '10-11',
    theme: {
      colors: { primary: '#FF1493', secondary: '#FFD700', accent: '#00CED1' },
      emoji: '💃',
      greeting: 'Happy Navratri! Nine nights of celebration!',
      decoration: 'lights'
    }
  },
  {
    name: 'Makar Sankranti',
    startDate: '01-14',
    endDate: '01-15',
    theme: {
      colors: { primary: '#FF8C00', secondary: '#FFD700', accent: '#87CEEB' },
      emoji: '🪁',
      greeting: 'Happy Makar Sankranti! Harvest festival joy!',
      decoration: 'stars'
    }
  },
  {
    name: 'Raksha Bandhan',
    startDate: '08-19', // Approximate - varies yearly
    endDate: '08-19',
    theme: {
      colors: { primary: '#FF69B4', secondary: '#FFD700', accent: '#FF6347' },
      emoji: '🎀',
      greeting: 'Happy Raksha Bandhan! Bond of love and protection!',
      decoration: 'flowers'
    }
  },
  {
    name: 'Janmashtami',
    startDate: '08-26', // Approximate - varies yearly
    endDate: '08-27',
    theme: {
      colors: { primary: '#4169E1', secondary: '#FFD700', accent: '#FF69B4' },
      emoji: '🦚',
      greeting: 'Happy Janmashtami! Celebrating Lord Krishna!',
      decoration: 'lights'
    }
  },

  // Muslim Festivals
  {
    name: 'Eid ul-Fitr',
    startDate: '04-10', // Approximate - varies yearly (lunar calendar)
    endDate: '04-12',
    theme: {
      colors: { primary: '#00A86B', secondary: '#FFD700', accent: '#FFFFFF' },
      emoji: '🌙',
      greeting: 'Eid Mubarak! May this day bring peace and happiness!',
      decoration: 'stars'
    }
  },
  {
    name: 'Eid ul-Adha',
    startDate: '06-16', // Approximate - varies yearly (lunar calendar)
    endDate: '06-19',
    theme: {
      colors: { primary: '#228B22', secondary: '#FFD700', accent: '#FFFFFF' },
      emoji: '🕌',
      greeting: 'Eid Mubarak! Wishing you blessings and joy!',
      decoration: 'stars'
    }
  },
  {
    name: 'Ramadan',
    startDate: '03-11', // Approximate - varies yearly (lunar calendar)
    endDate: '04-09',
    theme: {
      colors: { primary: '#2E8B57', secondary: '#FFD700', accent: '#F0E68C' },
      emoji: '🌙',
      greeting: 'Ramadan Mubarak! Month of blessings!',
      decoration: 'stars'
    }
  },
  {
    name: 'Muharram',
    startDate: '07-19', // Approximate - varies yearly (lunar calendar)
    endDate: '07-28',
    theme: {
      colors: { primary: '#2F4F4F', secondary: '#696969', accent: '#FFFFFF' },
      emoji: '🕌',
      greeting: 'Muharram Mubarak! Islamic New Year!',
      decoration: 'none'
    }
  },

  // Christian Festivals
  {
    name: 'Christmas',
    startDate: '12-24',
    endDate: '12-26',
    theme: {
      colors: { primary: '#DC143C', secondary: '#228B22', accent: '#FFD700' },
      emoji: '🎄',
      greeting: 'Merry Christmas! Peace and joy to all!',
      decoration: 'stars'
    }
  },
  {
    name: 'Easter',
    startDate: '03-31', // Approximate - varies yearly
    endDate: '04-01',
    theme: {
      colors: { primary: '#FFB6C1', secondary: '#98FB98', accent: '#FFD700' },
      emoji: '🐣',
      greeting: 'Happy Easter! Resurrection and new beginnings!',
      decoration: 'flowers'
    }
  },
  {
    name: 'Good Friday',
    startDate: '03-29', // Approximate - varies yearly
    endDate: '03-29',
    theme: {
      colors: { primary: '#8B4513', secondary: '#D2691E', accent: '#FFFFFF' },
      emoji: '✝️',
      greeting: 'Good Friday - Day of reflection and prayer',
      decoration: 'none'
    }
  },
  {
    name: 'New Year',
    startDate: '12-31',
    endDate: '01-02',
    theme: {
      colors: { primary: '#FFD700', secondary: '#FF69B4', accent: '#00CED1' },
      emoji: '🎉',
      greeting: 'Happy New Year! Wishing you success and happiness!',
      decoration: 'fireworks'
    }
  }
];

export function getCurrentFestival(): Festival | null {
  const today = new Date();
  const currentDate = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  for (const festival of festivals) {
    if (isDateInRange(currentDate, festival.startDate, festival.endDate)) {
      return festival;
    }
  }
  
  return null;
}

export function getCurrentFestivalTheme(): Festival | null {
  const today = new Date();
  const currentDate = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  for (const festival of festivals) {
    // Show theme 2 days before and 2 days after festival
    const extendedStart = subtractDays(festival.startDate, 2);
    const extendedEnd = addDays(festival.endDate, 2);
    
    if (isDateInRange(currentDate, extendedStart, extendedEnd)) {
      return festival;
    }
  }
  
  return null;
}

function addDays(dateStr: string, days: number): string {
  const [month, day] = dateStr.split('-').map(Number);
  const date = new Date(2024, month - 1, day);
  date.setDate(date.getDate() + days);
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function subtractDays(dateStr: string, days: number): string {
  const [month, day] = dateStr.split('-').map(Number);
  const date = new Date(2024, month - 1, day);
  date.setDate(date.getDate() - days);
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isDateInRange(current: string, start: string, end: string): boolean {
  const [currentMonth, currentDay] = current.split('-').map(Number);
  const [startMonth, startDay] = start.split('-').map(Number);
  const [endMonth, endDay] = end.split('-').map(Number);
  
  const currentValue = currentMonth * 100 + currentDay;
  const startValue = startMonth * 100 + startDay;
  const endValue = endMonth * 100 + endDay;
  
  // Handle year wrap-around (e.g., Dec 31 to Jan 2)
  if (startValue > endValue) {
    return currentValue >= startValue || currentValue <= endValue;
  }
  
  return currentValue >= startValue && currentValue <= endValue;
}

export function getFestivalStyles(festival: Festival | null) {
  if (!festival) return null;
  
  return {
    '--festival-primary': festival.theme.colors.primary,
    '--festival-secondary': festival.theme.colors.secondary,
    '--festival-accent': festival.theme.colors.accent,
  } as React.CSSProperties;
}
