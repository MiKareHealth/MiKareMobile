import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { getSignedUrlFromFileUrl } from '../lib/fileUtils';
import { log, error as logError } from '../utils/logger';

export function DocumentDownloadButton({ doc }: { doc: { file_url: string, file_name: string } }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    
    try {
      log('=== Starting download process ===');
      log('Document details:', {
        file_name: doc.file_name,
        file_url: doc.file_url
      });
      
      const signedUrl = await getSignedUrlFromFileUrl(doc.file_url);
      if (signedUrl) {
        log('Successfully generated signed URL for download');
        log('Opening signed URL in new tab');
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        logError('Failed to generate signed URL for file:', doc.file_name);
        setError('File not found in storage. It may have been deleted or moved.');
      }
    } catch (err: any) {
      logError('Error generating download link:', err);
      
      // Provide more specific error messages based on error type
      if (err?.message?.includes('Object not found') || err?.message?.includes('404')) {
        setError('File not found in storage. It may have been deleted or moved.');
      } else if (err?.message?.includes('403') || err?.message?.includes('Forbidden')) {
        setError('Access denied. You may not have permission to download this file.');
      } else if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
        setError('Authentication required. Please log in again.');
      } else {
        setError('Error generating download link. Please try again.');
      }
    } finally {
      setLoading(false);
      log('=== Download process completed ===');
    }
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className={`font-medium text-teal-600 hover:text-teal-700 hover:underline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ minWidth: 120 }}
      >
        {loading ? 'Loading...' : doc.file_name}
      </button>
      {error && (
        <span className="text-xs text-red-600 mt-1">
          {error}
        </span>
      )}
    </div>
  );
} 