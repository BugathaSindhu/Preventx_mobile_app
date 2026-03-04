import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from './components/AuthContext';

// Screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import DashboardScreen from './screens/DashboardScreen';
import PlacePredictionScreen from './screens/PlacePredictionScreen';
import HotspotsScreen from './screens/HotspotsScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AddAccidentScreen from './screens/AddAccidentScreen';
import AdminAnalyticsScreen from './screens/AdminAnalyticsScreen';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          user.role === 'admin' ? (
            // Admin Screens
            <>
              <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
              <Stack.Screen name="AddAccident" component={AddAccidentScreen} />
              <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
              <Stack.Screen name="Hotspots" component={HotspotsScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
            </>
          ) : (
            // Normal User Screens
            <>
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="PlacePrediction" component={PlacePredictionScreen} />
              <Stack.Screen name="Hotspots" component={HotspotsScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
            </>
          )
        ) : (
          // Auth Screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
