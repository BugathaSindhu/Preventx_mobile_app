import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { getHotspotsFromCache } from './api/hotspotsCache';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKGROUND_HOTSPOT_TASK = 'BACKGROUND_HOTSPOT_TASK';
const LAST_ALERT_TIME_KEY = '@last_background_alert_time';

// Haversine formula
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Configure how notifications should behave
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

TaskManager.defineTask(BACKGROUND_HOTSPOT_TASK, async ({ data, error }) => {
    if (error) {
        console.error('Background Task Error:', error);
        return;
    }
    if (data) {
        const { locations } = data;
        if (!locations || locations.length === 0) return;

        const latestLocation = locations[0];
        const { latitude, longitude } = latestLocation.coords;

        // Load hotspots from cache
        const hotspots = await getHotspotsFromCache();
        if (!hotspots || hotspots.length === 0) return;

        // Check proximity (within 500m)
        const isNearHotspot = hotspots.some(h => getDistance(latitude, longitude, h.latitude, h.longitude) <= 500);

        if (isNearHotspot) {
            // Rate limit the background notification (15 minutes = 900000 ms)
            const lastAlertStr = await AsyncStorage.getItem(LAST_ALERT_TIME_KEY);
            const lastAlertTime = lastAlertStr ? parseInt(lastAlertStr, 10) : 0;
            const now = Date.now();

            if (now - lastAlertTime > 900000) {
                // Sent alert
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "⚠️ Danger Zone Nearby",
                        body: "You are passing near a high-risk traffic accident hotspot. Please be careful.",
                        sound: true,
                    },
                    trigger: null, // trigger immediately
                });
                await AsyncStorage.setItem(LAST_ALERT_TIME_KEY, now.toString());
            }
        }
    }
});
