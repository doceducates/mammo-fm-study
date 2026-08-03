import type { PatientCase, CohortStats, BenchmarkData } from './types';

const firstNames = ['Sarah', 'Fatima', 'Ayesha', 'Zainab', 'Maria', 'Nadia', 'Hina', 'Sana', 'Rabia', 'Amna', 'Khadija', 'Bushra', 'Asma', 'Samina', 'Noor', 'Lubna', 'Saira', 'Fariha', 'Tahira', 'Nasreen'];
const lastNames = ['Khan', 'Ahmed', 'Ali', 'Malik', 'Hassan', 'Hussain', 'Shah', 'Iqbal', 'Nawaz', 'Rashid', 'Javed', 'Butt', 'Akhtar', 'Siddiqui', 'Chaudhry', 'Mirza', 'Qureshi', 'Raza', 'Waqar', 'Yousaf'];
const institutions = ['Lahore General Hospital', 'Mayo Hospital Lahore', 'Jinnah Hospital Lahore', 'Services Hospital Lahore'];

function randName() {
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

export const samplePatient: PatientCase = {
  id: 'CASE-2024-0847',
  patientId: 'PT-00291847',
  patientName: 'Sarah M. Thompson',
  age: 54,
  sex: 'F',
  studyDate: '2024-11-15',
  institution: 'Lahore General Hospital',
  images: [
    { id: 'img-1', view: 'LCC', url: '/images/mammo-lcc.jpg', width: 2048, height: 2560 },
    { id: 'img-2', view: 'RCC', url: '/images/mammo-rcc.jpg', width: 2048, height: 2560 },
    { id: 'img-3', view: 'LMLO', url: '/images/mammo-lmlo.jpg', width: 2048, height: 2560 },
    { id: 'img-4', view: 'RMLO', url: '/images/mammo-rmlo.jpg', width: 2048, height: 2560 },
  ],
  aiPrediction: {
    malignancyProbability: 0.845,
    classification: 'Malignant',
    suggestedBIRADS: 5,
    confidence: 0.92,
    featureUncertainty: 0.08,
    attentionRegions: [
      { x: 45, y: 38, width: 18, height: 22, intensity: 0.95, label: 'Primary Mass' },
      { x: 62, y: 55, width: 10, height: 12, intensity: 0.72, label: 'Calcification Cluster' },
      { x: 30, y: 60, width: 8, height: 8, intensity: 0.45, label: 'Architectural Distortion' },
    ],
    inferenceTime: 1.23,
  },
  radiologistAssessment: {
    birads: 4,
    notes: 'Suspicious abnormality - recommend tissue sampling',
    assessedBy: 'Dr. Amira Khan',
    assessedAt: '2024-11-15T14:30:00Z',
  },
  histopathology: {
    status: 'Malignant',
    type: 'Invasive Ductal Carcinoma',
    grade: 'Grade II',
    biopsyDate: '2024-11-20',
  },
  status: 'completed',
};

const densities: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
const tumorSubtypes = ['Invasive Ductal Carcinoma', 'Invasive Lobular Carcinoma', 'DCIS', 'Mucinous Carcinoma', 'Papillary Carcinoma', 'Tubular Carcinoma'];
const margins: ('Circumscribed' | 'Obscured' | 'Microlobulated' | 'Indistinct' | 'Spiculated')[] = ['Circumscribed', 'Obscured', 'Microlobulated', 'Indistinct', 'Spiculated'];
const vascularity: ('Absent' | 'Internal' | 'Peripheral' | 'Both')[] = ['Absent', 'Internal', 'Peripheral', 'Both'];

export const patientList: PatientCase[] = Array.from({ length: 48 }, (_, i) => {
  const isMalignant = i < 16;
  const prob = isMalignant ? 0.55 + Math.random() * 0.44 : 0.02 + Math.random() * 0.45;
  const statuses: PatientCase['status'][] = ['completed', 'completed', 'completed', 'reviewed', 'pending', 'analyzing'];
  const status = i < 3 ? statuses[Math.floor(Math.random() * 4)] : statuses[Math.floor(Math.random() * statuses.length)];
  const density = densities[Math.floor(Math.random() * 4)];
  const lesionSize = isMalignant ? Math.floor(8 + Math.random() * 45) : (Math.random() > 0.5 ? Math.floor(4 + Math.random() * 20) : undefined);
  
  return {
    id: `CASE-2024-${String(1000 + i).padStart(4, '0')}`,
    patientId: `PT-${String(20000 + i)}`,
    patientName: randName(),
    age: Math.floor(35 + Math.random() * 40),
    sex: 'F' as const,
    studyDate: `2024-${String(Math.floor(1 + Math.random() * 12)).padStart(2, '0')}-${String(Math.floor(1 + Math.random() * 28)).padStart(2, '0')}`,
    institution: institutions[Math.floor(Math.random() * institutions.length)],
    images: [
      { id: `img-${i}-1`, view: 'LCC' as const, url: '/images/mammo-lcc.jpg', width: 2048, height: 2560 },
      { id: `img-${i}-2`, view: 'RCC' as const, url: '/images/mammo-rcc.jpg', width: 2048, height: 2560 },
      { id: `img-${i}-3`, view: 'LMLO' as const, url: '/images/mammo-lmlo.jpg', width: 2048, height: 2560 },
      { id: `img-${i}-4`, view: 'RMLO' as const, url: '/images/mammo-rmlo.jpg', width: 2048, height: 2560 },
    ],
    aiPrediction: {
      malignancyProbability: Number(prob.toFixed(3)),
      classification: prob >= 0.5 ? 'Malignant' as const : 'Benign' as const,
      suggestedBIRADS: prob >= 0.8 ? 5 : prob >= 0.5 ? 4 : prob >= 0.2 ? 3 : prob >= 0.1 ? 2 : 1,
      confidence: Number((0.7 + Math.random() * 0.28).toFixed(2)),
      featureUncertainty: Number((0.02 + Math.random() * 0.15).toFixed(2)),
      attentionRegions: [
        { x: 40 + Math.floor(Math.random() * 20), y: 35 + Math.floor(Math.random() * 20), width: 15, height: 18, intensity: Number((0.5 + Math.random() * 0.5).toFixed(2)), label: 'Region of Interest' },
      ],
      inferenceTime: Number((0.8 + Math.random() * 1.5).toFixed(2)),
    },
    radiologistAssessment: status === 'completed' || status === 'reviewed' ? {
      birads: isMalignant ? (Math.random() > 0.3 ? 4 : 5) : (Math.random() > 0.5 ? 2 : 3),
      notes: '',
      assessedBy: 'Dr. Amira Khan',
      assessedAt: `2024-${String(Math.floor(1 + Math.random() * 12)).padStart(2, '0')}-${String(Math.floor(1 + Math.random() * 28)).padStart(2, '0')}T14:30:00Z`,
    } : undefined,
    histopathology: {
      status: isMalignant ? 'Malignant' as const : 'Benign' as const,
      type: isMalignant ? tumorSubtypes[Math.floor(Math.random() * tumorSubtypes.length)] : undefined,
      grade: isMalignant ? `Grade ${['I', 'II', 'III'][Math.floor(Math.random() * 3)]}` : undefined,
    },
    status,
    density,
    lesionSize,
    tumorSubtype: isMalignant ? tumorSubtypes[Math.floor(Math.random() * tumorSubtypes.length)] : undefined,
    extendedData: {
      ultrasoundFindings: Math.random() > 0.5 ? 'Hypoechoic mass with irregular margins' : undefined,
      axillaryLymphNodeThickness: Math.random() > 0.6 ? Number((2 + Math.random() * 6).toFixed(1)) : undefined,
      margins: isMalignant ? margins[Math.floor(Math.random() * margins.length)] : margins[0],
      satelliteLesions: Math.random() > 0.8,
      dopplerVascularity: vascularity[Math.floor(Math.random() * vascularity.length)],
    },
  };
});

export const cohortCases: PatientCase[] = Array.from({ length: 72 }, (_, i) => {
  const isMalignant = i < 24;
  const prob = isMalignant ? 0.55 + Math.random() * 0.44 : 0.02 + Math.random() * 0.45;
  return {
    id: `LGH-${String(i + 1).padStart(4, '0')}`,
    patientId: `PT-${String(10000 + i)}`,
    patientName: `Patient ${String(i + 1).padStart(3, '0')}`,
    age: Math.floor(35 + Math.random() * 40),
    sex: 'F' as const,
    studyDate: `2024-${String(Math.floor(1 + Math.random() * 12)).padStart(2, '0')}-${String(Math.floor(1 + Math.random() * 28)).padStart(2, '0')}`,
    institution: 'Lahore General Hospital',
    images: [
      { id: `img-${i}-1`, view: 'LCC' as const, url: '/images/mammo-lcc.jpg', width: 2048, height: 2560 },
      { id: `img-${i}-2`, view: 'RCC' as const, url: '/images/mammo-rcc.jpg', width: 2048, height: 2560 },
      { id: `img-${i}-3`, view: 'LMLO' as const, url: '/images/mammo-lmlo.jpg', width: 2048, height: 2560 },
      { id: `img-${i}-4`, view: 'RMLO' as const, url: '/images/mammo-rmlo.jpg', width: 2048, height: 2560 },
    ],
    aiPrediction: {
      malignancyProbability: Number(prob.toFixed(3)),
      classification: prob >= 0.5 ? 'Malignant' as const : 'Benign' as const,
      suggestedBIRADS: prob >= 0.8 ? 5 : prob >= 0.5 ? 4 : prob >= 0.2 ? 3 : prob >= 0.1 ? 2 : 1,
      confidence: Number((0.7 + Math.random() * 0.28).toFixed(2)),
      featureUncertainty: Number((0.02 + Math.random() * 0.15).toFixed(2)),
      attentionRegions: [],
      inferenceTime: Number((0.8 + Math.random() * 1.5).toFixed(2)),
    },
    radiologistAssessment: {
      birads: isMalignant ? (Math.random() > 0.3 ? 4 : 5) : (Math.random() > 0.5 ? 2 : 3),
      notes: '',
      assessedBy: 'Dr. Amira Khan',
      assessedAt: `2024-${String(Math.floor(1 + Math.random() * 12)).padStart(2, '0')}-${String(Math.floor(1 + Math.random() * 28)).padStart(2, '0')}T14:30:00Z`,
    },
    histopathology: {
      status: isMalignant ? 'Malignant' as const : 'Benign' as const,
      type: isMalignant ? 'Invasive Ductal Carcinoma' : undefined,
      grade: isMalignant ? `Grade ${['I', 'II', 'III'][Math.floor(Math.random() * 3)]}` : undefined,
    },
    status: 'completed' as const,
  };
});

export const cohortStats: CohortStats = {
  totalCases: 72,
  malignantCount: 24,
  benignCount: 48,
  meanProbability: 0.387,
  stdDeviation: 0.286,
  auc: 0.891,
  sensitivity: 0.792,
  specificity: 0.875,
  distributions: [
    { range: '0-10%', benign: 12, malignant: 0 },
    { range: '10-20%', benign: 10, malignant: 0 },
    { range: '20-30%', benign: 8, malignant: 1 },
    { range: '30-40%', benign: 7, malignant: 1 },
    { range: '40-50%', benign: 6, malignant: 2 },
    { range: '50-60%', benign: 3, malignant: 3 },
    { range: '60-70%', benign: 1, malignant: 4 },
    { range: '70-80%', benign: 1, malignant: 5 },
    { range: '80-90%', benign: 0, malignant: 5 },
    { range: '90-100%', benign: 0, malignant: 3 },
  ],
};

export const benchmarkData: BenchmarkData = {
  modelName: 'Mammo-FM v1.0',
  backbone: 'Vision Transformer (ViT-B/16)',
  pretrainingImages: 821000,
  validationImages: 20000,
  auc: 0.811,
  aucCI: [0.786, 0.835],
  sensitivity: 0.594,
  specificity: 0.867,
  folds: [
    { fold: 1, auc: 0.823, sensitivity: 0.612, specificity: 0.871, trainSize: 16000, valSize: 4000 },
    { fold: 2, auc: 0.798, sensitivity: 0.578, specificity: 0.859, trainSize: 16000, valSize: 4000 },
    { fold: 3, auc: 0.819, sensitivity: 0.601, specificity: 0.874, trainSize: 16000, valSize: 4000 },
    { fold: 4, auc: 0.801, sensitivity: 0.589, specificity: 0.862, trainSize: 16000, valSize: 4000 },
    { fold: 5, auc: 0.814, sensitivity: 0.591, specificity: 0.869, trainSize: 16000, valSize: 4000 },
  ],
};

export const rocCurveData = [
  { fpr: 0, tpr: 0 }, { fpr: 0.02, tpr: 0.15 }, { fpr: 0.05, tpr: 0.32 },
  { fpr: 0.08, tpr: 0.45 }, { fpr: 0.10, tpr: 0.52 }, { fpr: 0.13, tpr: 0.59 },
  { fpr: 0.15, tpr: 0.63 }, { fpr: 0.18, tpr: 0.68 }, { fpr: 0.20, tpr: 0.72 },
  { fpr: 0.25, tpr: 0.76 }, { fpr: 0.30, tpr: 0.80 }, { fpr: 0.35, tpr: 0.83 },
  { fpr: 0.40, tpr: 0.86 }, { fpr: 0.50, tpr: 0.90 }, { fpr: 0.60, tpr: 0.93 },
  { fpr: 0.70, tpr: 0.95 }, { fpr: 0.80, tpr: 0.97 }, { fpr: 0.90, tpr: 0.98 },
  { fpr: 1.0, tpr: 1.0 },
];

export const confusionMatrix = {
  truePositive: 1188,
  falsePositive: 532,
  trueNegative: 3468,
  falseNegative: 812,
};
