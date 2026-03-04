import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../components/AuthContext';
import { predictionService } from '../api';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Haversine formula to calculate distance in meters
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

export default function DashboardScreen({ navigation }) {
    const { user, logout } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [prediction, setPrediction] = useState(null);
    const [location, setLocation] = useState(null);
    const [isInsideHotspot, setIsInsideHotspot] = useState(false);

    const hotspotsRef = useRef([]);
    const isAlertingRef = useRef(false);
    const alertTimeoutRef = useRef(null);

    // Fetch hotspots exactly once
    useEffect(() => {
        predictionService.getHotspots()
            .then(res => {
                if (res.success && res.hotspots) {
                    hotspotsRef.current = res.hotspots;
                }
            })
            .catch(err => console.log('Error fetching hotspots for tracking:', err));

        return () => {
            if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
        };
    }, []);

    // Start Tracker
    useEffect(() => {
        let locationSubscription = null;

        const startTracking = async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission to access location was denied');
                return;
            }

            // Initial manual location
            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);

            // Subscribe to active updates
            locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 10000,
                    distanceInterval: 10,
                },
                (newLoc) => {
                    setLocation(newLoc);
                    checkHotspotProximity(newLoc.coords.latitude, newLoc.coords.longitude);
                }
            );
        };

        startTracking();

        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
    }, []);

    const checkHotspotProximity = async (lat, lon) => {
        if (hotspotsRef.current.length === 0) return;

        // Are we within 500m of any hotspot?
        const isNearHotspot = hotspotsRef.current.some(h => {
            return getDistance(lat, lon, h.latitude, h.longitude) <= 500;
        });

        setIsInsideHotspot(isNearHotspot);

        if (isNearHotspot && !isAlertingRef.current) {
            isAlertingRef.current = true;

            // Pop up for the user
            Alert.alert(
                "⚠️ Hotspot Warning",
                "You are entering a high-risk accident zone. Please drive carefully.",
                [{ text: "OK" }]
            );

            // Fire Webhook
            try {
                await predictionService.triggerN8nAlert(lat, lon, { email: user?.email, phone: user?.phone });
            } catch (error) {
                console.warn("Failed to trigger n8n alert:", error);
            }

            // 5 minute cooldown
            alertTimeoutRef.current = setTimeout(() => {
                isAlertingRef.current = false;
            }, 300000);
        }
    };

    const handlePredict = async () => {
        if (!location) {
            Alert.alert('Error', 'Waiting for location data...');
            return;
        }
        setLoading(true);
        try {
            const res = await predictionService.predictCurrentLocation(
                location.coords.latitude,
                location.coords.longitude,
                { email: user.email, phone: user.phone }
            );
            if (res.success) {
                setPrediction(res);
            }
        } catch (error) {
            Alert.alert('Prediction Failed', error.error || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const getSeverityStyle = (severity) => {
        if (severity === 'Fatal') return styles.fatalBox;
        if (severity === 'Serious') return styles.seriousBox;
        return styles.minorBox;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.iconContainer} onPress={() => navigation.navigate('Profile')}>
                        <MaterialCommunityIcons name="account-circle" size={24} color="#13ec5b" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.title}>PreventX</Text>
                        <Text style={styles.subtitle}>Safety Monitoring</Text>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.navIconBase}>
                        <MaterialCommunityIcons name="bell" size={22} color={isInsideHotspot ? "#ff4444" : "#13ec5b"} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={logout} style={styles.navIconBase}>
                        <MaterialCommunityIcons name="logout" size={22} color="#ff4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <View style={[styles.actionCard, isInsideHotspot && styles.hotspotWarningCard]}>
                    <View style={styles.actionHeader}>
                        <Text style={[styles.cardSuperTitle, isInsideHotspot && styles.warningText]}>
                            {isInsideHotspot ? "⚠️ DANGER ZONE" : "SAFETY STATUS"}
                        </Text>
                        <View style={[styles.pulseDot, isInsideHotspot && styles.pulseDotWarning]} />
                    </View>

                    <Text style={styles.greeting}>Hello, {user?.name}</Text>
                    {isInsideHotspot ? (
                        <Text style={[styles.cardDesc, styles.warningText]}>
                            You are currently passing through a high-risk traffic accident hotspot. Stay alert.
                        </Text>
                    ) : (
                        <Text style={styles.cardDesc}>Analyze real-time conditions around you.</Text>
                    )}

                    <TouchableOpacity
                        style={[styles.primaryBtn, isInsideHotspot && styles.primaryBtnWarning]}
                        onPress={handlePredict}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#102216" /> : (
                            <View style={styles.primaryBtnInner}>
                                <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#102216" style={{ marginRight: 8 }} />
                                <Text style={styles.btnText}>Get Current Location Risk</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {prediction && (
                    <View style={[styles.resultCard, getSeverityStyle(prediction.severity)]}>
                        <Text style={styles.resultTitle}>Risk Level: {prediction.severity}</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <MaterialCommunityIcons name="weather-partly-cloudy" size={20} color="#fff" />
                                <Text style={styles.statText}>{prediction.weather}</Text>
                            </View>
                            <View style={styles.statBox}>
                                <MaterialCommunityIcons name="car-multiple" size={20} color="#fff" />
                                <Text style={styles.statText}>{prediction.traffic_density}</Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Explore Tools</Text>
                </View>
                <View style={styles.navGrid}>
                    <TouchableOpacity
                        style={styles.navCard}
                        onPress={() => navigation.navigate('PlacePrediction')}
                    >
                        <MaterialCommunityIcons name="map-search" size={32} color="#13ec5b" />
                        <Text style={styles.navText}>Search Place</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.navCard}
                        onPress={() => navigation.navigate('Hotspots')}
                    >
                        <MaterialCommunityIcons name="map-marker-radius" size={32} color="#13ec5b" />
                        <Text style={styles.navText}>Risk Map</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#102216' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 10 },
    iconContainer: {
        backgroundColor: 'rgba(19, 236, 91, 0.2)',
        height: 40, width: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    navIconBase: {
        height: 40, width: 40, borderRadius: 20,
        backgroundColor: 'rgba(19, 236, 91, 0.1)',
        alignItems: 'center', justifyContent: 'center',
        marginLeft: 8,
    },
    title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 12, marginBottom: 4 },
    subtitle: { fontSize: 12, color: 'rgba(19, 236, 91, 0.7)' },
    content: { padding: 20, paddingBottom: 100 },

    actionCard: {
        backgroundColor: 'rgba(19, 236, 91, 0.05)', padding: 24, borderRadius: 16, marginBottom: 24,
        borderWidth: 1, borderColor: 'rgba(19, 236, 91, 0.1)'
    },
    hotspotWarningCard: {
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        borderColor: 'rgba(255, 68, 68, 0.5)'
    },
    actionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardSuperTitle: { fontSize: 12, color: 'rgba(19, 236, 91, 0.6)', fontWeight: 'bold', letterSpacing: 1 },
    pulseDot: { height: 12, width: 12, borderRadius: 6, backgroundColor: '#13ec5b' },
    pulseDotWarning: { backgroundColor: '#ff4444' },

    cardDesc: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
    warningText: { color: '#ffaaaa' },
    primaryBtn: {
        backgroundColor: '#13ec5b', borderRadius: 12, height: 56, width: '100%',
        alignItems: 'center', justifyContent: 'center'
    },
    primaryBtnWarning: { backgroundColor: '#ffaa00' },
    primaryBtnInner: { flexDirection: 'row', alignItems: 'center' },
    btnText: { color: '#102216', fontWeight: 'bold', fontSize: 16 },

    resultCard: { padding: 20, borderRadius: 16, marginBottom: 24 },
    minorBox: { backgroundColor: 'rgba(19, 236, 91, 0.1)', borderWidth: 1, borderColor: '#13ec5b' },
    seriousBox: { backgroundColor: 'rgba(255, 170, 0, 0.1)', borderWidth: 1, borderColor: '#ffaa00' },
    fatalBox: { backgroundColor: 'rgba(255, 68, 68, 0.1)', borderWidth: 1, borderColor: '#ff4444' },
    resultTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 16 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    statBox: { alignItems: 'center', flexDirection: 'row', gap: 8 },
    statText: { color: '#e2e8f0', fontSize: 14 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

    navGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
    navCard: {
        flex: 1, backgroundColor: 'rgba(19, 236, 91, 0.05)', padding: 20, borderRadius: 16,
        alignItems: 'center', borderWidth: 1, borderColor: 'rgba(19, 236, 91, 0.2)'
    },
    navText: { color: '#fff', marginTop: 12, fontWeight: 'bold' }
});
