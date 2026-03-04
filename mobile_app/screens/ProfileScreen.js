import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../components/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
    const { user, logout } = useContext(AuthContext);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#13ec5b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarCircle}>
                        <MaterialCommunityIcons name="account" size={60} color="#102216" />
                    </View>
                    <Text style={styles.nameText}>{user?.name || 'User'}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{user?.role === 'admin' ? 'Administrator' : 'Standard User'}</Text>
                    </View>
                </View>

                <View style={styles.detailsCard}>
                    <View style={styles.detailRow}>
                        <View style={styles.iconBox}>
                            <MaterialCommunityIcons name="email-outline" size={20} color="#13ec5b" />
                        </View>
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.detailLabel}>Email Address</Text>
                            <Text style={styles.detailValue}>{user?.email || 'N/A'}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.detailRow}>
                        <View style={styles.iconBox}>
                            <MaterialCommunityIcons name="phone-outline" size={20} color="#13ec5b" />
                        </View>
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.detailLabel}>Phone Number</Text>
                            <Text style={styles.detailValue}>{user?.phone || 'N/A'}</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <MaterialCommunityIcons name="logout" size={20} color="#ff4444" style={{ marginRight: 8 }} />
                    <Text style={styles.logoutBtnText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#102216' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    content: { flex: 1, padding: 20, alignItems: 'center' },

    avatarContainer: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
    avatarCircle: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: '#13ec5b',
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
        elevation: 10, shadowColor: '#13ec5b', shadowOpacity: 0.3, shadowRadius: 15
    },
    nameText: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
    roleBadge: { backgroundColor: 'rgba(19, 236, 91, 0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#13ec5b' },
    roleText: { color: '#13ec5b', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },

    detailsCard: {
        width: '100%', backgroundColor: 'rgba(19, 236, 91, 0.03)', borderRadius: 20, padding: 24,
        borderWidth: 1, borderColor: 'rgba(19, 236, 91, 0.1)', marginBottom: 40
    },
    detailRow: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(19, 236, 91, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    detailTextContainer: { flex: 1 },
    detailLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
    detailValue: { color: '#fff', fontSize: 16, fontWeight: '500' },
    divider: { height: 1, backgroundColor: 'rgba(19, 236, 91, 0.1)', marginVertical: 16 },

    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, paddingHorizontal: 32, borderRadius: 30,
        backgroundColor: 'rgba(255, 68, 68, 0.1)', borderWidth: 1, borderColor: '#ff4444',
        width: '100%'
    },
    logoutBtnText: { color: '#ff4444', fontWeight: 'bold', fontSize: 16 }
});
