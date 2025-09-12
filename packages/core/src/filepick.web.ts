export interface FilePickResult {
  uri: string;
  name: string;
  size: number;
  type: string;
}

const createFileInput = (accept: string): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.style.display = 'none';
  return input;
};

const fileToResult = (file: File): FilePickResult => ({
  uri: URL.createObjectURL(file),
  name: file.name,
  size: file.size,
  type: file.type,
});

export const filepick = {
  async pickDocument(): Promise<FilePickResult | null> {
    return new Promise((resolve) => {
      const input = createFileInput('*/*');
      
      input.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (file) {
          resolve(fileToResult(file));
        } else {
          resolve(null);
        }
        
        document.body.removeChild(input);
      };
      
      document.body.appendChild(input);
      input.click();
    });
  },

  async pickImage(): Promise<FilePickResult | null> {
    return new Promise((resolve) => {
      const input = createFileInput('image/*');
      
      input.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (file) {
          resolve(fileToResult(file));
        } else {
          resolve(null);
        }
        
        document.body.removeChild(input);
      };
      
      document.body.appendChild(input);
      input.click();
    });
  },

  async pickAudio(): Promise<FilePickResult | null> {
    return new Promise((resolve) => {
      const input = createFileInput('audio/*');
      
      input.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (file) {
          resolve(fileToResult(file));
        } else {
          resolve(null);
        }
        
        document.body.removeChild(input);
      };
      
      document.body.appendChild(input);
      input.click();
    });
  },

  async requestPermissions(): Promise<boolean> {
    // Web doesn't need explicit permissions for file picking
    return true;
  }
};
