import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { AuthContext } from '../components/AuthContext';
import { predictionService } from '../api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Haversine formula to calculate distance in miles
const getDistanceMiles = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export default function PlacePredictionScreen({ navigation }) {
    const { user } = useContext(AuthContext);
    const [place, setPlace] = useState('');
    const [loading, setLoading] = useState(false);
    const [prediction, setPrediction] = useState(null);
    const [location, setLocation] = useState(null);
    const [allHotspots, setAllHotspots] = useState([]);
    const [nearbyHotspots, setNearbyHotspots] = useState([]);

    const mapRef = useRef(null);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let loc = await Location.getCurrentPositionAsync({});
                setLocation(loc.coords);
            }

            try {
                const res = await predictionService.getHotspots();
                if (res.success && res.hotspots) {
                    setAllHotspots(res.hotspots);
                }
            } catch (err) {
                console.log('Error fetching hotspots', err);
            }
        })();
    }, []);

    const handlePredictPlace = async () => {
        if (!place.trim()) return;
        Keyboard.dismiss();
        setLoading(true);
        try {
            const res = await predictionService.predictPlace(place.trim(), { email: user?.email, phone: user?.phone });
            if (res.latitude && res.longitude) {
                setPrediction(res);

                // Native n8n trigger if dangerous place is predicted
                if (res.severity === 'Fatal' || res.severity === 'Serious') {
                    triggerAlert(res.latitude, res.longitude);
                }

                mapRef.current?.animateToRegion({
                    latitude: res.latitude,
                    longitude: res.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                });

                calculateNearbyHotspots(res.latitude, res.longitude);
            }
        } catch (error) {
            Alert.alert('Prediction Failed', error.error || 'Could not find place or predict risk');
        } finally {
            setLoading(false);
        }
    };

    const calculateNearbyHotspots = (lat, lon) => {
        if (allHotspots.length === 0) return;

        let distances = allHotspots.map(h => ({
            ...h,
            distance: getDistanceMiles(lat, lon, h.latitude, h.longitude)
        }));

        distances.sort((a, b) => a.distance - b.distance);
        setNearbyHotspots(distances.slice(0, 2));
    };

    const triggerAlert = async (lat, lon) => {
        try {
            await predictionService.triggerN8nAlert(lat, lon, { email: user?.email, phone: user?.phone });
        } catch (error) {
            console.log('silent n8n error', error);
        }
    };

    const getRiskColor = (severity) => {
        if (severity === 'Serious' || severity === 'Fatal') return '#13ec5b'; // Design shows High Risk ring in green, but we can stick to matching screenshot
        return '#13ec5b';
    };

    const getRiskPercentage = (severity) => {
        if (severity === 'Fatal') return '95%';
        if (severity === 'Serious') return '75%';
        return '25%';
    };

    const zoomIn = () => {
        mapRef.current?.getCamera().then((cam) => {
            cam.altitude /= 2; cam.zoom += 1; mapRef.current.animateCamera(cam);
        });
    };

    const zoomOut = () => {
        mapRef.current?.getCamera().then((cam) => {
            cam.altitude *= 2; cam.zoom -= 1; mapRef.current.animateCamera(cam);
        });
    };

    const goToUserLocation = () => {
        if (location) {
            mapRef.current?.animateToRegion({
                latitude: location.latitude, longitude: location.longitude,
                latitudeDelta: 0.05, longitudeDelta: 0.05,
            });
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

            <View style={styles.headerArea}>
                <View style={styles.topRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Predict Risk</Text>
                    <View style={{ width: 48 }} />
                </View>

                <View style={styles.searchBarContainer}>
                    <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search for a location"
                        placeholderTextColor="#94a3b8"
                        value={place}
                        onChangeText={setPlace}
                        onSubmitEditing={handlePredictPlace}
                    />
                    {loading && <ActivityIndicator size="small" color="#13ec5b" style={{ marginRight: 10 }} />}
                </View>
                <Text style={styles.orText}>OR CLICK ON MAP</Text>
            </View>

            <View style={styles.mapWrap}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={{
                        latitude: location ? location.latitude : 40.4168,
                        longitude: location ? location.longitude : -3.7038,
                        latitudeDelta: 0.1,
                        longitudeDelta: 0.1,
                    }}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                >
                    {prediction && (
                        <Marker coordinate={{ latitude: prediction.latitude, longitude: prediction.longitude }}>
                            <View style={styles.targetMarker}>
                                <MaterialCommunityIcons name="target" size={24} color="#13ec5b" />
                            </View>
                        </Marker>
                    )}
                </MapView>

                {/* Map Controls */}
                <View style={styles.mapControls}>
                    <TouchableOpacity style={styles.controlBtnTop} onPress={goToUserLocation}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.zoomControls}>
                        <TouchableOpacity style={styles.controlBtn} onPress={zoomIn}>
                            <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.controlBtn} onPress={zoomOut}>
                            <MaterialCommunityIcons name="minus" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Sheet UI Overlay */}
                {prediction && (
                    <View style={styles.bottomSheet}>
                        <View style={styles.dragHandle} />

                        <View style={styles.riskRow}>
                            <View>
                                <Text style={styles.riskLabel}>PREDICTED RISK LEVEL</Text>
                                <Text style={styles.riskValue}>
                                    {prediction.severity === 'Fatal' || prediction.severity === 'Serious' ? 'High Risk' : 'Low Risk'}
                                </Text>
                            </View>
                            <View style={styles.riskRing}>
                                <Text style={styles.riskPercent}>{getRiskPercentage(prediction.severity)}</Text>
                            </View>
                        </View>

                        <Text style={styles.sectionHeader}>SAFETY RECOMMENDATIONS</Text>
                        <View style={styles.recommendationBox}>
                            <MaterialCommunityIcons name="alert" size={24} color="#13ec5b" style={{ marginTop: 2 }} />
                            <Text style={styles.recommendationText}>
                                {prediction.severity === 'Fatal' || prediction.severity === 'Serious'
                                    ? "Stay alert at intersections. High pedestrian and vehicle risk detected in this area."
                                    : "Conditions look relatively safe. Maintain normal driving precautions."}
                            </Text>
                        </View>

                        <Text style={styles.sectionHeader}>NEARBY HOTSPOTS</Text>
                        {nearbyHotspots.map((spot, idx) => (
                            <View key={idx} style={styles.hotspotItem}>
                                <View style={[styles.hotspotIconBox, { backgroundColor: spot.risk_score > 10000 ? '#ff4444' : '#ff8c00' }]}>
                                    <MaterialCommunityIcons
                                        name={spot.risk_score > 10000 ? 'asterisk' : 'speedometer'}
                                        size={20} color="#fff"
                                    />
                                </View>
                                <View style={styles.hotspotInfo}>
                                    <Text style={styles.hotspotName}>{idx === 0 ? "Mission District" : "Market Street"}</Text>
                                    <Text style={styles.hotspotDesc}>
                                        {idx === 0 ? "Frequent abrupt braking" : "Illegal lane changes seen"}
                                    </Text>
                                </View>
                                <Text style={styles.hotspotDist}>{spot.distance.toFixed(1)} mi</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Custom Bottom Nav */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Dashboard')}>
                    <MaterialCommunityIcons name="home" size={24} color="#5e7a66" />
                    <Text style={styles.navText}>HOME</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialCommunityIcons name="compass" size={24} color="#13ec5b" />
                    <Text style={[styles.navText, { color: '#13ec5b' }]}>PREDICT</Text>
                </TouchableOpacity>

                {/* Center FAB Style */}
                <View style={styles.fabContainer}>
                    <TouchableOpacity style={styles.fabBtn}>
                        <MaterialCommunityIcons name="plus" size={32} color="#102216" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.navItem}>
                    <MaterialCommunityIcons name="bell" size={24} color="#5e7a66" />
                    <Text style={styles.navText}>ALERTS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
                    <MaterialCommunityIcons name="account" size={24} color="#5e7a66" />
                    <Text style={styles.navText}>PROFILE</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#101B13' },

    headerArea: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, backgroundColor: '#101B13', zIndex: 2 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

    searchBarContainer: { flexDirection: 'row', backgroundColor: '#1B2631', borderRadius: 12, alignItems: 'center', height: 50, paddingHorizontal: 12 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, color: '#fff', fontSize: 16 },
    orText: { color: '#5e7a66', fontSize: 12, textAlign: 'center', marginTop: 16, letterSpacing: 1, fontWeight: '600' },

    mapWrap: { flex: 1, position: 'relative' },
    map: { ...StyleSheet.absoluteFillObject },

    targetMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },

    mapControls: { position: 'absolute', right: 16, top: 20, alignItems: 'center' },
    controlBtnTop: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1A232E', alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
    zoomControls: { backgroundColor: '#1A232E', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
    controlBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A232E' },
    divider: { height: 1, backgroundColor: '#2C3A47', marginHorizontal: 8 },

    bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#151C23', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 20 },
    dragHandle: { width: 40, height: 5, backgroundColor: '#2C3A47', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },

    riskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    riskLabel: { color: '#94a3b8', fontSize: 12, letterSpacing: 1, marginBottom: 4, fontWeight: '600' },
    riskValue: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
    riskRing: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(19, 236, 91, 0.1)', borderWidth: 5, borderColor: '#13ec5b', alignItems: 'center', justifyContent: 'center' },
    riskPercent: { color: '#13ec5b', fontSize: 16, fontWeight: 'bold' },

    sectionHeader: { color: '#94a3b8', fontSize: 12, letterSpacing: 1, marginBottom: 16, marginTop: 10, fontWeight: '600' },

    recommendationBox: { flexDirection: 'row', backgroundColor: 'rgba(19, 236, 91, 0.05)', borderWidth: 1, borderColor: 'rgba(19, 236, 91, 0.2)', borderRadius: 16, padding: 16, marginBottom: 20 },
    recommendationText: { flex: 1, color: '#fff', fontSize: 14, lineHeight: 20, marginLeft: 12 },

    hotspotItem: { flexDirection: 'row', backgroundColor: '#1A232E', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
    hotspotIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    hotspotInfo: { flex: 1 },
    hotspotName: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    hotspotDesc: { color: '#94a3b8', fontSize: 13 },
    hotspotDist: { color: '#fff', fontSize: 13, fontWeight: '600' },

    bottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#151C23', paddingVertical: 10, paddingBottom: 25, borderTopWidth: 1, borderTopColor: '#2C3A47' },
    navItem: { alignItems: 'center', justifyContent: 'center' },
    navText: { color: '#5e7a66', fontSize: 10, marginTop: 6, fontWeight: 'bold', letterSpacing: 0.5 },

    fabContainer: { top: -20, justifyContent: 'center', alignItems: 'center' },
    fabBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#13ec5b', alignItems: 'center', justifyContent: 'center', shadowColor: '#13ec5b', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 }
});
