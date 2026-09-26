import { Injectable, OnDestroy } from '@angular/core'
import { BehaviorSubject, map, type Observable } from 'rxjs'
import type { Annotation, Claim, ClaimVersion, EvidenceViewStatus, Feature, Paragraph, Position, Role, SupportEvidence, ValidationIssue, WorkbenchState } from './models'

const STORAGE_KEY = 'patent-claim-mapping-workbench-v1'
const POSITION_KEY = 'patent-claim-mapping-position-v1'

const initialClaims: Claim[] = [
  { id: 'claim-1', number: 1, title: '一种自适应展柜环境控制装置', independent: true, text: '一种自适应展柜环境控制装置，包括：柜体；环境传感模块，设置于所述柜体内并用于采集温湿度数据；以及控制模块，与所述环境传感模块通信，并根据所述温湿度数据调节所述柜体的微环境。' },
  { id: 'claim-2', number: 2, title: '传感模块的布置方式', independent: false, text: '根据权利要求1所述的装置，其特征在于，所述环境传感模块包括沿所述柜体对角线布置的多个温湿度传感器。' },
  { id: 'claim-3', number: 3, title: '控制模块的调节策略', independent: false, text: '根据权利要求1所述的装置，其特征在于，所述控制模块基于历史数据与当前数据之间的偏差分级调节除湿单元。' }
]
const initialParagraphs: Paragraph[] = [
  { id: 'para-0012', section: '说明书 [0012]', text: '柜体1形成用于陈列文物的封闭空间。环境传感模块2安装于柜体内部，可采集温度、相对湿度等环境数据，并将数据发送至控制模块3。' },
  { id: 'para-0018', section: '说明书 [0018]', text: '在一种实施方式中，多个温湿度传感器沿柜体对角线布置，由此可降低局部气流造成的测量偏差。传感器数量可根据柜体容积设定。' },
  { id: 'para-0024', section: '说明书 [0024]', text: '控制模块可比较当前湿度与预设区间，并结合历史变化趋势生成调节等级。当偏差持续超过阈值时，控制模块启动除湿单元并提高调节频率。' },
  { id: 'para-0031', section: '说明书 [0031]', text: '控制模块与传感模块之间可以采用有线或无线通信。通信链路可周期传输数据，传输周期例如为十秒至五分钟。' },
  { id: 'para-0040', section: '说明书 [0040]', text: '微环境调节包括湿度调节、温度调节及气体交换。控制策略可记录执行结果，用于后续趋势判断。' }
]
const initialFeatures: Feature[] = [
  { id: 'feature-a', claimId: 'claim-1', label: 'A · 柜体', text: '柜体', parentId: null, referenceIds: [], ownerRole: 'author' },
  { id: 'feature-b', claimId: 'claim-1', label: 'B · 环境传感模块', text: '设置于柜体内，用于采集温湿度数据', parentId: 'feature-a', referenceIds: [], ownerRole: 'author' },
  { id: 'feature-c', claimId: 'claim-1', label: 'C · 控制模块通信', text: '与环境传感模块通信', parentId: 'feature-a', referenceIds: ['feature-b'], ownerRole: 'author' },
  { id: 'feature-d', claimId: 'claim-1', label: 'D · 调节微环境', text: '根据温湿度数据调节柜体微环境', parentId: null, referenceIds: ['feature-b', 'feature-c'], ownerRole: 'author' },
  { id: 'feature-e', claimId: 'claim-2', label: 'E · 对角线布置', text: '多个温湿度传感器沿柜体对角线布置', parentId: null, referenceIds: [], ownerRole: 'author' },
  { id: 'feature-f', claimId: 'claim-3', label: 'F · 分级调节', text: '基于历史数据与当前数据的偏差分级调节除湿单元', parentId: null, referenceIds: [], ownerRole: 'author' }
]
const EXAMINER = '审查员 · 李岚'
function evidence(id: string, featureId: string, paragraphId: string, excerpt: string, reason: string, confirmed: boolean): SupportEvidence {
  const paragraph = initialParagraphs.find(item => item.id === paragraphId)
  const feature = initialFeatures.find(item => item.id === featureId)
  return {
    id, featureId, paragraphId, excerpt, reason,
    status: confirmed ? 'confirmed' : 'pending', createdBy: 'author', createdAt: '2026-09-24T02:00:00.000Z',
    confirmedBy: confirmed ? EXAMINER : null, confirmedAt: confirmed ? '2026-09-25T02:30:00.000Z' : null,
    paragraphSnapshot: paragraph?.text || '', featureSnapshot: feature?.text || ''
  }
}
const initialEvidence: SupportEvidence[] = [
  evidence('evidence-a-0012', 'feature-a', 'para-0012', '柜体1形成用于陈列文物的封闭空间。', '直接记载柜体结构，对应特征A。', true),
  evidence('evidence-b-0012', 'feature-b', 'para-0012', '环境传感模块2安装于柜体内部，可采集温度、相对湿度等环境数据', '说明传感模块的设置位置与采集对象。', true),
  evidence('evidence-b-0018', 'feature-b', 'para-0018', '多个温湿度传感器沿柜体对角线布置', '传感器布置方式支持“采集温湿度数据”。', false),
  evidence('evidence-c-0012', 'feature-c', 'para-0012', '并将数据发送至控制模块3。', '数据发送关系对应模块间通信。', false),
  evidence('evidence-c-0031', 'feature-c', 'para-0031', '控制模块与传感模块之间可以采用有线或无线通信。', '明确两模块之间的通信连接。', true),
  evidence('evidence-d-0024', 'feature-d', 'para-0024', '控制模块可比较当前湿度与预设区间，并结合历史变化趋势生成调节等级。', '根据温湿度数据进行调节的控制逻辑。', true),
  evidence('evidence-d-0040', 'feature-d', 'para-0040', '微环境调节包括湿度调节、温度调节及气体交换。', '界定“调节微环境”的具体含义。', false),
  evidence('evidence-e-0018', 'feature-e', 'para-0018', '多个温湿度传感器沿柜体对角线布置，由此可降低局部气流造成的测量偏差。', '与特征E的对角线布置完全一致。', true),
  evidence('evidence-f-0024', 'feature-f', 'para-0024', '当偏差持续超过阈值时，控制模块启动除湿单元并提高调节频率。', '偏差分级调节除湿单元的实施方式。', false)
]
const initialAnnotations: Annotation[] = [
  { id: 'annotation-1', featureId: 'feature-b', authorRole: 'examiner', authorName: '审查员 · 李岚', text: '“温湿度数据”是否包括露点等派生数据？建议在从属权利要求中限定。', updatedAt: '2026-09-24T03:10:00.000Z' },
  { id: 'annotation-2', featureId: 'feature-d', authorRole: 'author', authorName: '代理人 · 陈昊', text: '[0024] 已支持分级调节，发布前补充除湿单元与通信模块的连接关系。', updatedAt: '2026-09-24T04:05:00.000Z' }
]
function demoState(): WorkbenchState {
  return {
    claims: initialClaims, paragraphs: initialParagraphs, features: initialFeatures, evidence: initialEvidence,
    annotations: initialAnnotations, orphanMappings: [], versions: [],
    role: 'author', currentUserRole: 'author', selectedClaimId: 'claim-1', selectedFeatureId: 'feature-b', activeTab: 'mapping'
  }
}
function clone<T>(value: T): T { return structuredClone(value) }

