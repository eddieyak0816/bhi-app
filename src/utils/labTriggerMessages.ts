export type TriggerLevel = 'success' | 'warning' | 'danger'

export interface TriggerMessage {
  level: TriggerLevel
  headline: string
  body: string
  actions: string[]
  escalate?: string
}

export interface SavedResult {
  markerName: string
  value: number
  unit?: string
}

// Returns a message for a single marker result, or null if no trigger applies.
export function getMarkerMessage(
  markerName: string,
  value: number,
  sex?: 'male' | 'female' | ''
): TriggerMessage | null {
  const name = markerName.toLowerCase()

  // HOMA-IR (derived — not a raw lab marker, but kept here for combined alert logic)
  // Individual HOMA-IR triggers are evaluated via Fasting Insulin + Fasting Glucose upstream.
  // The raw marker triggers below cover the individual inputs.

  // Fasting Glucose
  if (name.includes('fasting glucose') || name === 'glucose') {
    if (value >= 100 && value <= 125) {
      return {
        level: 'warning',
        headline: 'Your fasting glucose is elevated',
        body: 'Your fasting glucose is in the pre-diabetic range. Early action can prevent progression.',
        actions: [
          'Reduce refined carbohydrates and added sugars',
          'Walk for 10–15 minutes after meals',
          'Prioritize 7–8 hours of quality sleep',
          'Include protein with every meal to blunt glucose spikes',
        ],
      }
    }
    if (value >= 126) {
      return {
        level: 'danger',
        headline: 'Your fasting glucose is significantly elevated',
        body: 'Your fasting glucose suggests impaired glucose regulation.',
        actions: [
          'Follow a structured whole-food nutrition plan',
          'Add resistance training 3x per week',
          'Consider time-restricted eating (e.g. 8–10 hour eating window)',
        ],
        escalate: 'We recommend reviewing these results with a healthcare provider.',
      }
    }
  }

  // Fasting Insulin (used to compute HOMA-IR)
  if (name.includes('fasting insulin') || name === 'insulin') {
    if (value >= 2.0 && value <= 2.5) {
      return {
        level: 'warning',
        headline: 'Your insulin sensitivity is starting to decline',
        body: 'Your insulin level is in a range that may indicate early insulin resistance.',
        actions: [
          'Include protein with each meal',
          'Reduce processed carbohydrates',
          'Walk after meals to improve glucose uptake',
          'Aim for 7–8 hours of sleep per night',
        ],
      }
    }
    if (value > 2.5) {
      return {
        level: 'danger',
        headline: 'Your results suggest reduced insulin sensitivity',
        body: 'Your insulin level is elevated, which may indicate insulin resistance.',
        actions: [
          'Follow a structured nutrition plan focused on whole foods',
          'Add resistance training at least 3x per week',
          'Consider time-restricted eating (e.g. 8–10 hour eating window)',
        ],
        escalate: 'We recommend reviewing these results with a healthcare provider.',
      }
    }
  }

  // hs-CRP (inflammation)
  if (name.includes('hs-crp') || name.includes('crp') || name.includes('c-reactive')) {
    if (value >= 1 && value <= 3) {
      return {
        level: 'warning',
        headline: 'Your inflammation markers are slightly elevated',
        body: 'Low-grade inflammation can contribute to long-term health risks if left unaddressed.',
        actions: [
          'Prioritize 7–9 hours of quality sleep',
          'Add omega-3 rich foods (salmon, sardines, walnuts)',
          'Reduce processed foods and alcohol',
          'Incorporate daily movement or light exercise',
        ],
      }
    }
    if (value > 3) {
      return {
        level: 'danger',
        headline: 'Your inflammation level is elevated',
        body: 'Elevated hs-CRP is associated with increased cardiovascular and metabolic risk.',
        actions: [
          'Focus on a whole-food, anti-inflammatory diet',
          'Prioritize sleep and stress reduction',
          'Add daily movement — even a 20-minute walk helps',
        ],
        escalate: 'A follow-up with a healthcare provider is recommended.',
      }
    }
  }

  // Vitamin D
  if (name.includes('vitamin d') || name.includes('vit d') || name === '25-oh vitamin d') {
    if (value >= 20 && value < 50) {
      return {
        level: 'warning',
        headline: 'Your Vitamin D level is below optimal',
        body: 'Vitamin D supports immune function, bone health, and mood regulation.',
        actions: [
          'Get 15–20 minutes of direct sun exposure daily when possible',
          'Consider a Vitamin D3 supplement (consult your provider for dosing)',
          'Eat Vitamin D-rich foods: fatty fish, egg yolks, fortified dairy',
        ],
      }
    }
    if (value < 20) {
      return {
        level: 'danger',
        headline: 'Your Vitamin D level is low',
        body: 'A Vitamin D level below 20 ng/mL is considered deficient and may affect multiple body systems.',
        actions: [
          'Start a Vitamin D3 supplement — dosing should be guided by your provider',
          'Recheck levels in 8–12 weeks after supplementing',
        ],
        escalate: 'We recommend reviewing this with a provider to determine the right supplementation dose.',
      }
    }
  }

  // Vitamin B12
  if (name.includes('vitamin b12') || name.includes('b12') || name.includes('cobalamin')) {
    if (value >= 300 && value < 500) {
      return {
        level: 'warning',
        headline: 'Your B12 level is in a lower range',
        body: 'Vitamin B12 is essential for nerve function, energy, and red blood cell production.',
        actions: [
          'Increase B12-rich foods: meat, fish, eggs, dairy',
          'Consider a B12 supplement, especially if you follow a plant-based diet',
        ],
      }
    }
    if (value < 300) {
      return {
        level: 'danger',
        headline: 'Your B12 level is low',
        body: 'Low B12 can cause fatigue, neurological symptoms, and anemia over time.',
        actions: [
          'Start targeted B12 supplementation (methylcobalamin preferred)',
          'Re-evaluate levels after 8–12 weeks',
        ],
        escalate: 'A provider can help determine the best supplementation approach and rule out absorption issues.',
      }
    }
  }

  // Triglycerides
  if (name.includes('triglyceride') || name === 'tg') {
    if (value >= 100 && value < 200) {
      return {
        level: 'warning',
        headline: 'Your triglycerides are slightly elevated',
        body: 'Mildly elevated triglycerides are often diet and lifestyle related.',
        actions: [
          'Reduce added sugars and refined carbohydrates',
          'Limit alcohol intake',
          'Increase physical activity',
          'Pay attention to meal timing — avoid large late-night meals',
        ],
      }
    }
    if (value >= 200) {
      return {
        level: 'danger',
        headline: 'Your triglyceride levels are elevated',
        body: 'High triglycerides increase cardiovascular risk and are often tied to metabolic health.',
        actions: [
          'Switch to a whole-food nutrition plan — prioritize vegetables, protein, and healthy fats',
          'Add regular exercise (aim for 150+ minutes per week)',
          'Work on weight management if applicable',
        ],
        escalate: 'We recommend reviewing this with a healthcare provider.',
      }
    }
  }

  // HDL (sex-specific thresholds)
  if (name.includes('hdl')) {
    const lowThreshold = sex === 'female' ? 50 : 40
    if (value < lowThreshold) {
      return {
        level: 'warning',
        headline: 'Your HDL is lower than optimal',
        body: 'HDL ("good" cholesterol) helps remove other forms of cholesterol from your bloodstream.',
        actions: [
          'Increase aerobic physical activity (brisk walking, cycling, swimming)',
          'Add healthy fats: olive oil, avocado, nuts, fatty fish',
          'Prioritize sleep and reduce chronic stress',
          'Quit smoking if applicable — it significantly raises HDL',
        ],
      }
    }
  }

  return null
}

