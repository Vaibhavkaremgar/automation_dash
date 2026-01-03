# Logo & Branding Update Guide

## 📁 Logo Upload Location

To update Joban's logo, replace the file at:
```
client/public/logos/joban_putra.jpg
```

**Important:** Keep the same filename `joban_putra.jpg` so the system automatically picks it up.

## 🎨 Name Colors (Already Updated)

The company name now displays with custom colors:
- **"Jobanputra's"** → Blue (`text-blue-500`)
- **"Insurance Shoppe"** → Parrot Green (`text-green-400`)

## 📍 Files Modified

1. **Sidebar.tsx** - Desktop sidebar with logo and colored company name
2. **MobileSidebar.tsx** - Mobile sidebar (uses different logo source)

## 🔄 How to Update Logo

1. Save your new logo as `joban_putra.jpg`
2. Replace the file in `client/public/logos/joban_putra.jpg`
3. Refresh the browser (Ctrl+F5 for hard refresh)

## 🎨 Color Customization

If you need to adjust the colors:
- Blue: `text-blue-500` (can change to `text-blue-400`, `text-blue-600`, etc.)
- Green: `text-green-400` (can change to `text-green-500`, `text-emerald-400`, etc.)

Location: `client/src/components/layout/Sidebar.tsx` (lines with "Jobanputra's" and "Insurance Shoppe")
