import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { AuthContext } from '../components/AuthContext';
import { predictionService } from '../api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import polyline from '@mapbox/polyline';

const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export default function HotspotsScreen({ navigation }) {
    const { user } = useContext(AuthContext);
    const [hotspots, setHotspots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState(null);
    const [routeCoords, setRouteCoords] = useState([]);
    const [isInsideHotspot, setIsInsideHotspot] = useState(false);

    // New UI States
    const [viewMode, setViewMode] = useState('map');
    const [activeFilters, setActiveFilters] = useState(['High', 'Medium', 'Low']);
    const [nearestHotspot, setNearestHotspot] = useState(null);
    const [nearestDistance, setNearestDistance] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [destination, setDestination] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null); // { distance, duration, avoidedCount }
    const [destinationThreat, setDestinationThreat] = useState(null);

    const mapRef = useRef(null);
    const isAlertingRef = useRef(false);

    useEffect(() => {
        const fetchHotspots = async () => {
            try {
                const res = await predictionService.getHotspots();
                if (res.success && res.hotspots) {
                    setHotspots(res.hotspots);
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to load hotspots');
            } finally {
                setLoading(false);
            }
        };
        fetchHotspots();
    }, []);

    useEffect(() => {
        let locationSub = null;
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc.coords);

            locationSub = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
                (newLoc) => {
                    setLocation(newLoc.coords);
                    checkZone(newLoc.coords.latitude, newLoc.coords.longitude);
                    updateNearestHotspot(newLoc.coords.latitude, newLoc.coords.longitude);
                }
            );
        })();

        return () => { if (locationSub) locationSub.remove(); };
    }, [hotspots]);

    const checkZone = (lat, lon) => {
        if (hotspots.length === 0) return;

        const isNear = hotspots.some(h => getDistance(lat, lon, h.latitude, h.longitude) <= 500);
        setIsInsideHotspot(isNear);

        if (isNear && !isAlertingRef.current) {
            isAlertingRef.current = true;
            triggerAlert(lat, lon);
            setTimeout(() => { isAlertingRef.current = false; }, 300000);
        }
    };

    const updateNearestHotspot = (lat, lon) => {
        if (hotspots.length === 0) return;
        let minDest = Infinity;
        let closest = null;
        hotspots.forEach(h => {
            const dist = getDistance(lat, lon, h.latitude, h.longitude);
            if (dist < minDest) {
                minDest = dist;
                closest = h;
            }
        });
        setNearestHotspot(closest);
        setNearestDistance(minDest);
    };

    useEffect(() => {
        if (location && hotspots.length > 0 && !nearestHotspot) {
            updateNearestHotspot(location.latitude, location.longitude);
        }
    }, [location, hotspots]);

    const triggerAlert = async (lat, lon) => {
        try {
            await predictionService.triggerN8nAlert(lat, lon, { email: user?.email, phone: user?.phone });
        } catch (error) {
            console.log('n8n trigger silent fail', error);
        }
    };

    const calculateRouteDangerScore = (route, activeHotspots) => {
        const points = polyline.decode(route.geometry);
        let dangerPenalty = 0;
        let avoidedHotspots = 0;

        // Decoded points are [lat, lon]
        // Check every 5th point for performance (approx every ~50 meters depending on speed/curve)
        for (let i = 0; i < points.length; i += 5) {
            const pLat = points[i][0];
            const pLon = points[i][1];

            // Check if this point on the route is dangerously close to any High/Medium hotspot
            for (const h of activeHotspots) {
                // Ignore low risk for routing detours
                if (h.risk_score <= 5000) continue;

                const dist = getDistance(pLat, pLon, h.latitude, h.longitude);
                // If route passes within 150 meters of a dangerous hotspot intersection
                if (dist < 150) {
                    dangerPenalty += (h.risk_score > 10000 ? 2 : 1);
                    avoidedHotspots++;
                }
            }
        }
        return { dangerPenalty, avoidedCount: avoidedHotspots, originalRoute: route };
    };

    const handleFindRouteToNearest = async () => {
        if (!location || !nearestHotspot) return;
        try {
            setLoading(true);
            const startLat = location.latitude;
            const startLon = location.longitude;
            const destLat = nearestHotspot.latitude;
            const destLon = nearestHotspot.longitude;

            const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${destLon},${destLat}?overview=full&alternatives=true`;
            const routeResponse = await fetch(osrmUrl);
            const routeData = await routeResponse.json();

            if (routeData.code === "Ok" && routeData.routes.length > 0) {

                // Score all alternative routes
                const scoredRoutes = routeData.routes.map(r => calculateRouteDangerScore(r, hotspots));
                scoredRoutes.sort((a, b) => a.dangerPenalty - b.dangerPenalty); // Lowest penalty first

                const safestRouteObj = scoredRoutes[0];
                const route = safestRouteObj.originalRoute;

                const encodedPolyline = route.geometry;
                const points = polyline.decode(encodedPolyline);
                const formattedCoords = points.map(p => ({ latitude: p[0], longitude: p[1] }));

                setRouteCoords(formattedCoords);
                setDestination(null); // clear generic destination

                // If the default fastest route (index 0) was dangerous, but we picked a safer one instead
                const defaultRoutePenalty = scoredRoutes.find(sr => sr.originalRoute === routeData.routes[0]).dangerPenalty;
                const avoided = defaultRoutePenalty > safestRouteObj.dangerPenalty ? (defaultRoutePenalty - safestRouteObj.dangerPenalty) : 0;

                setRouteInfo({ distance: route.distance, duration: route.duration, avoidedCount: avoided });
                setDestinationThreat(null);

                mapRef.current?.fitToCoordinates(formattedCoords, {
                    edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
                    animated: true,
                });
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchDestination = async () => {
        if (!searchQuery.trim() || !location) return;
        Keyboard.dismiss();
        setLoading(true);
        try {
            const res = await predictionService.predictPlace(searchQuery);
            if (res.latitude && res.longitude) {
                setDestination({ latitude: res.latitude, longitude: res.longitude, name: res.place });
                setDestinationThreat(res.severity); // E.g., 'Serious', 'Fatal', 'Slight'

                const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${location.longitude},${location.latitude};${res.longitude},${res.latitude}?overview=full&alternatives=true`;
                const routeResponse = await fetch(osrmUrl);
                const routeData = await routeResponse.json();

                if (routeData.code === "Ok" && routeData.routes.length > 0) {

                    const scoredRoutes = routeData.routes.map(r => calculateRouteDangerScore(r, hotspots));
                    scoredRoutes.sort((a, b) => a.dangerPenalty - b.dangerPenalty);

                    const safestRouteObj = scoredRoutes[0];
                    const route = safestRouteObj.originalRoute;

                    const defaultRoutePenalty = scoredRoutes.find(sr => sr.originalRoute === routeData.routes[0]).dangerPenalty;
                    // Provide a slight bump to avoided UI if we truly took a non-primary route to avoid danger
                    const avoided = defaultRoutePenalty > safestRouteObj.dangerPenalty ? (defaultRoutePenalty - safestRouteObj.dangerPenalty) : 0;

                    const encodedPolyline = route.geometry;
                    const points = polyline.decode(encodedPolyline);
                    const formattedCoords = points.map(p => ({ latitude: p[0], longitude: p[1] }));

                    setRouteCoords(formattedCoords);
                    setRouteInfo({ distance: route.distance, duration: route.duration, avoidedCount: avoided });

                    mapRef.current?.fitToCoordinates(formattedCoords, {
                        edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
                        animated: true,
                    });
                }
            }
        } catch (error) {
            Alert.alert("Error", error.error || "Could not find this place");
        } finally {
            setLoading(false);
        }
    };

    const toggleFilter = (level) => {
        if (activeFilters.includes(level)) {
            setActiveFilters(activeFilters.filter(f => f !== level));
        } else {
            setActiveFilters([...activeFilters, level]);
        }
    };

    const getRiskLevel = (score) => {
        if (score > 10000) return 'High';
        if (score > 5000) return 'Medium';
        return 'Low';
    };

    const getRiskColor = (level) => {
        if (level === 'High') return '#ff4444';
        if (level === 'Medium') return '#ff8c00';
        return '#eacc00';
    };

    const filteredHotspots = hotspots.filter(h => activeFilters.includes(getRiskLevel(h.risk_score)));

    const zoomIn = () => {
        if (!mapRef.current) return;
        mapRef.current.getCamera().then((cam) => {
            cam.altitude /= 2;
            cam.zoom += 1;
            mapRef.current.animateCamera(cam);
        });
    };

    const zoomOut = () => {
        if (!mapRef.current) return;
        mapRef.current.getCamera().then((cam) => {
            cam.altitude *= 2;
            cam.zoom -= 1;
            mapRef.current.animateCamera(cam);
        });
    };

    const goToUserLocation = () => {
        if (location) {
            mapRef.current?.animateToRegion({
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            });
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <View style={styles.topRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Accident Hotspots</Text>
                    <View style={{ width: 48 }} />
                </View>
                <View style={styles.searchBarContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search destination for safe route..."
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearchDestination}
                    />
                    <TouchableOpacity style={styles.searchBtn} onPress={handleSearchDestination}>
                        <MaterialCommunityIcons name="magnify" size={24} color="#13ec5b" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleBtn, styles.toggleBtnLeft, viewMode === 'map' && styles.activeToggleBtn]}
                    onPress={() => setViewMode('map')}
                >
                    <MaterialCommunityIcons name="map" size={20} color={viewMode === 'map' ? '#102216' : '#13ec5b'} />
                    <Text style={[styles.toggleText, viewMode === 'map' && styles.activeToggleText]}> Map View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleBtn, styles.toggleBtnRight, viewMode === 'list' && styles.activeToggleBtn]}
                    onPress={() => setViewMode('list')}
                >
                    <MaterialCommunityIcons name="format-list-bulleted" size={20} color={viewMode === 'list' ? '#102216' : '#13ec5b'} />
                    <Text style={[styles.toggleText, viewMode === 'list' && styles.activeToggleText]}> List View</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterPill, activeFilters.includes('High') && styles.activeFilterPill]}
                    onPress={() => toggleFilter('High')}
                >
                    <View style={[styles.dot, { backgroundColor: '#ff4444' }]} />
                    <Text style={[styles.filterText, activeFilters.includes('High') && { color: '#ff4444' }]}>High Risk</Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={activeFilters.includes('High') ? '#ff4444' : '#94a3b8'} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterPill, activeFilters.includes('Medium') && styles.activeFilterPillMedium]}
                    onPress={() => toggleFilter('Medium')}
                >
                    <View style={[styles.dot, { backgroundColor: '#ff8c00' }]} />
                    <Text style={[styles.filterText, activeFilters.includes('Medium') && { color: '#ff8c00' }]}>Medium</Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={activeFilters.includes('Medium') ? '#ff8c00' : '#94a3b8'} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterPill, activeFilters.includes('Low') && styles.activeFilterPillLow]}
                    onPress={() => toggleFilter('Low')}
                >
                    <View style={[styles.dot, { backgroundColor: '#eacc00' }]} />
                    <Text style={[styles.filterText, activeFilters.includes('Low') && { color: '#eacc00' }]}>Low Risk</Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={activeFilters.includes('Low') ? '#eacc00' : '#94a3b8'} />
                </TouchableOpacity>
            </View>

            {viewMode === 'map' && (
                <View style={styles.mapContainer}>
                    {loading && (
                        <View style={styles.loaderAbsolute}>
                            <ActivityIndicator size="large" color="#13ec5b" />
                        </View>
                    )}
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
                        followsUserLocation={true}
                        showsMyLocationButton={false}
                    >
                        {filteredHotspots.map((spot, index) => {
                            const rLevel = getRiskLevel(spot.risk_score);
                            const rColor = getRiskColor(rLevel);
                            return (
                                <Marker
                                    key={`hotspot-${index}`}
                                    coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
                                >
                                    <View style={styles.markerWrapper}>
                                        <View style={[styles.markerHalo, { backgroundColor: rColor + '40' }]} />
                                        <View style={[styles.markerCore, { backgroundColor: rColor }]}>
                                            {rLevel === 'Low' ? (
                                                <MaterialCommunityIcons name="information-variant" size={16} color="#000" />
                                            ) : (
                                                <MaterialCommunityIcons name="alert" size={16} color="#fff" />
                                            )}
                                        </View>
                                    </View>
                                </Marker>
                            )
                        })}

                        {destination && (
                            <Marker coordinate={destination}>
                                <View style={styles.markerWrapper}>
                                    <View style={[styles.markerCore, { backgroundColor: '#3b82f6', width: 34, height: 34, borderRadius: 17 }]}>
                                        <MaterialCommunityIcons name="flag-checkered" size={20} color="#fff" />
                                    </View>
                                </View>
                            </Marker>
                        )}

                        {routeCoords.length > 0 && (
                            <Polyline coordinates={routeCoords} strokeColor="#3b82f6" strokeWidth={5} />
                        )}
                    </MapView>

                    <View style={styles.mapControls}>
                        <View style={styles.zoomControls}>
                            <TouchableOpacity style={styles.controlBtn} onPress={zoomIn}>
                                <MaterialCommunityIcons name="plus" size={24} color="#13ec5b" />
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            <TouchableOpacity style={styles.controlBtn} onPress={zoomOut}>
                                <MaterialCommunityIcons name="minus" size={24} color="#13ec5b" />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={[styles.controlBtn, { marginTop: 10, borderRadius: 12, backgroundColor: '#13ec5b' }]} onPress={goToUserLocation}>
                            <MaterialCommunityIcons name="navigation-variant" size={24} color="#102216" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.controlBtn, { marginTop: 10, borderRadius: 12, backgroundColor: '#ff4444', opacity: routeCoords.length > 0 ? 1 : 0 }]}
                            onPress={() => { setRouteCoords([]); setDestination(null); setRouteInfo(null); }}
                            disabled={routeCoords.length === 0}
                        >
                            <MaterialCommunityIcons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {routeInfo ? (
                        <View style={styles.floatingCard}>
                            <View style={styles.floatingCardContent}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={[styles.fcTitle, { color: '#3b82f6' }]}>Safest Route Information</Text>
                                    {routeInfo.avoidedCount > 0 && (
                                        <View style={{ backgroundColor: 'rgba(19, 236, 91, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                            <Text style={{ color: '#13ec5b', fontSize: 10, fontWeight: 'bold' }}>AVOIDED {routeInfo.avoidedCount} HOTSPOTS</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.fcSubtitle} numberOfLines={1}>{destination ? destination.name : 'Nearest Hotspot'}</Text>
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                                    <View style={[styles.distanceWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                                        <Text style={[styles.fcDistance, { color: '#3b82f6' }]}>
                                            {(routeInfo.distance / 1609.34).toFixed(1)} MILES
                                        </Text>
                                    </View>
                                    <View style={[styles.distanceWrapper, { backgroundColor: 'rgba(19, 236, 91, 0.1)' }]}>
                                        <Text style={[styles.fcDistance, { color: '#13ec5b' }]}>
                                            {Math.round(routeInfo.duration / 60)} MINS
                                        </Text>
                                    </View>
                                </View>
                                {destinationThreat && (destinationThreat === 'Serious' || destinationThreat === 'Fatal') && (
                                    <Text style={{ color: '#ff4444', fontSize: 12, marginTop: 8, fontWeight: 'bold' }}>
                                        <MaterialCommunityIcons name="alert" size={12} /> High risk destination predicted!
                                    </Text>
                                )}
                            </View>
                        </View>
                    ) : nearestHotspot ? (
                        <View style={styles.floatingCard}>
                            <View style={styles.floatingCardContent}>
                                <Text style={styles.fcTitle}>Nearest High Risk Area</Text>
                                <Text style={styles.fcSubtitle}>Junction of Market & 5th St.</Text>
                                <View style={styles.distanceWrapper}>
                                    <Text style={styles.fcDistance}>
                                        {nearestDistance ? `${(nearestDistance / 1609.34).toFixed(1)} MILES AWAY` : 'CALCULATING...'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.fcActionBtn} onPress={handleFindRouteToNearest}>
                                <MaterialCommunityIcons name="arrow-right-thick" size={24} color="#102216" />
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </View>
            )}

            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Dashboard')}>
                    <MaterialCommunityIcons name="home" size={24} color="#5e7a66" />
                    <Text style={styles.navText}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialCommunityIcons name="map" size={24} color="#13ec5b" />
                    <Text style={[styles.navText, { color: '#13ec5b' }]}>Hotspots</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialCommunityIcons name="bell" size={24} color="#5e7a66" />
                    <Text style={styles.navText}>Alerts</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
                    <MaterialCommunityIcons name="account" size={24} color="#5e7a66" />
                    <Text style={styles.navText}>Profile</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#102216' },

    header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#102216', zIndex: 2 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

    searchBarContainer: { flexDirection: 'row', backgroundColor: '#1a2e20', borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', height: 48 },
    searchInput: { flex: 1, color: '#fff', fontSize: 15 },
    searchBtn: { padding: 8 },

    toggleContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, backgroundColor: '#102216' },
    toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: '#223628', borderWidth: 1 },
    toggleBtnLeft: { borderTopLeftRadius: 12, borderBottomLeftRadius: 12, borderRightWidth: 0 },
    toggleBtnRight: { borderTopRightRadius: 12, borderBottomRightRadius: 12 },
    activeToggleBtn: { backgroundColor: '#13ec5b', borderColor: '#13ec5b' },
    toggleText: { color: '#13ec5b', marginLeft: 8, fontWeight: 'bold' },
    activeToggleText: { color: '#102216' },

    filterContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#102216', gap: 10 },
    filterPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#223628', gap: 6 },
    activeFilterPill: { backgroundColor: 'rgba(255, 68, 68, 0.1)', borderColor: '#ff4444' },
    activeFilterPillMedium: { backgroundColor: 'rgba(255, 140, 0, 0.1)', borderColor: '#ff8c00' },
    activeFilterPillLow: { backgroundColor: 'rgba(234, 204, 0, 0.1)', borderColor: '#eacc00' },
    dot: { width: 8, height: 8, borderRadius: 4 },
    filterText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },

    mapContainer: { flex: 1, position: 'relative' },
    map: { flex: 1 },
    loaderAbsolute: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10, backgroundColor: 'rgba(16, 34, 22, 0.5)' },

    markerWrapper: { alignItems: 'center', justifyContent: 'center', width: 60, height: 60 },
    markerHalo: { position: 'absolute', width: 50, height: 50, borderRadius: 25 },
    markerCore: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },

    mapControls: { position: 'absolute', right: 16, bottom: 150, alignItems: 'center' },
    zoomControls: { backgroundColor: '#1a2e20', borderRadius: 12, overflow: 'hidden' },
    controlBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a2e20' },
    divider: { height: 1, backgroundColor: '#2a4030', marginHorizontal: 8 },

    floatingCard: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: '#1a2e20', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    floatingCardContent: { flex: 1 },
    fcTitle: { color: '#13ec5b', fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
    fcSubtitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    distanceWrapper: { alignSelf: 'flex-start', backgroundColor: 'rgba(255, 68, 68, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
    fcDistance: { color: '#ff4444', fontSize: 11, fontWeight: 'bold' },
    fcActionBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#13ec5b', alignItems: 'center', justifyContent: 'center', marginLeft: 16 },

    bottomNav: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#102216', paddingVertical: 12, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#223628' },
    navItem: { alignItems: 'center', justifyContent: 'center' },
    navText: { color: '#5e7a66', fontSize: 11, marginTop: 4, fontWeight: '600' }
});
