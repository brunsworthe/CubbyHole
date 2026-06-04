export type VisibilityTier = 'private' | 'linked' | 'custom'

export type Capsule = {
  id: string
  title: string
  childName: string
  capturedAt: string
  modelUrl: string
  accentFrom: string
  accentVia: string
  visibilityTier: VisibilityTier
  customGrants: string[] // HouseholdLink IDs with explicit access
}

export type HouseholdLink = {
  id: string
  familyName: string
  email: string
  status: 'active' | 'pending'
  initials: string
  colorClass: string
}
