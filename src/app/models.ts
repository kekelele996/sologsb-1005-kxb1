export type Role = 'author' | 'examiner' | 'viewer'

export interface Claim {
  id: string
  number: number
  title: string
  text: string
  independent: boolean
}

export interface Paragraph {
  id: string
  section: string
  text: string
}

export interface Feature {
  id: string
  claimId: string
  label: string
  text: string
  parentId: string | null
  referenceIds: string[]
  supportIds: string[]
  ownerRole: Role
}

export type EvidenceStatus = 'pending' | 'confirmed'

export interface EvidenceRecord {
  id: string
  featureId: string
  paragraphId: string
  /** 映射时摘录的说明书原文，用于核对具体引用了哪一句 */
  excerpt: string
  /** 建立映射时填写的支持理由 */
  reason: string
  status: EvidenceStatus
  /** 建立证据的角色（代理人 / 审查员） */
  createdByRole: Role
  createdByName: string
  createdAt: string
  /** 审查员确认后固定的确认信息 */
  confirmedByRole: Role | null
  confirmedByName: string | null
  confirmedAt: string | null
}

export interface Annotation {
  id: string
  featureId: string
  authorRole: Role
  authorName: string
  text: string
  updatedAt: string
}

export interface OrphanMapping {
  id: string
  featureLabel: string
  paragraphId: string
  reason: string
}

export interface ClaimVersion {
  id: string
  name: string
  createdAt: string
  claims: Claim[]
  features: Feature[]
}

export interface Position {
  tab: string
  claimId: string
  featureId: string | null
  scrollY: number
}

export interface WorkbenchState {
  claims: Claim[]
  paragraphs: Paragraph[]
  features: Feature[]
  evidences: EvidenceRecord[]
  annotations: Annotation[]
  orphanMappings: OrphanMapping[]
  versions: ClaimVersion[]
  role: Role
  selectedClaimId: string
  selectedFeatureId: string | null
  activeTab: string
  currentUserRole: Role
}

export interface ValidationIssue {
  id: string
  severity: 'error' | 'warning'
  type: 'cycle' | 'missing-support' | 'evidence-pending' | 'orphan-mapping' | 'empty-feature'
  featureId?: string
  title: string
  detail: string
}
