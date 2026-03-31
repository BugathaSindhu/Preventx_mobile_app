import AsyncStorage from '@react-native-async-storage/async-storage';

const HOTSPOTS_KEY = '@hotspots_cache';

export const saveHotspotsToCache = async (hotspots) => {
    try {
        const jsonValue = JSON.stringify(hotspots);
        await AsyncStorage.setItem(HOTSPOTS_KEY, jsonValue);
    } catch (e) {
        console.error('Failed to save hotspots to cache:', e);
    }
};

export const getHotspotsFromCache = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(HOTSPOTS_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Failed to load hotspots from cache:', e);
        return [];
    }
};
