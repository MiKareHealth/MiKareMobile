import * as SecureStore from 'expo-secure-store';
export const storage = {
    async getItem(key) {
        try {
            return await SecureStore.getItemAsync(key);
        }
        catch (error) {
            console.warn('Failed to get item from secure store:', error);
            return null;
        }
    },
    async setItem(key, value) {
        try {
            await SecureStore.setItemAsync(key, value);
        }
        catch (error) {
            console.warn('Failed to set item in secure store:', error);
        }
    },
    async removeItem(key) {
        try {
            await SecureStore.deleteItemAsync(key);
        }
        catch (error) {
            console.warn('Failed to remove item from secure store:', error);
        }
    },
    async clear() {
        // Note: expo-secure-store doesn't have a clear method
        // This would need to be implemented by tracking keys
        console.warn('clear() not implemented for secure store');
    }
};
