import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../components/AuthContext';
import { adminService } from '../api';

export default function AdminDashboardScreen({ navigation }) {
    const { user, logout } = useContext(AuthContext);

    const handleRecompute = async () => {
        try {
            Alert.alert('Processing', 'Recomputing hotspots...');
            const res = await adminService.recomputeHotspots();
            if (res.success) {
                Alert.alert('Success', 'Hotspots recomputed successfully!');
            }
        } catch (error) {
            Alert.alert('Error', error.error || 'Failed to recompute hotspots.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🛠️ Admin Panel</Text>
                <Text style={styles.subtitle}>Welcome, {user?.name}</Text>
            </View>

            <View style={styles.menu}>
                <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('AddAccident')}>
                    <Text style={styles.buttonText}>➕ Add New Accident</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={handleRecompute}>
                    <Text style={styles.buttonText}>🔄 Recompute Hotspots (DBSCAN)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('AdminAnalytics')}>
                    <Text style={styles.buttonText}>📊 View Analytics Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.mapButton]} onPress={() => navigation.navigate('Hotspots')}>
                    <Text style={styles.mapButtonText}>🗺️ View Accident Hotspots Map</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Profile')}>
                    <Text style={styles.buttonText}>👤 View My Profile</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#102216', padding: 24 },
    header: { marginBottom: 40, marginTop: 20 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
    subtitle: { fontSize: 16, color: 'rgba(19, 236, 91, 0.7)' },
    menu: { flex: 1 },
    button: {
        backgroundColor: 'rgba(19, 236, 91, 0.05)',
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(19, 236, 91, 0.2)',
        alignItems: 'center'
    },
    mapButton: { backgroundColor: '#13ec5b', borderColor: '#13ec5b' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    mapButtonText: { color: '#102216', fontSize: 16, fontWeight: 'bold' },
    logoutButton: { padding: 16, alignItems: 'center' },
    logoutText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' }
});
