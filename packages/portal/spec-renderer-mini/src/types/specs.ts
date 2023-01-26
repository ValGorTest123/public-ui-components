export type MethodString = 'get' | 'put' | 'post' | 'delete' | 'patch' | 'options' | 'head' | 'connect' | 'trace' | ''

export interface SpecItemType {
  path: string
  method: MethodString
  operationId: string | null
  tags: string[]
  summary: string | null
  deprecated: boolean
  selected?: boolean
  key?: string
}

interface SpecExternalDoc {
  description: string
  url: string
}

export interface SpecTag {
  name: string
  description?: string
  externalDocs?: SpecExternalDoc[]
}