@Injectable({ providedIn: 'root' })
export class WorkbenchService implements OnDestroy {
  private readonly initialState = this.loadState()
  private readonly stateSubject = new BehaviorSubject<WorkbenchState>(this.initialState)
  private readonly historySubject = new BehaviorSubject<{ past: number; future: number }>({ past: 0, future: 0 })
  private past: WorkbenchState[] = []
  private future: WorkbenchState[] = []

  readonly state$ = this.stateSubject.asObservable()
  readonly history$ = this.historySubject.asObservable()
  readonly claims$ = this.state$.pipe(map(state => state.claims))
  readonly paragraphs$ = this.state$.pipe(map(state => state.paragraphs))
  readonly features$ = this.state$.pipe(map(state => state.features))
  readonly annotations$ = this.state$.pipe(map(state => state.annotations))
  readonly role$ = this.state$.pipe(map(state => state.role))
  readonly selectedClaim$ = this.state$.pipe(map(state => state.claims.find(claim => claim.id === state.selectedClaimId) || state.claims[0]))
  readonly selectedFeature$ = this.state$.pipe(map(state => state.features.find(feature => feature.id === state.selectedFeatureId) || null))
  readonly issues$ = this.state$.pipe(map(state => this.validate(state)))

  constructor() {
    if (typeof window !== 'undefined') window.addEventListener('beforeunload', () => this.savePosition())
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') window.removeEventListener('beforeunload', () => this.savePosition())
  }

