import React from 'react';

export default function DocumentUploader() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3 text-white">📄 Document Uploader</h3>
      <iframe
        src="https://document-system-production-1a7e.up.railway.app"
        className="w-full h-96 border border-slate-600 rounded-lg bg-white"
        title="Document Uploader"
        allow="camera;microphone"
      />
    </div>
  );
}
