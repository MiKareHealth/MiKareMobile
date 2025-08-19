import { getSupabaseClient } from './supabaseClient';
import { log, error as logError } from '../utils/logger';

/**
 * Checks if a file exists in the patient-documents bucket.
 * @param path The path to the file (e.g., patientId/filename.pdf)
 */
export async function checkFileExists(path: string): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();
    
    log('Checking if file exists:', path);
    
    // Split path to get directory and filename
    const pathParts = path.split('/');
    const directory = pathParts.slice(0, -1).join('/');
    const filename = pathParts[pathParts.length - 1];
    
    log('Checking directory:', directory, 'for file:', filename);
    
    // First try to list the directory to see if we have access
    const { data, error } = await supabase
      .storage
      .from('patient-documents')
      .list(directory, { search: filename });
      
    if (error) {
      logError('Error checking file existence:', error);
      logError('Error details:', {
        message: error.message,
        name: error.name
      });
      
      // If it's a permission error, try a different approach
      if (error.message?.includes('permission') || error.message?.includes('403')) {
        log('Permission error detected, trying direct file access...');
        
        // Try to get file metadata directly (this might work even if list doesn't)
        const { data: fileData, error: fileError } = await supabase
          .storage
          .from('patient-documents')
          .list(directory);
          
        if (fileError) {
          logError('Direct file access also failed:', fileError);
          return false;
        }
        
        log('Directory listing successful, checking for file...');
        const exists = fileData?.some(file => file.name === filename);
        log('File existence check result:', { path, exists, filesInDir: fileData?.map(f => f.name) });
        return exists || false;
      }
      
      return false;
    }
    
    const exists = data?.some(file => file.name === filename);
    log('File existence check result:', { path, exists, filesInDir: data?.map(f => f.name) });
    
    return exists || false;
  } catch (error) {
    logError('Unexpected error checking file existence:', error);
    return false;
  }
}

/**
 * Validates that a document record has a corresponding file in storage.
 * @param doc The document record from the database
 * @returns true if the file exists, false otherwise
 */
export async function validateDocumentFile(doc: { file_url: string, file_name: string }): Promise<boolean> {
  try {
    const url = new URL(doc.file_url);
    
    // Extract the file path from the URL
    let path: string | null = null;
    
    if (url.pathname.includes('/storage/v1/object/public/')) {
      const parts = url.pathname.split('/storage/v1/object/public/');
      if (parts.length > 1) {
        const bucketAndKey = parts[1];
        const [bucket, ...keyParts] = bucketAndKey.split('/');
        const key = keyParts.join('/');
        
        if (bucket === 'patient-documents' && key) {
          path = key;
        }
      }
    }
    
    if (!path) {
      logError('Could not extract file path from URL:', doc.file_url);
      return false;
    }
    
    return await checkFileExists(path);
  } catch (error) {
    logError('Error validating document file:', error);
    return false;
  }
}

/**
 * Returns a signed URL for a file in the patient-documents bucket.
 * @param path The path to the file (e.g., patientId/filename.pdf)
 * @param expiresIn Number of seconds the URL is valid for (default: 300 = 5 min)
 */
export async function getSignedFileUrl(path: string, expiresIn: number = 300): Promise<string | null> {
  try {
    const supabase = await getSupabaseClient();
    
    // Log the path being used for debugging
    log('Generating signed URL for path:', path);
    
    // Skip file existence check - let RLS handle access control
    // If the file doesn't exist or user doesn't have access, the signed URL generation will fail
    log('Skipping file existence check, generating signed URL directly...');
    
    const { data, error } = await supabase
      .storage
      .from('patient-documents')
      .createSignedUrl(path, expiresIn, {
        download: true
      });
      
    if (error) {
      logError('Error generating signed URL:', error);
      logError('Path that failed:', path);
      logError('Error details:', {
        message: error.message,
        name: error.name
      });
      return null;
    }
    
    log('Successfully generated signed URL for path:', path);
    log('Signed URL:', data?.signedUrl);
    return data?.signedUrl || null;
  } catch (error) {
    logError('Unexpected error in getSignedFileUrl:', error);
    return null;
  }
}

/**
 * Extracts the storage path from a Supabase storage URL
 * @param fileUrl The full file URL from the database
 * @returns The storage path (e.g., "patientId/timestamp.ext") or null if parsing fails
 */
export function extractStoragePathFromUrl(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    log('Parsing URL:', fileUrl);
    log('URL pathname:', url.pathname);
    
    // Parse the URL to extract bucket and key
    // Expected format: https://.../storage/v1/object/public/patient-documents/d280df23-af13-4a33-a77e-3208c91f2caa/1750684923785.pdf
    // We want to extract: d280df23-af13-4a33-a77e-3208c91f2caa/1750684923785.pdf
    
    if (url.pathname.includes('/storage/v1/object/public/')) {
      // Split on '/object/public/' to get '<bucket>/<key>'
      const parts = url.pathname.split('/storage/v1/object/public/');
      if (parts.length > 1) {
        const bucketAndKey = parts[1];
        // Split once on '/' to separate bucket from key
        const [bucket, ...keyParts] = bucketAndKey.split('/');
        const key = keyParts.join('/');
        
        log('Extracted bucket:', bucket, 'key:', key);
        
        if (bucket === 'patient-documents' && key) {
          return key;
        } else {
          logError('Invalid bucket or missing key:', { bucket, key });
          return null;
        }
      }
    } else if (url.pathname.includes('/storage/v1/object/sign/')) {
      // Handle signed URL pattern
      const parts = url.pathname.split('/storage/v1/object/sign/');
      if (parts.length > 1) {
        const bucketAndKey = parts[1];
        const [bucket, ...keyParts] = bucketAndKey.split('/');
        const key = keyParts.join('/');
        
        log('Extracted bucket from signed URL:', bucket, 'key:', key);
        
        if (bucket === 'patient-documents' && key) {
          return key;
        } else {
          logError('Invalid bucket or missing key from signed URL:', { bucket, key });
          return null;
        }
      }
    } else if (url.pathname.includes('/storage/v1/object/')) {
      // Handle generic storage URL pattern
      const parts = url.pathname.split('/storage/v1/object/');
      if (parts.length > 1) {
        const bucketAndKey = parts[1];
        const [bucket, ...keyParts] = bucketAndKey.split('/');
        const key = keyParts.join('/');
        
        log('Extracted bucket from generic URL:', bucket, 'key:', key);
        
        if (bucket === 'patient-documents' && key) {
          return key;
        } else {
          logError('Invalid bucket or missing key from generic URL:', { bucket, key });
          return null;
        }
      }
    }
    
    logError('Could not extract file path from URL:', fileUrl);
    return null;
  } catch (error) {
    logError('Error parsing file URL:', fileUrl, error);
    return null;
  }
}

/**
 * Convenience function to get a signed URL from a file URL
 * @param fileUrl The full file URL from the database
 * @param expiresIn Number of seconds the URL is valid for (default: 300 = 5 min)
 */
export async function getSignedUrlFromFileUrl(fileUrl: string, expiresIn: number = 300): Promise<string | null> {
  try {
    log('Getting signed URL from file URL:', fileUrl);
    
    const storagePath = extractStoragePathFromUrl(fileUrl);
    if (!storagePath) {
      logError('Failed to extract storage path from URL');
      return null;
    }
    
    log('Extracted storage path:', storagePath);
    return await getSignedFileUrl(storagePath, expiresIn);
  } catch (error) {
    logError('Error in getSignedUrlFromFileUrl:', error);
    return null;
  }
} 