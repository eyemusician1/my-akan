/**
 * Registration image capture, local recognition, and subject-review handoff.
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
import { isGenuineCorDocument } from '../features/scanner/domain/corParser';
import { recognizeWithBestOrientation, rotateImageFile, Rotation } from '../features/scanner/services/recognizeSchedule';
import { AppScreenProps } from '../navigation/types';

export function ScannerScreen({ navigation, route }: AppScreenProps<'Scanner'>) {
  const insets = useSafeAreaInsets();
  const mode   = route.params?.mode || 'camera';

  const mounted = useRef(true);
  const operationInProgress = useRef(false);
  const [isPicking, setIsPicking] = useState(false);
  const originalUriRef = useRef<string | null>(null);
  const [origDims,    setOrigDims]    = useState<{ w: number; h: number } | null>(null);

  const [displayUri,   setDisplayUri]   = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState<Rotation>(0);

  const [isRotating,   setIsRotating]   = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    mounted.current = true;
    launchPicker();
    return () => { mounted.current = false; };
  }, []);

  const launchPicker = async () => {
    if (operationInProgress.current || !mounted.current) return;
    operationInProgress.current = true;
    setIsPicking(true);
    try {
      const options = {
        cropping:              true,
        freeStyleCropEnabled:  true,
        mediaType:             'photo' as const,
        compressImageQuality:  1,
        includeExif:           false,
      };

      let image: ImageOrVideo;
      if (mode === 'camera') {
        image = await ImagePicker.openCamera(options);
      } else {
        image = await ImagePicker.openPicker(options);
      }

      let dimensions = {w: image.width, h: image.height};
      if (!Number.isFinite(dimensions.w) || !Number.isFinite(dimensions.h) || dimensions.w <= 0 || dimensions.h <= 0) {
        dimensions = await new Promise<{w: number; h: number}>((resolve, reject) => {
          Image.getSize(image.path, (w, h) => resolve({w, h}), reject);
        });
      }
      if (!mounted.current) return;
      if (!image.path || !Number.isFinite(dimensions.w) || !Number.isFinite(dimensions.h) || dimensions.w <= 0 || dimensions.h <= 0) throw new Error('Invalid image dimensions');
      originalUriRef.current = image.path;
      setOrigDims(dimensions);
      setRotationAngle(0);
      setDisplayUri(image.path);
    } catch (error: unknown) {
      if (!mounted.current) return;
      const details = error as {code?: string; message?: string};
      const cancelled = details.code === 'E_PICKER_CANCELLED' || /cancelled|canceled/i.test(details.message ?? '');
      if (!cancelled) Alert.alert('Image unavailable', 'Could not read this image. Try another photo.');
      if (!displayUri) navigation.goBack();
    } finally {
      operationInProgress.current = false;
      if (mounted.current) setIsPicking(false);
    }
  };

  const handleRotate = async () => {
    if (!originalUriRef.current || !origDims || operationInProgress.current) return;
    operationInProgress.current = true;
    setIsRotating(true);
    try {
      const nextAngle = ((rotationAngle + 90) % 360) as Rotation;
      const rotatedUri = await rotateImageFile(
        originalUriRef.current, nextAngle, origDims.w, origDims.h,
      );
      if (!mounted.current) return;
      setRotationAngle(nextAngle);
      setDisplayUri(rotatedUri);
    } catch {
      if (mounted.current) Alert.alert('Rotation Failed', 'Could not rotate the image. Please try retaking the photo.');
    } finally {
      operationInProgress.current = false;
      if (mounted.current) setIsRotating(false);
    }
  };

  const processImage = async () => {
    if (!displayUri || !originalUriRef.current || !origDims || operationInProgress.current) return;
    operationInProgress.current = true;
    setIsProcessing(true);
    try {
      const result = await recognizeWithBestOrientation(originalUriRef.current, rotationAngle, origDims.w, origDims.h);
      if (!mounted.current) return;
      setRotationAngle(result.angle);
      setDisplayUri(result.previewUri);
      if (!isGenuineCorDocument(result.text, result.parsed.subjects)) {
        Alert.alert('No schedule found', 'Use a clear registration document or crop around the subject table.');
        return;
      }
      navigation.replace('ManualEntry', {
        extractedSemester: result.parsed.academicTerm ?? result.parsed.detectedSemester,
        extractedSubjects: result.parsed.subjects,
      });
    } catch {
      if (mounted.current) Alert.alert('Could not read schedule', 'Try a sharper photo with the entire subject table visible.');
    } finally {
      operationInProgress.current = false;
      if (mounted.current) setIsProcessing(false);
    }
  };

  // Image selection loading state.
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
          disabled={isRotating || isProcessing || isPicking}
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
          disabled={isProcessing || isRotating || isPicking || !origDims}
        >
          <MaterialIcon name="refresh" size={24} color={palette.ink} />
          <Text style={styles.secondaryButtonText}>{mode === 'camera' ? 'Retake' : 'Choose image'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isProcessing ? 'Extracting schedule' : 'Extract Schedule'}
          accessibilityState={{busy: isProcessing, disabled: isProcessing || isRotating || isPicking || !origDims}}
          style={[styles.primaryButton, (isProcessing || isRotating || isPicking || !origDims) && styles.primaryButtonDisabled]}
          onPress={processImage}
          disabled={isProcessing || isRotating || isPicking || !origDims}
        >
          {isProcessing ? (
            <><ActivityIndicator size="small" color={palette.surface} /><Text style={styles.primaryButtonText}>Extracting…</Text></>
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
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  secondaryButton: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    paddingHorizontal: 16,
    minHeight: 56,
    justifyContent: 'center',
    borderRadius: 28,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: palette.ink, marginLeft: 8 },

  primaryButton: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    minHeight: 56,
    justifyContent: 'center',
    borderRadius: 28,
    elevation: 4,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: palette.surface, marginLeft: 8 },

});
