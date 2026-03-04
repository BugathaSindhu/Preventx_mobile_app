import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminService } from '../api';

export default function AdminAnalyticsScreen({ navigation }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await adminService.getAnalytics();
            if (res.success) {
                setData(res);
            }
        } catch (error) {
            Alert.alert('Error', error.error || 'Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#0066cc" />
            </SafeAreaView>
        );
    }

    if (!data) {
        return (
            <SafeAreaView style={[styles.container, styles.center]}>
                <Text style={styles.errorText}>No data available</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const { total_accidents, severity, weather, traffic } = data;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.title}>📊 Analytics</Text>
                <View style={{ width: 50 }} />
            </View>
            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Total Accidents</Text>
                    <Text style={styles.bigNumber}>{total_accidents}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>By Severity</Text>
                    {Object.keys(severity).map(key => (
                        <View key={key} style={styles.row}>
                            <Text style={styles.key}>{key}</Text>
                            <Text style={styles.val}>{severity[key]}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>By Weather</Text>
                    {Object.keys(weather).map(key => (
                        <View key={key} style={styles.row}>
                            <Text style={styles.key}>{key}</Text>
                            <Text style={styles.val}>{weather[key]}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>By Traffic Density</Text>
                    {Object.keys(traffic).map(key => (
                        <View key={key} style={styles.row}>
                            <Text style={styles.key}>{key}</Text>
                            <Text style={styles.val}>{traffic[key]}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#102216' },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: 'rgba(19, 236, 91, 0.2)' },
    backText: { color: '#13ec5b', fontSize: 16 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    content: { padding: 20, paddingBottom: 40 },
    errorText: { color: '#94a3b8', fontSize: 16 },
    backButton: { marginTop: 20, padding: 10 },
    backButtonText: { color: '#13ec5b', fontSize: 16, fontWeight: 'bold' },
    card: { backgroundColor: 'rgba(19, 236, 91, 0.05)', padding: 20, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(19, 236, 91, 0.2)' },
    cardTitle: { fontSize: 16, color: 'rgba(19, 236, 91, 0.7)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
    bigNumber: { fontSize: 40, fontWeight: 'bold', color: '#fff' },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(19, 236, 91, 0.1)' },
    key: { color: '#fff', fontSize: 16 },
    val: { color: '#13ec5b', fontSize: 16, fontWeight: 'bold' }
});
