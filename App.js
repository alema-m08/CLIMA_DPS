import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Animated, Switch, Alert, Modal } from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';

export default function App() {
  const [sensorData, setSensorData] = useState({
    temperature: '0',
    humidity: '0',
    status: 'Desconocido',
    location: 'San Salvador',
  });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('San Salvador');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Lista simplificada de departamentos con coordenadas representativas
  const departments = {
    'Ahuachapán': { lat: 13.9214, lon: -89.845 },
    'Chalatenango': { lat: 14.0333, lon: -88.9333 },
    'Santa Ana': { lat: 13.9942, lon: -89.5597 },
    'Sonsonate': { lat: 13.7189, lon: -89.7242 },
    'San Salvador': { lat: 13.6929, lon: -89.2182 },
    'La Libertad': { lat: 13.6769, lon: -89.2797 },
    'Cuscatlán': { lat: 13.7167, lon: -88.9333 },
    'Cabañas': { lat: 13.8667, lon: -88.6333 },
    'La Paz': { lat: 13.5, lon: -88.8667 },
    'San Vicente': { lat: 13.6333, lon: -88.8 },
    'Usulután': { lat: 13.35, lon: -88.45 },
    'San Miguel': { lat: 13.4833, lon: -88.1833 },
    'Morazán': { lat: 13.7, lon: -88.1 },
    'La Unión': { lat: 13.3369, lon: -87.8439 },
  };

  // Función para encontrar el departamento más cercano basado en las coordenadas
  const getDepartmentFromCoordinates = (lat, lon) => {
    let closestDepartment = 'San Salvador';
    let minDistance = Infinity;

    Object.keys(departments).forEach((dept) => {
      const { lat: deptLat, lon: deptLon } = departments[dept];
      const distance = Math.sqrt(
        Math.pow(lat - deptLat, 2) + Math.pow(lon - deptLon, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestDepartment = dept;
      }
    });

    console.log('Departamento más cercano:', closestDepartment, 'para coordenadas:', { lat, lon });
    return closestDepartment;
  };

  const fetchData = async (lat, lon, departmentName) => {
    setLoading(true);
    try {
      const url = `https://api.weatherbit.io/v2.0/current?lat=${lat}&lon=${lon}&key=8aef0acb095644de8afc4159c82063fc&units=M&lang=es`;
      console.log('Haciendo solicitud a Weatherbit:', url);
      const weatherResponse = await axios.get(url);

      console.log('Datos recibidos de Weatherbit:', weatherResponse.data);

      setSensorData({
        temperature: weatherResponse.data.data[0].temp.toFixed(2),
        humidity: weatherResponse.data.data[0].rh.toString(),
        status: weatherResponse.data.data[0].weather.description,
        location: departmentName,
      });
    } catch (error) {
      console.error('Error fetching data:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      setSensorData({
        temperature: '25.53',
        humidity: '60',
        status: 'Cielo claro',
        location: departmentName || 'San Salvador',
      });
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  };

  const fetchDataWithLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Usando San Salvador por defecto.', [
          { text: 'OK', onPress: () => fetchData(13.6929, -89.2182, 'San Salvador') },
        ]);
        setSelectedDepartment('San Salvador');
        return;
      }

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      console.log('Ubicación del dispositivo:', { latitude, longitude });

      // Determinar el departamento más cercano basado en las coordenadas
      const department = getDepartmentFromCoordinates(latitude, longitude);
      setSelectedDepartment(department);
      await fetchData(latitude, longitude, department);
    } catch (error) {
      console.error('Error obteniendo la ubicación:', error.message);
      Alert.alert(
        'Error de Ubicación',
        'No se pudo obtener la ubicación. Usando San Salvador por defecto.',
        [{ text: 'OK', onPress: () => fetchData(13.6929, -89.2182, 'San Salvador') }]
      );
      setSelectedDepartment('San Salvador');
    }
  };

  const fetchDataFromSelection = async () => {
    const { lat, lon } = departments[selectedDepartment];
    await fetchData(lat, lon, selectedDepartment);
    setModalVisible(false);
  };

  useEffect(() => {
    fetchDataWithLocation();
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchDataWithLocation, 30000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.container}>
      <View style={styles.arBackground}>
        <Animated.View style={[styles.floatingPanel, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Datos del Clima</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#2196F3" />
          ) : (
            <>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Temperatura:</Text>
                <Text style={styles.value}>{sensorData.temperature} °C</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Humedad:</Text>
                <Text style={styles.value}>{sensorData.humidity} %</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Estado:</Text>
                <Text style={styles.value}>{sensorData.status}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Departamento:</Text>
                <Text style={styles.value}>{sensorData.location}</Text>
              </View>
            </>
          )}
        </Animated.View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchDataWithLocation}>
            <Text style={styles.buttonText}>Actualizar Ubicación</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.buttonText}>Seleccionar Departamento</Text>
          </TouchableOpacity>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Actualización automática:</Text>
            <Switch
              value={autoRefresh}
              onValueChange={setAutoRefresh}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={autoRefresh ? '#2196F3' : '#f4f3f4'}
            />
          </View>
        </View>

        <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Seleccionar Departamento</Text>
              <Picker
                selectedValue={selectedDepartment}
                onValueChange={setSelectedDepartment}
                style={styles.picker}
              >
                {Object.keys(departments).map((dept) => (
                  <Picker.Item key={dept} label={dept} value={dept} />
                ))}
              </Picker>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#2196F3' }]} onPress={fetchDataFromSelection}>
                  <Text style={styles.modalButtonText}>Aceptar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#f44336' }]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  arBackground: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  floatingPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2196F3', textAlign: 'center', marginBottom: 15 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 },
  label: { fontSize: 16, fontWeight: '500', color: '#333' },
  value: { fontSize: 16, color: '#2196F3' },
  controls: { alignItems: 'center', marginTop: 20 },
  refreshButton: { backgroundColor: '#2196F3', borderRadius: 25, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  switchContainer: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { color: '#fff', fontSize: 16, marginRight: 10, textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20, width: '80%', elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2196F3', textAlign: 'center', marginBottom: 15 },
  picker: { height: 50, width: '100%', marginBottom: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
});