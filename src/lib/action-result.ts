export type ActionResult<Field extends string = string> = {
  success?: boolean
  message?: string
  error?: string
  fieldErrors?: Partial<Record<Field, string[]>>
}
