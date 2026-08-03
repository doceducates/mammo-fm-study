export interface PatientCase {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  sex: 'F' | 'M';
  studyDate: string;
  institution: string;
  images: MammoImage[];
  aiPrediction: AIPrediction;
  radiologistAssessment?: RadiologistAssessment;
  histopathology?: HistopathologyResult;
  status: 'pending' | 'analyzing' | 'completed' | 'reviewed';
  // Research fields
  density?: 'A' | 'B' | 'C' | 'D';
  lesionSize?: number; // in mm
  tumorSubtype?: string;
  // Extended research data
  extendedData?: ExtendedResearchData;
}

export interface ExtendedResearchData {
  ultrasoundFindings?: string;
  axillaryLymphNodeThickness?: number; // mm
  margins?: 'Circumscribed' | 'Obscured' | 'Microlobulated' | 'Indistinct' | 'Spiculated';
  satelliteLesions?: boolean;
  dopplerVascularity?: 'Absent' | 'Internal' | 'Peripheral' | 'Both';
}

export interface MammoImage {
  id: string;
  view: 'LCC' | 'RCC' | 'LMLO' | 'RMLO';
  url: string;
  heatmapUrl?: string;
  width: number;
  height: number;
}

export interface AIPrediction {
  malignancyProbability: number;
  classification: 'Malignant' | 'Benign';
  suggestedBIRADS: number;
  confidence: number;
  featureUncertainty: number;
  attentionRegions: AttentionRegion[];
  inferenceTime: number;
}

export interface AttentionRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
  label: string;
}

export interface RadiologistAssessment {
  birads: number;
  notes: string;
  assessedBy: string;
  assessedAt: string;
}

export interface HistopathologyResult {
  status: 'Malignant' | 'Benign' | 'Pending' | 'Not Available';
  type?: string;
  grade?: string;
  biopsyDate?: string;
}

export interface CohortStats {
  totalCases: number;
  malignantCount: number;
  benignCount: number;
  meanProbability: number;
  stdDeviation: number;
  auc: number;
  sensitivity: number;
  specificity: number;
  distributions: DistributionBin[];
}

export interface DistributionBin {
  range: string;
  benign: number;
  malignant: number;
}

export interface BenchmarkData {
  modelName: string;
  backbone: string;
  pretrainingImages: number;
  validationImages: number;
  auc: number;
  aucCI: [number, number];
  sensitivity: number;
  specificity: number;
  folds: FoldResult[];
}

export interface FoldResult {
  fold: number;
  auc: number;
  sensitivity: number;
  specificity: number;
  trainSize: number;
  valSize: number;
}

export type NavigationTab = 'clinical' | 'research' | 'benchmark' | 'synopsis';
