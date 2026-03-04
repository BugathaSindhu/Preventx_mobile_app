import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminService } from '../api';

export default function AddAccidentScreen({ navigation }) {
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [severity, setSeverity] = useState('Minor');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!latitude || !longitude) {
            Alert.alert('Error', 'Please enter latitude and longitude');
            return;
        }

        setLoading(true);
        try {
            const data = {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                accident_severity: severity,
            };
            const res = await adminService.addAccident(data);
            if (res.success) {
                Alert.alert('Success', 'Accident added successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            Alert.alert('Error', error.error || 'Failed to add accident');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.title}>Add New Accident</Text>

                    <View style={styles.inputContainer}>
                        <TextInput style={styles.input} placeholder="Latitude (e.g., 17.68)" placeholderTextColor="#888" keyboardType="numeric" value={latitude} onChangeText={setLatitude} />
                        <TextInput style={styles.input} placeholder="Longitude (e.g., 83.21)" placeholderTextColor="#888" keyboardType="numeric" value={longitude} onChangeText={setLongitude} />
                    </View>

                    <Text style={styles.label}>Severity:</Text>
                    <View style={styles.severityRow}>
                        {['Minor', 'Serious', 'Fatal'].map(level => (
                            <TouchableOpacity
                                key={level}
                                style={[styles.severityButton, severity === level && styles.severityActive]}
                                onPress={() => setSeverity(level)}
                            >
                                <Text style={[styles.severityText, severity === level && styles.severityTextActive]}>{level}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                        {loading ? <ActivityIndicator color="#102216" /> : <Text style={styles.buttonText}>Submit Data</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#102216' },
    content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
    inputContainer: { marginBottom: 16 },
    input: {
        backgroundColor: 'rgba(19, 236, 91, 0.05)',
        borderRadius: 12, padding: 16, marginBottom: 16,
        color: '#fff', fontSize: 16, borderWidth: 1, borderColor: 'rgba(19, 236, 91, 0.2)'
    },
    label: { color: 'rgba(19, 236, 91, 0.7)', fontSize: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    severityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    severityButton: {
        flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(19, 236, 91, 0.2)', backgroundColor: 'rgba(19, 236, 91, 0.05)',
        alignItems: 'center', marginHorizontal: 4
    },
    severityActive: { backgroundColor: '#13ec5b', borderColor: '#13ec5b' },
    severityText: { color: '#94a3b8', fontWeight: 'bold' },
    severityTextActive: { color: '#102216' },
    button: {
        backgroundColor: '#13ec5b', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16
    },
    buttonText: { color: '#102216', fontSize: 16, fontWeight: 'bold' },
    cancelButton: { padding: 16, alignItems: 'center' },
    cancelText: { color: '#94a3b8', fontSize: 16 }
});
