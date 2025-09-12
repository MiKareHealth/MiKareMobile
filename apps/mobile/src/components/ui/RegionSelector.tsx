import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';

interface RegionSelectorProps {
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

interface RegionOption {
  code: string;
  name: string;
  flag: string;
}

const regionOptions: RegionOption[] = [
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'USA', name: 'United States', flag: '🇺🇸' },
];

export function RegionSelector({ selectedRegion, onRegionChange, disabled = false, loading = false }: RegionSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = regionOptions.find(option => option.code === selectedRegion) || regionOptions[2]; // Default to USA

  const handleRegionSelect = (region: string) => {
    if (region !== selectedRegion) {
      onRegionChange(region);
      setModalVisible(false);
    } else {
      setModalVisible(false);
    }
  };

  const renderRegionOption = ({ item }: { item: RegionOption }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        selectedRegion === item.code && styles.selectedOption,
      ]}
      onPress={() => handleRegionSelect(item.code)}
    >
      <View style={styles.optionContent}>
        <Text style={styles.flagText}>{item.flag}</Text>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionName}>{item.name}</Text>
          <Text style={styles.optionCode}>{item.code.toUpperCase()}</Text>
        </View>
      </View>
      {selectedRegion === item.code && (
        <View style={styles.selectedIndicator}>
          <Text style={styles.selectedText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Data Region</Text>
      <TouchableOpacity
        style={[styles.selector, disabled && styles.disabled]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.selectorContent}>
          <Text style={styles.flagText}>{selectedOption.flag}</Text>
          <View style={styles.selectorTextContainer}>
            <Text style={styles.selectorText}>
              {selectedOption.code.toUpperCase()} {selectedOption.name}
            </Text>
          </View>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color="#008080" />
        ) : (
          <Text style={styles.chevron}>▼</Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Data Region</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={regionOptions}
              renderItem={renderRegionOption}
              keyExtractor={(item) => item.code}
              style={styles.optionsList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  disabled: {
    opacity: 0.5,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flagText: {
    fontSize: 20,
    marginRight: 12,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedOption: {
    backgroundColor: '#f0fdfa',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionTextContainer: {
    marginLeft: 12,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  optionCode: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#008080',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
