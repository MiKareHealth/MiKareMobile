export const storage = {
    async getItem(key) {
        try {
            return localStorage.getItem(key);
        }
        catch (error) {
            console.warn('Failed to get item from localStorage:', error);
            return null;
        }
    },
    async setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        }
        catch (error) {
            console.warn('Failed to set item in localStorage:', error);
        }
    },
    async removeItem(key) {
        try {
            localStorage.removeItem(key);
        }
        catch (error) {
            console.warn('Failed to remove item from localStorage:', error);
        }
    },
    async clear() {
        try {
            localStorage.clear();
        }
        catch (error) {
            console.warn('Failed to clear localStorage:', error);
        }
    }
};