  get snapshot(): WorkbenchState { return clone(this.stateSubject.value) }
  get canUndo(): boolean { return this.past.length > 0 }
  get canRedo(): boolean { return this.future.length > 0 }

  selectClaim(id: string): void {
    this.patchState(state => { state.selectedClaimId = id; state.selectedFeatureId = state.features.find(feature => feature.claimId === id)?.id || null })
    this.savePosition()
  }

  selectFeature(id: string | null): void {
    this.patchState(state => { state.selectedFeatureId = id })
    this.savePosition()
  }

  setRole(role: Role): void {
    this.patchState(state => { state.role = role; state.currentUserRole = role })
  }

  setTab(tab: string): void {
    this.patchState(state => { state.activeTab = tab })
    this.savePosition()
  }

  updateClaim(patch: Partial<Claim>): void {
    this.commit(state => {
      const claim = state.claims.find(item => item.id === state.selectedClaimId)
      if (claim) Object.assign(claim, patch)
    })
  }

  addClaim(): void {
    this.commit(state => {
      const number = Math.max(0, ...state.claims.map(claim => claim.number)) + 1
      const claim: Claim = { id: `claim-${Date.now()}`, number, title: `权利要求 ${number}`, independent: false, text: '请录入权利要求正文。' }
      state.claims.push(claim)
      state.selectedClaimId = claim.id
      state.selectedFeatureId = null
    })
  }

  addParagraph(): void {
    if (this.stateSubject.value.role === 'viewer') return
    this.commit(state => {
      const next = state.paragraphs.length + 1
      state.paragraphs.push({ id: `para-${Date.now()}`, section: `说明书 [${String(next * 5).padStart(4, '0')}]`, text: '' })
    })
  }

  updateParagraph(id: string, patch: Partial<Paragraph>): void {
    if (this.stateSubject.value.role === 'viewer') return
    this.commit(state => {
      const paragraph = state.paragraphs.find(item => item.id === id)
      if (paragraph) Object.assign(paragraph, patch)
    })
  }

  deleteParagraph(id: string): void {
    if (this.stateSubject.value.role === 'viewer') return
    this.commit(state => {
      state.paragraphs = state.paragraphs.filter(item => item.id !== id)
      state.evidence = state.evidence.filter(item => item.paragraphId !== id)
      state.orphanMappings = state.orphanMappings.filter(item => item.paragraphId !== id)
    })
  }

  addFeature(): void {
    if (this.stateSubject.value.role === 'viewer') return
    this.commit(state => {
      const feature: Feature = {
        id: `feature-${Date.now()}`, claimId: state.selectedClaimId,
        label: `新特征 ${state.features.filter(item => item.claimId === state.selectedClaimId).length + 1}`,
        text: '', parentId: null, referenceIds: [], ownerRole: state.role
      }
      state.features.push(feature)
      state.selectedFeatureId = feature.id
    })
  }

  updateFeature(id: string, patch: Partial<Feature>): void {
    if (this.stateSubject.value.role === 'viewer') return
    this.commit(state => {
      const feature = state.features.find(item => item.id === id)
      if (feature) Object.assign(feature, patch)
    })
  }

  deleteFeature(id: string): void {
    if (this.stateSubject.value.role === 'viewer') return
    this.commit(state => {
      const feature = state.features.find(item => item.id === id)
      if (!feature) return
      state.evidence.filter(item => item.featureId === id).forEach(item => state.orphanMappings.push({
        id: `orphan-${Date.now()}-${item.paragraphId}`, featureLabel: feature.label, paragraphId: item.paragraphId,
        reason: `技术特征“${feature.label}”已删除，但支持段落映射仍被保留。`
      }))
      state.evidence = state.evidence.filter(item => item.featureId !== id)
      state.features = state.features.filter(item => item.id !== id)
      state.features.forEach(item => {
        item.referenceIds = item.referenceIds.filter(refId => refId !== id)
        if (item.parentId === id) item.parentId = null
      })
      state.annotations = state.annotations.filter(item => item.featureId !== id)
      state.selectedFeatureId = state.features.find(item => item.claimId === state.selectedClaimId)?.id || null
    })
  }

