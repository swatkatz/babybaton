import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { useMutation } from '@apollo/client/react';
import { PARSE_VOICE_INPUT } from '../graphql/mutations';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface VoiceInputModalProps {
  visible: boolean;
  onClose: () => void;
  onActivitiesParsed: (result: any) => void;
}

export function VoiceInputModal({
  visible,
  onClose,
  onActivitiesParsed,
}: VoiceInputModalProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [waveAnimation] = useState(new Animated.Value(0));

  const [parseVoiceInput] = useMutation(PARSE_VOICE_INPUT);

  useEffect(() => {
    if (isRecording) {
      // Animate waveform while recording
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      waveAnimation.setValue(0);
    }
  }, [isRecording]);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Microphone access is required to record voice input.'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request microphone permissions');
      return false;
    }
  };

  const startRecording = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      console.log('Recording stopped and stored at', uri);

      // For now, we'll use a placeholder transcription
      // In a real implementation, you'd send the audio to a speech-to-text service
      setIsProcessing(true);

      // Simulate transcription (replace with actual service call)
      setTimeout(() => {
        const mockTranscription =
          'Fed baby 120ml at 3pm, changed diaper at 4pm';
        setTranscribedText(mockTranscription);
        handleTranscription(mockTranscription);
      }, 1500);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setIsProcessing(false);
    }
  };

  const handleTranscription = async (text: string) => {
    try {
      console.log('Parsing voice input:', { text });

      const { data, errors } = await parseVoiceInput({
        variables: {
          text,
        },
      });

      setIsProcessing(false);

      // Check for GraphQL errors
      if (errors && errors.length > 0) {
        console.error('GraphQL errors:', errors);
        Alert.alert(
          'Backend Error',
          'Failed to parse voice input. Please check the backend logs.'
        );
        return;
      }

      if (data?.parseVoiceInput?.success) {
        onActivitiesParsed({
          ...data.parseVoiceInput,
          rawText: text,
        });
        handleClose();
      } else {
        const errorMsg =
          data?.parseVoiceInput?.errors?.join(', ') ||
          'Failed to parse voice input';
        Alert.alert('Parse Error', errorMsg);
      }
    } catch (error: any) {
      console.error('Error parsing voice input:', error);
      Alert.alert('Error', 'Failed to process voice input: ' + (error.message || 'Unknown error'));
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setRecording(null);
    setIsRecording(false);
    setIsProcessing(false);
    setTranscribedText('');
    onClose();
  };

  const handleCancel = async () => {
    if (isRecording && recording) {
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setIsRecording(false);
    }
    handleClose();
  };

  const waveScale = waveAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Voice Input</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.processingText}>
                  Processing voice input...
                </Text>
                {transcribedText ? (
                  <Text style={styles.transcribedText}>
                    "{transcribedText}"
                  </Text>
                ) : null}
              </View>
            ) : (
              <>
                {/* Microphone Icon with Animation - Tappable */}
                <TouchableOpacity
                  style={styles.microphoneContainer}
                  onPress={isRecording ? stopRecording : startRecording}
                  activeOpacity={0.7}
                >
                  <Animated.View
                    style={[
                      styles.waveform,
                      {
                        transform: [{ scale: waveScale }],
                        opacity: isRecording ? 0.3 : 0,
                      },
                    ]}
                  />
                  <Text style={styles.microphoneIcon}>🎤</Text>
                </TouchableOpacity>

                {/* Status Text */}
                <Text style={styles.statusText}>
                  {isRecording
                    ? 'Tap the microphone to stop'
                    : 'Tap the microphone to start'}
                </Text>

                {/* Instructions */}
                {!isRecording && (
                  <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsTitle}>Examples:</Text>
                    <Text style={styles.instruction}>
                      • "Fed baby 120ml at 3pm"
                    </Text>
                    <Text style={styles.instruction}>
                      • "Changed diaper at 4pm, had poop"
                    </Text>
                    <Text style={styles.instruction}>
                      • "Baby slept from 2pm to 4pm"
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  microphoneContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
    position: 'relative',
  },
  waveform: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
  },
  microphoneIcon: {
    fontSize: 80,
  },
  statusText: {
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  instructionsContainer: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  instruction: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  recordButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 30,
    minWidth: 200,
    alignItems: 'center',
  },
  recordButtonActive: {
    backgroundColor: '#E53935',
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  processingText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  transcribedText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
