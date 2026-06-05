import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ImagePicker, { ImageOrVideo } from 'react-native-image-crop-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';

import { palette, spacing } from '../tokens';

export function ScannerScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const mode = route.params?.mode || 'camera';

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    launchPicker();
  }, []);

  const launchPicker = async () => {
    try {
      const options = {
        cropping: true,
        freeStyleCropEnabled: true,
        mediaType: 'photo' as const,
      };

      let image: ImageOrVideo;
      if (mode === 'camera') {
        image = await ImagePicker.openCamera(options);
      } else {
        image = await ImagePicker.openPicker(options);
      }

      setImageUri(image.path);
    } catch (e: any) {
      if (e.message !== 'User cancelled image selection') {
        Alert.alert('Error', 'Could not open the camera/gallery.');
      }
      if (!imageUri) navigation.goBack();
    }
  };

  // --- THE MSU HEURISTIC REGEX PARSER ---
  const parseCorText = (rawText: string) => {
    // 1. Clean up typos
    let cleanedText = rawText
      .replace(/Opm/g, '0pm')
      .replace(/arn/g, 'am')
      .replace(/pn/g, 'pm')
      .replace(/STTO/g, 'STT0')
      .replace(/TD104/g, 'ITD104');

    // 2. Hunt for Subject Codes
    // We force it to be an array and handle the 'null' case
    const codeRegex = /\b[A-Z]{3,4}\d{3}(?:\.\d)?\b/g;
    const rawMatches = cleanedText.match(codeRegex);
    let foundCodes: string[] = rawMatches ? Array.from(new Set(rawMatches)) : [];

    // 3. Hunt for Schedules
    const scheduleRegex = /([MTWHFSW]+)?\s*(\d{2}:\d{2}[ap]m)\s*-\s*(\d{2}:\d{2}[ap]m)/gi;
    let foundSchedules: any[] = [];

    // Use a loop that specifically types the regex match
    let match: RegExpExecArray | null;
    while ((match = scheduleRegex.exec(cleanedText)) !== null) {
      foundSchedules.push({
        rawDays: match[1] || '',
        start: match[2],
        end: match[3]
      });
    }

    // 4. Assemble the Queue Objects for the Manual Entry Screen
    return foundCodes.map((code, index) => {
      let schedule = foundSchedules[index] || null;
      let daysArray: string[] = [];

      // Parse the days string into your app's standard format
      if (schedule && schedule.rawDays) {
        const d = schedule.rawDays.toUpperCase();
        if (d.includes('M')) daysArray.push('Mon');
        if (d.includes('T') && !d.includes('TH')) daysArray.push('Tue');
        if (d.includes('W')) daysArray.push('Wed');
        if (d.includes('TH')) daysArray.push('Thu');
        if (d.includes('F') && !d.includes('FS')) daysArray.push('Fri');
        if (d.includes('FS')) { daysArray.push('Fri'); daysArray.push('Sat'); }
        if (d.includes('S') && !d.includes('FS')) daysArray.push('Sat');
      }

      // Format times to fit your text inputs (e.g. "08:30 AM")
      const formatTimeForUI = (t: string) => {
        if (!t) return '';
        const timePart = t.slice(0, 5);
        const ampmPart = t.slice(-2).toUpperCase();
        return `${timePart} ${ampmPart}`;
      };

      return {
        code: code,
        title: '', // Left blank for the user to type in the Wizard
        units: 3,  // Standard MSU default
        days: daysArray,
        startTime: schedule ? formatTimeForUI(schedule.start) : '',
        endTime: schedule ? formatTimeForUI(schedule.end) : '',
      };
    });
  };

  const processImage = async () => {
    if (!imageUri) return;
    setIsProcessing(true);

    try {
      const result = await TextRecognition.recognize(imageUri);
      const rawText = result.text;

      // Pass the messy raw text through our new parser
      const parsedSubjects = parseCorText(rawText);
      setIsProcessing(false);

      if (parsedSubjects.length === 0) {
        Alert.alert(
          'No Subjects Found',
          'We couldn\'t detect any valid subject codes. Please try taking a clearer photo and cropping closely around the table.'
        );
        return;
      }

      // Send the structured array into the Review Wizard!
      navigation.replace('ManualEntry', { extractedSubjects: parsedSubjects });

    } catch (error) {
      setIsProcessing(false);
      Alert.alert('Analysis Failed', 'Could not extract text from this image. Please try again with a clearer photo.');
    }
  };

  if (!imageUri) {
    return (
      <View style={[styles.container, styles.centerAll]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Opening {mode === 'camera' ? 'Camera' : 'Gallery'}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcon name="close" size={28} color={palette.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Document</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.previewContainer}>
        <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
        <TouchableOpacity style={styles.secondaryButton} onPress={launchPicker} disabled={isProcessing}>
          <MaterialIcon name="refresh" size={24} color={palette.ink} />
          <Text style={styles.secondaryButtonText}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.primaryButton, isProcessing && styles.primaryButtonDisabled]} onPress={processImage} disabled={isProcessing}>
          {isProcessing ? (
            <ActivityIndicator size="small" color={palette.surface} />
          ) : (
            <>
              <MaterialIcon name="document-scanner" size={24} color={palette.surface} />
              <Text style={styles.primaryButtonText}>Extract Schedule</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  centerAll: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: palette.surface, marginTop: spacing.md, fontSize: 16, fontWeight: '500' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  backButton: { padding: spacing.sm, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: palette.surface },
  headerRight: { width: 40 },

  previewContainer: { flex: 1, backgroundColor: '#000', marginVertical: spacing.md, borderRadius: 24, overflow: 'hidden', marginHorizontal: spacing.md },
  previewImage: { width: '100%', height: '100%' },

  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.md },

  secondaryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, paddingHorizontal: 24, height: 56, borderRadius: 28 },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: palette.ink, marginLeft: 8 },

  primaryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.primary, paddingHorizontal: 24, height: 56, borderRadius: 28, elevation: 4 },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: palette.surface, marginLeft: 8 },
});