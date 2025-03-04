import type * as monaco from 'monaco-editor'

export type ProvideCompletionItems = monaco.languages.CompletionItemProvider['provideCompletionItems']

export type ProvideRhsValueCompletion = (lhsValue: string, rhsValueValue: string, lhsRange: monaco.Range, rhsValueRange: monaco.Range) => Promise<monaco.languages.CompletionList | undefined>

export interface RhsValueCompletion {
  provide: ProvideRhsValueCompletion
  shouldProvide: (lhsIdentValue: string) => boolean
}
