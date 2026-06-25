/**
 * ScannerScreen.tsx — Production COR OCR Scanner
 *
 * ── Update: Forgiving OCR Engine ─────────────────────────────────────────────
 * [A] Distance-Based Deduplication: Prevents dropping STT071 at the bottom
 * if STT071.1 at the top lost its decimal point during the scan.
 * [B] Glued Text Bypass: Allows codes attached to symbols (ITE192*MACATO)
 * [C] Glyph Auto-Correction: Fixes "1TE192" -> "ITE192" and "ITD1O4" -> "ITD104"
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
import TextRecognition from '@react-native-ml-kit/text-recognition';
import ImageResizer from 'react-native-image-resizer';

import { palette, spacing } from '../tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ParsedSubject = {
  code: string;
  section: string;
  title: string;
  units: number;
  days: string[];
  startTime: string;
  endTime: string;
  room: string;
  instructor: string;
};

type ParseResult = {
  detectedSemester: string | null;
  academicTerm: string | null;
  subjects: ParsedSubject[];
};

type Rotation = 0 | 90 | 180 | 270;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const NON_CODE_PREFIXES = new Set([
  'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN',
  'MWF', 'TTH', 'MTH', 'MWS', 'MFS', 'MF', 'MW',
  'TF',  'WF',  'FS',  'TBA', 'AND', 'FOR', 'THE',
  'SEM', 'NOT', 'AM',  'PM',  'SUM',
]);

const ROOM_EXCLUDES = new Set([
  ...Array.from(NON_CODE_PREFIXES),
  'TH', 'TU', 'MO', 'WE', 'FR', 'SA', 'SU',
  'TBA', 'NONE', 'MTWTHF', 'SUM',
]);

const DAY_COMPOUNDS: [string, string[]][] = [
  ['MTWTHF', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']],
  ['MTTHF',  ['Mon', 'Tue', 'Thu', 'Fri']],
  ['MWTHF',  ['Mon', 'Wed', 'Thu', 'Fri']],
  ['MWTH',   ['Mon', 'Wed', 'Thu']],
  ['TWTH',   ['Tue', 'Wed', 'Thu']],
  ['MWF',    ['Mon', 'Wed', 'Fri']],
  ['MTH',    ['Mon', 'Thu']],
  ['TTH',    ['Tue', 'Thu']],
  ['MWS',    ['Mon', 'Wed', 'Sat']],
  ['MFS',    ['Mon', 'Fri', 'Sat']],
  ['FS',     ['Fri', 'Sat']],
  ['MF',     ['Mon', 'Fri']],
  ['MW',     ['Mon', 'Wed']],
  ['TF',     ['Tue', 'Fri']],
  ['WF',     ['Wed', 'Fri']],
];

const GOOD_SCORE_THRESHOLD = 15;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseDays(raw: string): string[] {
  const d = raw.toUpperCase().replace(/\s+/g, '').trim();
  for (const [pat, result] of DAY_COMPOUNDS) if (d === pat) return result;
  for (const [pat, result] of DAY_COMPOUNDS) if (d.startsWith(pat)) return result;
  const out: string[] = [];
  let i = 0;
  while (i < d.length) {
    if (d.slice(i, i + 2) === 'TH') { out.push('Thu'); i += 2; continue; }
    if (d[i] === 'M') { out.push('Mon'); i++; continue; }
    if (d[i] === 'T') { out.push('Tue'); i++; continue; }
    if (d[i] === 'W') { out.push('Wed'); i++; continue; }
    if (d[i] === 'F') { out.push('Fri'); i++; continue; }
    if (d[i] === 'S') { out.push('Sat'); i++; continue; }
    i++;
  }
  return [...new Set(out)];
}

function normalizeTime(raw: string, ampmHint: string): string {
  let s = raw.trim();
  if (!s.includes(':')) {
    const padded = s.padStart(4, '0');
    s = `${padded.slice(0, 2)}:${padded.slice(2)}`;
  }
  const [hStr, mStr = '00'] = s.split(':');
  const h = parseInt(hStr, 10);
  const mins = (mStr || '00').slice(0, 2).padStart(2, '0');
  const cleaned = ampmHint.toUpperCase().replace(/[^AMPM]/g, '');
  const period: 'AM' | 'PM' = (['AM', 'PM'] as const).includes(cleaned as any)
    ? (cleaned as 'AM' | 'PM')
    : (h >= 7 && h < 12 ? 'AM' : 'PM');
  return `${h.toString().padStart(2, '0')}:${mins} ${period}`;
}

function scoreOcrQuality(text: string): number {
  const codeMatches = (text.match(/\b[A-Z]{2,4}\d{3}(?:\.\d)?\b/g) || []).length;
  const timeMatches  = (text.match(/\d{1,2}:\d{2}\s*[ap]m/gi) || []).length;
  const alphaCount   = (text.match(/[a-zA-Z]/g) || []).length;
  const alphaRatio   = alphaCount / Math.max(text.length, 1);
  return codeMatches * 10 + timeMatches * 5 + alphaRatio * 20;
}

async function rotateImageFile(
  sourceUri: string,
  angle: Rotation,
  origWidth: number,
  origHeight: number,
): Promise<string> {
  if (angle === 0) return sourceUri;
  const isSideways  = angle === 90 || angle === 270;
  const targetWidth  = isSideways ? origHeight : origWidth;
  const targetHeight = isSideways ? origWidth  : origHeight;

  const result = await ImageResizer.createResizedImage(
    sourceUri,
    targetWidth,
    targetHeight,
    'JPEG',
    100,
    angle,
    undefined,
    false,
    { mode: 'contain', onlyScaleDown: false },
  );
  return result.uri;
}

async function recognizeWithBestOrientation(
  originalUri: string,
  preferredAngle: Rotation,
  origWidth: number,
  origHeight: number,
): Promise<{ text: string; angle: Rotation }> {
  const allAngles: Rotation[] = [0, 90, 180, 270];
  const orderedAngles = [
    preferredAngle,
    ...allAngles.filter(a => a !== preferredAngle),
  ];

  let best: { text: string; angle: Rotation } | null = null;
  let bestScore = -1;

  for (const angle of orderedAngles) {
    try {
      const uri = await rotateImageFile(originalUri, angle, origWidth, origHeight);
      const result = await TextRecognition.recognize(uri);
      const score = scoreOcrQuality(result.text);

      if (score > bestScore) {
        bestScore = score;
        best = { text: result.text, angle };
      }
      if (angle === preferredAngle && score >= GOOD_SCORE_THRESHOLD) break;
    } catch {
      // Ignore
    }
  }

  return best ?? { text: '', angle: preferredAngle };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PARSER
// ─────────────────────────────────────────────────────────────────────────────

function parseCorText(rawText: string): ParseResult {
  const text = rawText
    .replace(/\bOpm\b/g,   '0pm')
    .replace(/\bpn\b/gi,   'pm')
    .replace(/\barn\b/gi,  'am')
    .replace(/STTO/gi,     'STT0')
    // Fix leading 1, l, or | misread as I (e.g., 1TE193 -> ITE193)
    .replace(/\b[1l|]([A-Z]{2,3}\d{3})(?!\d)/gi, (_, p1) => 'I' + p1.toUpperCase())
    // Fix letter O misread as zero in numbers (e.g. ITD1O4 -> ITD104)
    .replace(/\b([A-Z]{2,4}[1-9])O(\d)(?!\d)/gi, (_, p1, p2) => p1.toUpperCase() + '0' + p2)
    .replace(/(\d{1,2}:\d{2})\s*[Aa][l1|][Mm]/g, '$1am')
    .replace(/(\d{1,2}:\d{2})\s*[Pp][l1|][Mm]/g, '$1pm')
    .replace(/[–—]/g, '-')
    .replace(/[ \t]+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

  const lines    = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const fullText = lines.join(' ');

  let detectedSemester: string | null = null;
  const semLabelMatch = fullText.match(
    /Semester\s*[:]\s*(first|1st|second|2nd|summer)\s*sem(?:ester)?/i
  );
  if (semLabelMatch) {
    const r = semLabelMatch[1].toLowerCase();
    detectedSemester = (r.startsWith('1') || r === 'first') ? '1st Sem'
      : (r.startsWith('2') || r === 'second')               ? '2nd Sem'
      : 'Summer';
  } else {
    for (const [pat, label] of [
      [/first\s+sem(?:ester)?/i,        '1st Sem'],
      [/1st\s+sem(?:ester)?/i,          '1st Sem'],
      [/second\s+sem(?:ester)?/i,       '2nd Sem'],
      [/2nd\s+sem(?:ester)?/i,          '2nd Sem'],
      [/summer\s*(?:class|term|sem)?/i, 'Summer'],
    ] as [RegExp, string][]) {
      if (pat.test(fullText)) detectedSemester = label;
    }
  }

  const yearMatch = fullText.match(
    /(?:A\.?Y\.?|S\.?Y\.?|Acad\.?\s+Year|Academic\s+Year)\s*[:–-]?\s*(\d{4}[-–]\d{4}|\d{4}[-–]\d{2})/i
  );
  const yearSuffix  = yearMatch ? `, ${yearMatch[1].replace('–', '-')}` : '';
  const academicTerm = detectedSemester ? `${detectedSemester}${yearSuffix}` : null;

  // NEW: Relaxed boundary allows codes glued to symbols (e.g. ITE192*MACATO)
  const CODE_SRC = /\b([A-Z]{2,4})\s?(\d{3}(?:\.\d)?)(?!\d)/.source;
  const codeItems: { code: string; lineIndex: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const local = new RegExp(CODE_SRC, 'gi');
    let m: RegExpExecArray | null;
    while ((m = local.exec(lines[i])) !== null) {
      const prefix     = m[1].toUpperCase();
      const normalized = `${prefix}${m[2]}`;

      if (!NON_CODE_PREFIXES.has(prefix)) {
        // NEW: Distance-based deduplication
        // Only drops if the exact code was seen within 2 lines of this one.
        // This ensures that STT071.1 (top) and STT071 (bottom) BOTH survive!
        const isDuplicate = codeItems.some(c => c.code === normalized && Math.abs(c.lineIndex - i) <= 2);

        if (!isDuplicate) {
          codeItems.push({ code: normalized, lineIndex: i });
        }
      }
    }
  }

  const TIME_SRC =
    /(\d{1,2}(?::\d{2})?)\s*([AaPp][Mm])?\s*[-–to]+\s*(\d{1,2}(?::\d{2})?)\s*([AaPp][Mm])/.source;
  const DAY_SRC =
    /\b(MTWTHF|MTTHF|MWTHF|MWTH|TWTH|MWF|MTH|TTH|MWS|MFS|FS|MF|MW|TF|WF|[MTWFHS]{1,6})\b/.source;
  const DAY_RE = new RegExp(DAY_SRC);

  interface FoundSchedule { lineIndex: number; start: string; end: string; days: string[]; }
  const foundSchedules: FoundSchedule[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i];
    const localRx = new RegExp(TIME_SRC, 'gi');
    let m: RegExpExecArray | null;
    while ((m = localRx.exec(line)) !== null) {
      const endAmPm   = (m[4] || '').toLowerCase();
      const startAmPm = (m[2] || endAmPm).toLowerCase();
      let daysRaw = '';
      const sameMatch = line.match(DAY_RE);
      if (sameMatch)                                              daysRaw = sameMatch[1];
      else if (i > 0             && DAY_RE.test(lines[i - 1]))     daysRaw = lines[i - 1].match(DAY_RE)![1];
      else if (i + 1 < lines.length && DAY_RE.test(lines[i + 1])) daysRaw = lines[i + 1].match(DAY_RE)![1];
      foundSchedules.push({
        lineIndex: i,
        start: normalizeTime(m[1], startAmPm),
        end:   normalizeTime(m[3], endAmPm || startAmPm),
        days:  daysRaw ? parseDays(daysRaw) : [],
      });
    }
  }

  const TIME_TEST_RE = /\d{1,2}:\d{2}/;
  const CODE_TEST_RE = new RegExp(CODE_SRC, 'i');
  const DAY_ONLY_RE  = new RegExp(`^(${DAY_SRC.slice(3, -4)})$`, 'i');

  function isValidRoom(t: string): boolean {
    return (
      t.length >= 2 && t.length <= 10 &&
      !t.includes(' ') &&
      !codeItems.some(c => c.code === t.toUpperCase()) &&
      !ROOM_EXCLUDES.has(t.toUpperCase()) &&
      !DAY_ONLY_RE.test(t) &&
      !TIME_TEST_RE.test(t) &&
      !/^[1-6]$/.test(t) &&
      !/^\d{1,2}$/.test(t) &&
      (
        /^\d{3,4}$/.test(t) ||
        (/[A-Za-z]/.test(t) && /\d/.test(t)) ||
        /[Ll]ab$/.test(t) ||
        /^[A-Z]{2,4}$/.test(t)
      )
    );
  }

  function extractInstructor(ctx: string): string {
    const m = ctx.match(
      /(?:Prof\.?|Dr\.?|Mr\.?|Ms\.?|Mrs\.?|Engr\.?|Atty\.?|Inst\.?)\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*/
    );
    return m ? m[0].trim() : '';
  }

  const subjects: ParsedSubject[] = codeItems.map((item, idx) => {
    const nextCodeLine = codeItems[idx + 1]?.lineIndex ?? lines.length;
    const windowEnd    = Math.min(item.lineIndex + 8, nextCodeLine);
    const ctxLines     = lines.slice(item.lineIndex, windowEnd);
    const ctxText      = ctxLines.join(' ');

    let bestSchedule: FoundSchedule | null = null;
    let bestDist = Infinity;
    for (const sched of foundSchedules) {
      const dist = sched.lineIndex - item.lineIndex;
      if (dist >= 0 && dist < bestDist && sched.lineIndex < windowEnd) {
        bestDist = dist; bestSchedule = sched;
      }
    }

    let section    = '';
    let titleStart = 1;
    if (ctxLines.length > 1) {
      const candidate = ctxLines[1].trim();
      if (
        candidate.length >= 1 && candidate.length <= 8 &&
        !candidate.includes(' ') &&
        !CODE_TEST_RE.test(candidate) &&
        !TIME_TEST_RE.test(candidate) &&
        !DAY_ONLY_RE.test(candidate) &&
        !/^\d+$/.test(candidate)
      ) { section = candidate; titleStart = 2; }
    }

    let title = '';
    for (let j = titleStart; j < ctxLines.length; j++) {
      const l = ctxLines[j];
      if (
        l.includes(' ') && l.length >= 8 &&
        /[a-zA-Z]/.test(l) &&
        !CODE_TEST_RE.test(l) &&
        !TIME_TEST_RE.test(l) &&
        !DAY_ONLY_RE.test(l.trim())
      ) { title = l; break; }
    }

    let units        = 3;
    let unitsLineIdx  = -1;
    for (let j = 0; j < ctxLines.length; j++) {
      if (/^[1-6]$/.test(ctxLines[j].trim())) {
        units = parseInt(ctxLines[j].trim(), 10);
        unitsLineIdx = j;
        break;
      }
    }

    let room = '';
    if (unitsLineIdx >= 0 && unitsLineIdx + 1 < ctxLines.length) {
      const candidate = ctxLines[unitsLineIdx + 1].trim();
      if (isValidRoom(candidate)) room = candidate;
    }

    if (unitsLineIdx === -1) {
      const explicit =
        ctxText.match(/\b([1-6])\s*units?\b/i) ||
        ctxText.match(/\(([1-6])\)/);
      if (explicit) {
        units = Math.min(6, Math.max(1, parseInt(explicit[1], 10)));
      } else {
        const allTimeMatches = [...ctxText.matchAll(/\d{1,2}:\d{2}\s*[AaPp][Mm]/g)];
        const lastTimeMatch  = allTimeMatches.pop();
        if (lastTimeMatch) {
          const afterStr = ctxText.slice(lastTimeMatch.index! + lastTimeMatch[0].length).trim();
          const tokens   = afterStr.split(/\s+/).filter(t => t.length > 0);
          if (tokens.length >= 1 && /^[1-6]$/.test(tokens[0])) {
            units = parseInt(tokens[0], 10);
            if (!room && tokens.length >= 2 && isValidRoom(tokens[1])) {
              room = tokens[1];
            }
          }
        }
      }
    }

    return {
      code:       item.code,
      section,
      title,
      units,
      days:       bestSchedule?.days      || [],
      startTime:  bestSchedule?.start     || '',
      endTime:    bestSchedule?.end       || '',
      room,
      instructor: extractInstructor(ctxText),
    };
  });

  return { detectedSemester, academicTerm, subjects };
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen Component
// ─────────────────────────────────────────────────────────────────────────────

export function ScannerScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const mode   = route.params?.mode || 'camera';

  const originalUriRef = useRef<string | null>(null);
  const [origDims,    setOrigDims]    = useState<{ w: number; h: number } | null>(null);

  const [displayUri,   setDisplayUri]   = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState<Rotation>(0);

  const [isRotating,   setIsRotating]   = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { launchPicker(); }, []);

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
      if (!displayUri) navigation.goBack();
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

      if (parsedData.subjects.length === 0) {
        Alert.alert(
          'No Subjects Found',
          "We couldn't detect any subject codes.\n\n" +
          'Tips:\n' +
          '• Make sure the document is right-side up (use the rotate button)\n' +
          '• Crop tightly around the subject table\n' +
          '• Ensure good, even lighting with no glare',
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
});