// Evaluates a combined metabolic alert: HOMA-IR >2, TG/HDL >3, hs-CRP >3 simultaneously.
// Pass the full set of saved results to check for the combined condition.
export function getCombinedMetabolicAlert(results: SavedResult[]): TriggerMessage | null {
  const get = (namePart: string) =>
    results.find(r => r.markerName.toLowerCase().includes(namePart))?.value

  const insulin = get('fasting insulin') ?? get('insulin')
  const glucose = get('fasting glucose') ?? get('glucose')
  const tg = get('triglyceride') ?? get('tg')
  const hdl = get('hdl')
  const crp = get('hs-crp') ?? get('crp') ?? get('c-reactive')

  let homaIr: number | undefined
  if (insulin !== undefined && glucose !== undefined) {
    homaIr = (insulin * glucose) / 405
  }

  const tgHdl = tg !== undefined && hdl !== undefined && hdl > 0 ? tg / hdl : undefined

  if (
    homaIr !== undefined && homaIr > 2 &&
    tgHdl !== undefined && tgHdl > 3 &&
    crp !== undefined && crp > 3
  ) {
    return {
      level: 'danger',
      headline: 'Multiple markers suggest your metabolic health may need attention',
      body: 'Three key metabolic indicators — insulin resistance, triglyceride/HDL ratio, and inflammation — are all elevated at the same time.',
      actions: [
        'Follow a structured lifestyle plan focusing on nutrition, sleep, and movement',
        'Prioritize reducing processed foods, added sugars, and alcohol',
        'Aim for 150+ minutes of moderate exercise per week',
        'Track improvements over the next 60–90 days',
      ],
      escalate: 'We recommend a comprehensive review with a healthcare provider.',
    }
  }

  return null
}

// Returns all applicable messages for a batch of saved results.
export function getTriggerMessages(
  results: SavedResult[],
  sex?: 'male' | 'female' | ''
): TriggerMessage[] {
  const messages: TriggerMessage[] = []

  for (const r of results) {
    const msg = getMarkerMessage(r.markerName, r.value, sex)
    if (msg) messages.push(msg)
  }

  const combined = getCombinedMetabolicAlert(results)
  if (combined) messages.push(combined)

  // Positive reinforcement if everything looks good
  if (messages.length === 0 && results.length > 0) {
    messages.push({
      level: 'success',
      headline: 'Great job — your results are in an optimal range',
      body: 'Maintaining these levels supports long-term health, energy, and performance.',
      actions: [
        'Keep doing what you\'re doing',
        'You\'re building long-term health resilience',
      ],
    })
  }

  return messages
}
