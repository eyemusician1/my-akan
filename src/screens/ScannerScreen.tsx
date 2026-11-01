/**
 * ScannerScreen.tsx — Production COR OCR Scanner with Strict Document Verification
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ImagePicker, { ImageOrVideo } from 'react-native-image-crop-picker';

import { palette, spacing } from '../tokens';
import { scheduleRepository } from '../features/schedule/data';
import { getUnitLimit } from '../features/schedule/domain/rules';
import { parseCorText, isGenuineCorDocument } from '../features/scanner/domain/corParser';
import { recognizeWithBestOrientation, rotateImageFile, Rotation } from '../features/scanner/services/recognizeSchedule';
import { AppScreenProps } from '../navigation/types';

export function ScannerScreen({ navigation, route }: AppScreenProps<'Scanner'>) {
  const insets = useSafeAreaInsets();
  const mode   = route.params?.mode || 'camera';

  const originalUriRef = useRef<string | null>(null);
  const [origDims,    setOrigDims]    = useState<{ w: number; h: number } | null>(null);

  const [displayUri,   setDisplayUri]   = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState<Rotation>(0);

  const [isRotating,   setIsRotating]   = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Restriction Blocker State
  const [restriction, setRestriction] = useState<{
    isBlocked: boolean;
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    checkRestrictionsAndLaunch();
  }, []);

  const checkRestrictionsAndLaunch = async () => {
    try {
      const latest = await scheduleRepository.getLatestSchedule();

      if (latest) {
        const subjects = await latest.subjects.fetch();

        const totalUnits = subjects.reduce((sum, s) => sum + (s.units || 0), 0);

        const maxAllowed = getUnitLimit(latest.academicTerm);
        const targetUnits = latest.totalSubjects || maxAllowed;

        if (subjects.length > 0 || totalUnits >= targetUnits) {
          const isSatisfied = totalUnits >= targetUnits;
          setRestriction({
            isBlocked: true,
            title: isSatisfied ? 'Units Satisfied' : 'Existing Schedule Found',
            message: isSatisfied
              ? `You have already satisfied your target of ${targetUnits} units for ${latest.academicTerm}. Additional scanning is disabled.`
              : `You already have an active schedule with ${subjects.length} enrolled subject(s) for ${latest.academicTerm}.\n\nTo scan or upload a new COR file, please remove or archive your existing schedule first.`,
          });
          return;
        }
      }

      await launchPicker();
    } catch (error) {
      console.error('Restriction Check Error:', error);
      await launchPicker();
    }
  };

  const launchPicker = async () => {
    try {
      const options = {
        cropping:              true,
        freeStyleCropEnabled:  true,
        mediaType:             'photo' as const,
        compressImageQuality:  0.98,
        includeExif:           false,
      };

      let image: ImageOrVideo;
      if (mode === 'camera') {
        image = await ImagePicker.openCamera(options);
      } else {
        image = await ImagePicker.openPicker(options);
      }

      originalUriRef.current = image.path;
      setRotationAngle(0);
      setDisplayUri(image.path);

      Image.getSize(
        image.path,
        (w, h) => setOrigDims({ w, h }),
        () => setOrigDims(null),
      );
    } catch (e: any) {
      if (e?.message !== 'User cancelled image selection') {
        Alert.alert('Error', 'Could not open the camera or gallery.');
      }
      if (!displayUri && !restriction?.isBlocked) navigation.goBack();
    }
  };

  const handleRotate = async () => {
    if (!originalUriRef.current || !origDims || isRotating) return;
    setIsRotating(true);
    try {
      const nextAngle = ((rotationAngle + 90) % 360) as Rotation;
      const rotatedUri = await rotateImageFile(
        originalUriRef.current, nextAngle, origDims.w, origDims.h,
      );
      setRotationAngle(nextAngle);
      setDisplayUri(rotatedUri);
    } catch {
      Alert.alert('Rotation Failed', 'Could not rotate the image. Please try retaking the photo.');
    } finally {
      setIsRotating(false);
    }
  };

  const processImage = async () => {
    if (!displayUri || !originalUriRef.current || !origDims) return;
    setIsProcessing(true);

    try {
      const { text, angle: bestAngle } = await recognizeWithBestOrientation(
        originalUriRef.current,
        rotationAngle,
        origDims.w,
        origDims.h,
      );

      if (bestAngle !== rotationAngle) {
        setRotationAngle(bestAngle);
        const correctedUri = await rotateImageFile(
          originalUriRef.current, bestAngle, origDims.w, origDims.h,
        );
        setDisplayUri(correctedUri);
      }

      const parsedData = parseCorText(text);
      setIsProcessing(false);

      // STRICT VERIFICATION CHECK: Disregard random documents
      if (!isGenuineCorDocument(text, parsedData.subjects)) {
        Alert.alert(
          'Invalid Document Detected',
          'The scanned image does not appear to be an official Certificate of Registration (COR).\n\n' +
          'Please scan a valid MSU Certificate of Registration or ensure table headers (Subject Code, Title, Schedule) are clearly visible inside the cropped frame.'
        );
        return;
      }

      navigation.replace('ManualEntry', {
        extractedSemester: parsedData.academicTerm ?? parsedData.detectedSemester,
        extractedSubjects: parsedData.subjects,
      });
    } catch {
      setIsProcessing(false);
      Alert.alert(
        'Analysis Failed',
        'Could not read this image. Please try again with a clearer, well-lit photo.',
      );
    }
  };

  // ── Blocker state (M3 Design) ─────────────────────────────────────────────
  if (restriction?.isBlocked) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcon name="close" size={28} color={palette.surface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Restricted</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.blockerContent}>
          <View style={styles.blockerIconCircle}>
            <MaterialIcon name="lock-outline" size={48} color={palette.primary} />
          </View>
          <Text style={styles.blockerTitle}>{restriction.title}</Text>
          <Text style={styles.blockerMessage}>{restriction.message}</Text>

          <TouchableOpacity
            style={styles.blockerButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.blockerButtonText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!displayUri) {
    return (
      <View style={[styles.container, styles.centerAll]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>
          Opening {mode === 'camera' ? 'Camera' : 'Gallery'}…
        </Text>
      </View>
    );
  }

  // ── Review screen ────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcon name="close" size={28} color={palette.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Document</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.tipBanner}>
        <MaterialIcon name="info-outline" size={13} color="rgba(255,255,255,0.75)" />
        <Text style={styles.tipText}>
          Make sure the document is upright, then crop tightly around the table
        </Text>
      </View>

      <View style={styles.previewContainer}>
        <Image
          source={{ uri: displayUri }}
          style={styles.previewImage}
          resizeMode="contain"
        />

        <TouchableOpacity
          style={styles.rotateButton}
          onPress={handleRotate}
          disabled={isRotating || isProcessing}
          activeOpacity={0.8}
        >
          {isRotating ? (
            <ActivityIndicator size="small" color={palette.surface} />
          ) : (
            <MaterialIcon name="rotate-90-degrees-ccw" size={22} color={palette.surface} />
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={launchPicker}
          disabled={isProcessing}
        >
          <MaterialIcon name="refresh" size={24} color={palette.ink} />
          <Text style={styles.secondaryButtonText}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, isProcessing && styles.primaryButtonDisabled]}
          onPress={processImage}
          disabled={isProcessing}
        >
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
  container:   { flex: 1, backgroundColor: '#121212' },
  centerAll:   { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: palette.surface, marginTop: spacing.md, fontSize: 16, fontWeight: '500' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  backButton:  { padding: spacing.sm, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: palette.surface },
  headerRight: { width: 40 },

  tipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  tipText: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '500', flex: 1 },

  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    marginVertical: spacing.sm,
    borderRadius: 24,
    overflow: 'hidden',
    marginHorizontal: spacing.md,
  },
  previewImage: { width: '100%', height: '100%' },

  rotateButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    paddingHorizontal: 24,
    height: 56,
    borderRadius: 28,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: palette.ink, marginLeft: 8 },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primary,
    paddingHorizontal: 24,
    height: 56,
    borderRadius: 28,
    elevation: 4,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: palette.surface, marginLeft: 8 },

  // ── Blocker UI Styles ─────────────────────────────────────────────────────
  blockerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  blockerIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  blockerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.surface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  blockerMessage: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  blockerButton: {
    backgroundColor: palette.surface,
    paddingHorizontal: 36,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
  },
});