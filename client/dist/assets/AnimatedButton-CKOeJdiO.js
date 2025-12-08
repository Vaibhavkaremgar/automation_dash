import{j as i,m as s}from"./index-bX46kkdq.js";function l({children:o,onClick:r,disabled:e=!1,variant:t="primary",className:a=""}){const n={primary:"bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500",secondary:"bg-slate-700 hover:bg-slate-600",danger:"bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500",success:"bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"};return i.jsx(s.button,{onClick:r,disabled:e,whileHover:{scale:1.02},whileTap:{scale:.98},transition:{duration:.1},className:`
        px-4 py-2 rounded-lg text-white font-medium
        shadow-lg hover:shadow-xl transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${n[t]}
        ${a}
      `,children:o})}export{l as A};
