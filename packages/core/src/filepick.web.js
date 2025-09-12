const createFileInput = (accept) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    return input;
};
const fileToResult = (file) => ({
    uri: URL.createObjectURL(file),
    name: file.name,
    size: file.size,
    type: file.type,
});
export const filepick = {
    async pickDocument() {
        return new Promise((resolve) => {
            const input = createFileInput('*/*');
            input.onchange = (event) => {
                const target = event.target;
                const file = target.files?.[0];
                if (file) {
                    resolve(fileToResult(file));
                }
                else {
                    resolve(null);
                }
                document.body.removeChild(input);
            };
            document.body.appendChild(input);
            input.click();
        });
    },
    async pickImage() {
        return new Promise((resolve) => {
            const input = createFileInput('image/*');
            input.onchange = (event) => {
                const target = event.target;
                const file = target.files?.[0];
                if (file) {
                    resolve(fileToResult(file));
                }
                else {
                    resolve(null);
                }
                document.body.removeChild(input);
            };
            document.body.appendChild(input);
            input.click();
        });
    },
    async pickAudio() {
        return new Promise((resolve) => {
            const input = createFileInput('audio/*');
            input.onchange = (event) => {
                const target = event.target;
                const file = target.files?.[0];
                if (file) {
                    resolve(fileToResult(file));
                }
                else {
                    resolve(null);
                }
                document.body.removeChild(input);
            };
            document.body.appendChild(input);
            input.click();
        });
    },
    async requestPermissions() {
        // Web doesn't need explicit permissions for file picking
        return true;
    }
};