  toggleParagraphMapping(featureId: string, paragraphId: string): void {
    if (this.stateSubject.value.role === 'viewer') return
    this.commit(state => {
      const feature = state.features.find(item => item.id === featureId)
      const paragraph = state.paragraphs.find(item => item.id === paragraphId)
      if (!feature || !paragraph) return
      const existing = state.evidence.find(item => item.featureId === featureId && item.paragraphId === paragraphId)
      if (existing) state.evidence = state.evidence.filter(item => item.id !== existing.id)
      else state.evidence.push({
        id: `evidence-${Date.now()}`, featureId, paragraphId,
        excerpt: paragraph.text, reason: '',
        status: 'pending', createdBy: state.role, createdAt: new Date().toISOString(),
        confirmedBy: null, confirmedAt: null,
        paragraphSnapshot: paragraph.text, featureSnapshot: feature.text
      })
      state.orphanMappings = state.orphanMappings.filter(item => item.paragraphId !== paragraphId)
    })
  }

  updateEvidence(id: string, patch: Partial<Pick<SupportEvidence, 'excerpt' | 'reason'>>): void {
    if (this.stateSubject.value.role === 'viewer') return
    this.commit(state => {
      const item = state.evidence.find(entry => entry.id === id)
      if (!item) return
      Object.assign(item, patch)
      item.status = 'pending'
      item.confirmedBy = null
      item.confirmedAt = null
    })
  }

  confirmEvidence(id: string): void {
    if (this.stateSubject.value.role !== 'examiner') return
    this.commit(state => {
      const item = state.evidence.find(entry => entry.id === id)
      if (!item) return
      const paragraph = state.paragraphs.find(entry => entry.id === item.paragraphId)
      const feature = state.features.find(entry => entry.id === item.featureId)
      item.status = 'confirmed'
      item.confirmedBy = EXAMINER
      item.confirmedAt = new Date().toISOString()
      item.paragraphSnapshot = paragraph?.text || ''
      item.featureSnapshot = feature?.text || ''
    })
  }

  reopenEvidence(id: string): void {
    if (this.stateSubject.value.role !== 'examiner') return
    this.commit(state => {
      const item = state.evidence.find(entry => entry.id === id)
      if (!item) return
      item.status = 'pending'
      item.confirmedBy = null
      item.confirmedAt = null
    })
  }

  evidenceFor(featureId: string, state = this.stateSubject.value): SupportEvidence[] {
    return state.evidence.filter(item => item.featureId === featureId)
  }

  evidenceStatus(item: SupportEvidence, state = this.stateSubject.value): EvidenceViewStatus {
    if (item.status !== 'confirmed') return 'pending'
    const paragraph = state.paragraphs.find(entry => entry.id === item.paragraphId)
    const feature = state.features.find(entry => entry.id === item.featureId)
    if (!paragraph || !feature) return 'pending'
    return paragraph.text === item.paragraphSnapshot && feature.text === item.featureSnapshot ? 'confirmed' : 'stale'
  }

  clearOrphan(id: string): void {
    this.commit(state => { state.orphanMappings = state.orphanMappings.filter(item => item.id !== id) })
  }

  addAnnotation(featureId: string, text: string): void {
    const trimmed = text.trim()
    if (!trimmed) return
    const role = this.stateSubject.value.role
    const names: Record<Role, string> = { author: '代理人 · 陈昊', examiner: '审查员 · 李岚', viewer: '观察者' }
    this.commit(state => state.annotations.push({
      id: `annotation-${Date.now()}`, featureId, authorRole: role, authorName: names[role], text: trimmed, updatedAt: new Date().toISOString()
    }))
  }

  updateAnnotation(id: string, text: string): void {
    this.commit(state => {
      const annotation = state.annotations.find(item => item.id === id)
      if (annotation && annotation.authorRole === state.role) annotation.text = text
    })
  }

  deleteAnnotation(id: string): void {
    this.commit(state => {
      const annotation = state.annotations.find(item => item.id === id)
      if (annotation && annotation.authorRole === state.role) state.annotations = state.annotations.filter(item => item.id !== id)
    })
  }

  createVersion(name?: string): void {
    this.commit(state => {
      state.versions.unshift({
        id: `version-${Date.now()}`, name: name?.trim() || `快照 ${new Date().toLocaleString('zh-CN', { hour12: false })}`,
        createdAt: new Date().toISOString(), claims: clone(state.claims), features: clone(state.features)
      })
    })
  }

