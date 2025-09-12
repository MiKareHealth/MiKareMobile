import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
export const filepick = {
    async pickDocument() {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.[0]) {
                return null;
            }
            const asset = result.assets[0];
            return {
                uri: asset.uri,
                name: asset.name || 'document',
                size: asset.size || 0,
                type: asset.mimeType || 'application/octet-stream',
            };
        }
        catch (error) {
            console.warn('Failed to pick document:', error);
            return null;
        }
    },
    async pickImage() {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.[0]) {
                return null;
            }
            const asset = result.assets[0];
            return {
                uri: asset.uri,
                name: asset.name || 'image',
                size: asset.size || 0,
                type: asset.mimeType || 'image/jpeg',
            };
        }
        catch (error) {
            console.warn('Failed to pick image:', error);
            return null;
        }
    },
    async pickAudio() {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.[0]) {
                return null;
            }
            const asset = result.assets[0];
            return {
                uri: asset.uri,
                name: asset.name || 'audio',
                size: asset.size || 0,
                type: asset.mimeType || 'audio/mpeg',
            };
        }
        catch (error) {
            console.warn('Failed to pick audio:', error);
            return null;
        }
    },
    async requestPermissions() {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            return status === 'granted';
        }
        catch (error) {
            console.warn('Failed to request permissions:', error);
            return false;
        }
    }
};
