export type LabMarker = { id: string; name: string; unit?: string; min_normal?: number; max_normal?: number }
export type LogicRule = { marker_id: string; min_value: number; max_value: number; tag_to_apply: string }
export type Resource = { type: string; title: string; description?: string; link_url?: string; tags: string[] }
export type SampleData = { lab_markers: LabMarker[]; logic_rules: LogicRule[]; resources: Resource[] }

export function loadSampleData(): SampleData {
  const vitDId = '11111111-1111-4111-8111-111111111111'
  return {
    lab_markers: [
      { id: vitDId, name: 'Vitamin D', unit: 'ng/mL', min_normal: 30, max_normal: 100 },
      { id: 'glucose', name: 'Glucose', unit: 'mg/dL', min_normal: 70, max_normal: 100 }
    ],
    logic_rules: [
      { marker_id: vitDId, min_value: 0, max_value: 30, tag_to_apply: 'Low_D' },
      { marker_id: vitDId, min_value: 30.1, max_value: 1000, tag_to_apply: 'Normal_D' }
    ],
    resources: [
      { type: 'video', title: 'Understanding Low Vit D', tags: ['Low_D'] },
      { type: 'doctor', title: 'Dr. Jane Smith', tags: ['Low_D'] },
      { type: 'article', title: 'Why Vitamin D matters', tags: ['Normal_D'] }
    ]
  }
}