  restoreVersion(id: string): void {
    this.commit(state => {
      const version = state.versions.find(item => item.id === id)
      if (!version) return
      state.claims = clone(version.claims)
      state.features = clone(version.features)
      const featureIds = new Set(state.features.map(feature => feature.id))
      state.evidence.filter(item => !featureIds.has(item.featureId)).forEach(item => state.orphanMappings.push({
        id: `orphan-${Date.now()}-${item.paragraphId}`, featureLabel: item.featureId, paragraphId: item.paragraphId,
        reason: '恢复历史版本后，原特征已不存在，但支持段落映射仍被保留。'
      }))
      state.evidence = state.evidence.filter(item => featureIds.has(item.featureId))
      if (!state.claims.some(claim => claim.id === state.selectedClaimId)) state.selectedClaimId = state.claims[0]?.id || ''
      state.selectedFeatureId = state.features.find(feature => feature.claimId === state.selectedClaimId)?.id || null
    })
  }

  undo(): void {
    const previous = this.past.pop()
    if (!previous) return
    this.future.push(clone(this.stateSubject.value))
    this.stateSubject.next(previous)
    this.updateHistory()
    this.saveState()
  }

  redo(): void {
    const next = this.future.pop()
    if (!next) return
    this.past.push(clone(this.stateSubject.value))
    this.stateSubject.next(next)
    this.updateHistory()
    this.saveState()
  }

  savePosition(): void {
    if (typeof localStorage === 'undefined') return
    const state = this.stateSubject.value
    const position: Position = { tab: state.activeTab, claimId: state.selectedClaimId, featureId: state.selectedFeatureId, scrollY: window.scrollY }
    localStorage.setItem(POSITION_KEY, JSON.stringify(position))
    this.saveState()
  }

  readPosition(): Position {
    if (typeof localStorage === 'undefined') return { tab: this.initialState.activeTab, claimId: this.initialState.selectedClaimId, featureId: this.initialState.selectedFeatureId, scrollY: 0 }
    try { return { ...JSON.parse(localStorage.getItem(POSITION_KEY) || '{}'), ...this.stateSubject.value } } catch { return { tab: 'mapping', claimId: this.initialState.selectedClaimId, featureId: this.initialState.selectedFeatureId, scrollY: 0 } }
  }

  exportJson(): string {
    return JSON.stringify({ ...this.snapshot, evidenceReport: this.evidenceReport(), validationIssues: this.validate(this.stateSubject.value) }, null, 2)
  }

  evidenceReport(state = this.stateSubject.value): Array<Record<string, string>> {
    const statusLabels: Record<EvidenceViewStatus, string> = { pending: '待确认', confirmed: '已确认', stale: '已退回待确认（内容已变更）' }
    return state.evidence.map(item => {
      const feature = state.features.find(entry => entry.id === item.featureId)
      const claim = state.claims.find(entry => entry.id === feature?.claimId)
      return {
        claimNumber: String(claim?.number || ''), featureId: item.featureId, featureLabel: feature?.label || item.featureId,
        paragraphSection: state.paragraphs.find(entry => entry.id === item.paragraphId)?.section || item.paragraphId,
        status: statusLabels[this.evidenceStatus(item, state)],
        excerpt: item.excerpt, reason: item.reason,
        confirmedBy: item.confirmedBy || '', confirmedAt: item.confirmedAt || ''
      }
    })
  }

  exportCsv(): string {
    const state = this.stateSubject.value
    const report = this.evidenceReport(state)
    const rows: string[][] = []
    state.features.forEach(feature => {
      const base = [
        String(state.claims.find(claim => claim.id === feature.claimId)?.number || ''), feature.label, feature.text,
        state.features.find(item => item.id === feature.parentId)?.label || '',
        feature.referenceIds.map(id => state.features.find(item => item.id === id)?.label || id).join('；')
      ]
      const evidenceRows = report.filter(item => item.featureId === feature.id)
      if (!evidenceRows.length) rows.push([...base, '', '未建立映射', '', '', '', '', ''])
      else evidenceRows.forEach(item => rows.push([...base, item.paragraphSection, item.status, item.excerpt, item.reason, item.confirmedBy, item.confirmedAt]))
    })
    const csv = [['权利要求', '技术特征', '特征内容', '父级特征', '引用特征', '支持段落', '证据状态', '原文摘录', '映射理由', '确认人', '确认时间'], ...rows]
      .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    return `\uFEFF${csv}`
  }

