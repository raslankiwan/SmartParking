import React from 'react';
import {StyleSheet, Text, TextInput, TouchableOpacity} from 'react-native';
export const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: '#f5f8f2'},
  content: {padding: 20},
  title: {fontSize: 26, fontWeight: '600', color: '#184c39', marginBottom: 15},
  subtitle: {fontSize: 14, color: '#71816b', marginBottom: 14},
  card: {
    padding: 18,
    borderRadius: 10,
    backgroundColor: 'white',
    marginBottom: 14,
    borderColor: '#e1e9da',
    borderWidth: 1,
  },
  name: {fontSize: 18, fontWeight: '600', color: '#294b34', marginBottom: 8},
  text: {fontSize: 14, lineHeight: 22, color: '#6c7e62'},
  input: {
    borderWidth: 1,
    borderColor: '#d9e4d0',
    borderRadius: 7,
    padding: 13,
    color: '#294b34',
    backgroundColor: 'white',
    marginBottom: 14,
  },
  button: {
    padding: 14,
    borderRadius: 7,
    backgroundColor: '#184c39',
    marginTop: 10,
  },
  buttonText: {color: 'white', textAlign: 'center', fontWeight: '600'},
  link: {color: '#416d3c', textAlign: 'center', padding: 14},
  error: {color: '#a34d36', marginBottom: 15, lineHeight: 22},
});
export const Input = (props) => (
  <TextInput placeholderTextColor="#97a58c" style={styles.input} {...props} />
);
export const Button = ({title, onPress, disabled}) => (
  <TouchableOpacity
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={[styles.button, disabled && {opacity: 0.4}]}
  >
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);
