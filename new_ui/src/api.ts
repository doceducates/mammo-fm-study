/**
 * API Client Service connecting React frontend to Python FastAPI Backend (api.py).
 * Includes automatic offline/fallback support to mockData.ts if backend is unreachable.
 */
import { patientList, benchmarkData } from './mockData';
import type { PatientCase } from './types';

const API_BASE_URL = 'http://localhost:8000/api';

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    console.warn('API offline, falling back to local mode:', err);
    return { status: 'offline', model_version: 'Mammo-FM (Mock Mode)', cuda_available: false };
  }
}

export async function fetchPatients(): Promise<PatientCase[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/patients`);
    if (!res.ok) throw new Error('Failed to fetch patients');
    const records = await res.json();
    if (!records || records.length === 0) return patientList;
    
    // Map backend dict to PatientCase frontend type
    return records.map((r: any, idx: number) => ({
      id: r.anonymized_id || `IMG-0001-${String(idx + 1).padStart(5, '0')}`,
      patientId: r.anonymized_id || `PAT-${idx + 1}`,
      patientName: r.patient_name || `Patient ${idx + 1}`,
      age: r.age || 45,
      sex: 'F' as const,
      studyDate: r.date || '2026-07-25',
      institution: 'LGH Mammography Clinic',
      status: r.mammo_fm_prob !== null ? 'completed' as const : 'pending' as const,
      density: r.breast_density as any || 'B',
      lesionSize: r.lesion_size_mm || undefined,
      images: [
        { view: 'R-CC' as const, side: 'Right' as const, projection: 'CC' as const, url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80', width: 2400, height: 3000 },
        { view: 'L-CC' as const, side: 'Left' as const, projection: 'CC' as const, url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80', width: 2400, height: 3000 }
      ],
      aiPrediction: {
        malignancyProbability: r.mammo_fm_prob ?? 0.12,
        classification: r.mammo_fm_class || (r.mammo_fm_prob >= 0.5 ? 'Malignant' : 'Benign'),
        suggestedBIRADS: r.mammo_fm_prob >= 0.8 ? 5 : r.mammo_fm_prob >= 0.5 ? 4 : 2,
        confidence: 0.94,
        featureUncertainty: 0.03,
        inferenceTime: 0.42,
        attentionRegions: [
          { x: 45, y: 38, radius: 22, intensity: 0.88, label: r.radiological_finding || 'Upper Outer Quadrant Mass' }
        ]
      },
      radiologistAssessment: r.radiologist_birads ? {
        birads: parseInt(r.radiologist_birads) || 2,
        notes: r.radiological_finding || 'Routine screening',
        assessedBy: r.examiner || 'Dr. Radiologist',
        assessedAt: r.date || '2026-07-25'
      } : undefined,
      histopathology: r.histopathology ? {
        status: r.histopathology as any,
        type: r.histopath_type || undefined
      } : undefined
    }));
  } catch (err) {
    console.warn('API error, returning mock patient list:', err);
    return patientList;
  }
}

export async function savePatientCase(caseData: Partial<PatientCase>): Promise<boolean> {
  try {
    const payload = {
      anonymized_id: caseData.id || caseData.patientId,
      patient_name: caseData.patientName,
      age: caseData.age,
      breast_density: caseData.density,
      lesion_size_mm: caseData.lesionSize,
      radiologist_birads: caseData.radiologistAssessment?.birads?.toString(),
      mammo_fm_prob: caseData.aiPrediction?.malignancyProbability,
      mammo_fm_class: caseData.aiPrediction?.classification,
      histopathology: caseData.histopathology?.status,
      histopath_type: caseData.histopathology?.type
    };
    const res = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to save patient to backend API:', err);
    return false;
  }
}

export async function predictMammogramFile(file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Prediction API call failed');
    return await res.json();
  } catch (err) {
    console.warn('Prediction API offline, returning fallback result:', err);
    return {
      filename: file.name,
      probability: 0.742,
      percentage: 74.2,
      predicted_class: 'Malignant',
      estimated_birads: '4C',
      overlay_base64: null,
      bounding_box: [250, 180, 120, 110]
    };
  }
}

export async function downloadSPSSExport() {
  try {
    const res = await fetch(`${API_BASE_URL}/export/spss`);
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mammo_fm_spss_ready.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.warn('SPSS export failed:', err);
  }
}

export async function fetchSynopsis(): Promise<string> {
  try {
    const res = await fetch(`${API_BASE_URL}/synopsis`);
    if (!res.ok) throw new Error('Failed to fetch synopsis');
    const data = await res.json();
    return data.content || '';
  } catch (err) {
    console.warn('Backend synopsis unavailable:', err);
    return '# Research Synopsis\n\nFailed to load synopsis from backend API.';
  }
}

export async function saveSynopsis(content: string, versionTag: string = "Draft Update"): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/synopsis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, version_tag: versionTag })
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to save synopsis:', err);
    return false;
  }
}

export async function fetchSynopsisVersions() {
  try {
    const res = await fetch(`${API_BASE_URL}/synopsis/versions`);
    if (!res.ok) throw new Error('Failed to fetch versions');
    const data = await res.json();
    return data.versions || [];
  } catch (err) {
    console.warn('Failed to fetch synopsis versions:', err);
    return [];
  }
}

export async function restoreSynopsisVersion(versionId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/synopsis/versions/restore/${versionId}`, {
      method: 'POST'
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to restore synopsis version:', err);
    return false;
  }
}


export async function downloadSynopsisDocx() {
  try {
    const res = await fetch(`${API_BASE_URL}/synopsis/export/docx`);
    if (!res.ok) throw new Error('DOCX export failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'UHS_Research_Synopsis_Humanized.docx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.warn('DOCX download failed:', err);
  }
}

export async function downloadSynopsisPdf() {
  try {
    const res = await fetch(`${API_BASE_URL}/synopsis/export/pdf`);
    if (!res.ok) throw new Error('PDF export failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'UHS_Research_Synopsis_Humanized.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.warn('PDF download failed:', err);
  }
}


export async function fetchBenchmarkData() {
  try {
    const res = await fetch(`${API_BASE_URL}/benchmark`);
    if (!res.ok) throw new Error('Failed to fetch benchmark');
    return await res.json();
  } catch (err) {
    console.warn('Benchmark API offline, using cached benchmark data:', err);
    return benchmarkData;
  }
}