  validate(state = this.stateSubject.value): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    for (const feature of state.features) {
      if (!feature.text.trim()) issues.push({ id: `empty-${feature.id}`, severity: 'warning', type: 'empty-feature', featureId: feature.id, title: `${feature.label} 内容为空`, detail: '请补全技术特征文字，避免映射对象不明确。' })
      const items = state.evidence.filter(item => item.featureId === feature.id)
      if (!items.length) issues.push({ id: `support-${feature.id}`, severity: 'error', type: 'missing-support', featureId: feature.id, title: `${feature.label} 缺少说明书依据`, detail: '至少为一个说明书段落建立支持映射。' })
      else {
        const unconfirmed = items.filter(item => this.evidenceStatus(item, state) !== 'confirmed')
        if (unconfirmed.length) issues.push({ id: `evidence-${feature.id}`, severity: 'warning', type: 'evidence-pending', featureId: feature.id, title: `${feature.label} 有 ${unconfirmed.length} 条证据待确认`, detail: '证据尚未经审查员确认，或段落/特征内容变更后被退回，请核对原文摘录后确认。' })
      }
      if (this.hasReferenceCycle(feature, state.features)) issues.push({ id: `cycle-${feature.id}`, severity: 'error', type: 'cycle', featureId: feature.id, title: `${feature.label} 存在循环引用`, detail: '特征层级或引用关系形成闭环，请移除其中一条关系。' })
    }
    state.orphanMappings.forEach(item => issues.push({ id: item.id, severity: 'warning', type: 'orphan-mapping', title: '存在待清理映射', detail: item.reason }))
    return issues
  }

  private hasReferenceCycle(start: Feature, features: Feature[]): boolean {
    const visited = new Set<string>()
    const visit = (id: string): boolean => {
      if (id === start.id && visited.size > 0) return true
      if (visited.has(id)) return false
      visited.add(id)
      const feature = features.find(item => item.id === id)
      if (!feature) return false
      if (feature.parentId && visit(feature.parentId)) return true
      return feature.referenceIds.some(visit)
    }
    return visit(start.id)
  }

  private commit(recipe: (state: WorkbenchState) => void): void {
    const current = clone(this.stateSubject.value)
    const next = clone(current)
    recipe(next)
    this.past.push(current)
    if (this.past.length > 60) this.past.shift()
    this.future = []
    this.stateSubject.next(next)
    this.updateHistory()
    this.saveState()
  }

  private patchState(recipe: (state: WorkbenchState) => void): void {
    const next = clone(this.stateSubject.value)
    recipe(next)
    this.stateSubject.next(next)
    this.saveState()
  }

  private updateHistory(): void { this.historySubject.next({ past: this.past.length, future: this.future.length }) }
  private saveState(): void { if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stateSubject.value)) }
  private loadState(): WorkbenchState {
    if (typeof localStorage === 'undefined') return demoState()
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return demoState()
      const parsed = JSON.parse(stored)
      const state: WorkbenchState = { ...demoState(), ...parsed }
      if (!Array.isArray(parsed.evidence)) state.evidence = this.migrateLegacyEvidence(state)
      state.features.forEach(feature => delete (feature as Feature & { supportIds?: string[] }).supportIds)
      return state
    } catch { return demoState() }
  }

  private migrateLegacyEvidence(state: WorkbenchState): SupportEvidence[] {
    const migrated: SupportEvidence[] = []
    state.features.forEach(feature => {
      const legacy = (feature as Feature & { supportIds?: string[] }).supportIds
      if (!Array.isArray(legacy)) return
      legacy.forEach(paragraphId => {
        const paragraph = state.paragraphs.find(item => item.id === paragraphId)
        migrated.push({
          id: `evidence-${feature.id}-${paragraphId}`, featureId: feature.id, paragraphId,
          excerpt: paragraph?.text || '', reason: '',
          status: 'pending', createdBy: 'author', createdAt: new Date().toISOString(),
          confirmedBy: null, confirmedAt: null,
          paragraphSnapshot: paragraph?.text || '', featureSnapshot: feature.text
        })
      })
    })
    return migrated
  }
}
