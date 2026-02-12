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
  Platform,
} from 'react-native';
import { useMutation } from '@apollo/client/react';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { ParseVoiceInputDocument } from '../types/__generated__/graphql';

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
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [waveAnimation] = useState(new Animated.Value(0));

  const [parseVoiceInput] = useMutation(ParseVoiceInputDocument);

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

  const startRecording = async () => {
    try {
      // Request microphone permission
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone access is needed for voice input.');
        return;
      }

      // Enable recording on iOS
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) {
        Alert.alert('Error', 'No recording found');
        return;
      }

      setIsProcessing(true);

      // Upload the audio file to the backend
      await uploadAndParse(uri);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setIsProcessing(false);
    }
  };

  const uploadAndParse = async (audioUri: string) => {
    try {
      // Create a ReactNativeFile-compatible object for apollo-upload-client
      const extension = Platform.select({ ios: 'm4a', android: 'm4a', default: 'webm' });
      const mimeType = Platform.select({ ios: 'audio/m4a', android: 'audio/m4a', default: 'audio/webm' });
      const file = {
        uri: audioUri,
        name: `recording.${extension}`,
        type: mimeType,
      };

      const result = await parseVoiceInput({
        variables: {
          audioFile: file as unknown as File,
        },
      });

      setIsProcessing(false);

      // Check for GraphQL errors
      if (result.error) {
        console.error('GraphQL error:', result.error);
        Alert.alert(
          'Backend Error',
          'Failed to parse voice input. Please check the backend logs.'
        );
        return;
      }

      if (result.data?.parseVoiceInput?.success) {
        onActivitiesParsed(result.data.parseVoiceInput);
        handleClose();
      } else {
        const errorMsg =
          result.data?.parseVoiceInput?.errors?.join(', ') ||
          'Failed to parse voice input';
        Alert.alert('Parse Error', errorMsg);
      }
    } catch (error: any) {
      console.error('Error uploading/parsing audio:', error);
      Alert.alert('Error', 'Failed to process audio: ' + (error.message || 'Unknown error'));
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsProcessing(false);
    onClose();
  };

  const handleCancel = async () => {
    if (isRecording) {
      setIsRecording(false);
      await audioRecorder.stop();
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
                  Processing audio...
                </Text>
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
