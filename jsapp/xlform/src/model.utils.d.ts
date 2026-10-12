export interface SluggifyOptions {
  /** Strip spaces from beginning and end */
  lrstrip?: boolean
  /** Strip spaces from beginning */
  lstrip?: boolean
  /** Strip spaces from end */
  rstrip?: boolean
  /** Used in potential error messages */
  descriptor?: string
  /** Convert to lowercase */
  lowerCase?: boolean
  /** Replace all non-alphanumeric characters with underscores */
  replaceNonWordCharacters?: boolean
  /** String of characters to exclude from replacement */
  nonWordCharsExceptions?: string | false
  /** Replace multiple underscores (__) with a single one (_) */
  preventDuplicateUnderscores?: boolean
  /** Ensure the first character is not a digit (prepends underscore if so) */
  validXmlTag?: boolean
  /** Replace spaces with underscores */
  underscores?: boolean
  /** Maximum length of the resulting string */
  characterLimit?: number | false
  /** An array of existing names to avoid (will append _001, etc.) */
  preventDuplicates?: string[] | false
  /** Number of leading zeros for the duplicate incrementor (e.g. 3 => _001) */
  incrementorPadding?: number | false
}

/** Parses a tab-delimited string into an array of objects */
export function split_paste(str: string): Array<Record<string, string>>

export namespace parseHelper {
  function parseSkipLogic(collection: any, value: string, parent_row: any): void
}

/** Specialized sluggification for XLSForm labels. Defaults to keeping case and ensuring XML tag validity. */
export function sluggifyLabel(str: string, other_names?: string[]): string

/** Checks if a string conforms to XML tag naming rules */
export function isValidXmlTag(str: string): boolean

/** The core string transformation engine that converts labels into slugs */
export function sluggify(str: string, opts?: SluggifyOptions): string

/** OC-28780: is `key` in `hiddenFields`, exactly or as a `<field>::<language>` translation of one? */
export function isHiddenField(key: string, hiddenFields: string[], translatedOnlyFields?: string[]): boolean

export interface CalculationReadonlyHintOptions {
  questionType?: string
  calculation?: string
  trigger?: string
  readonly?: boolean | string
}

/** Whether to prompt the user to make an item with a calculation read-only */
export function shouldShowCalculationReadonlyHint(opts?: CalculationReadonlyHintOptions): boolean

/** OC-28966: port of pyxform's default_is_dynamic for a Calculate item */
export function isDefaultDynamic(value: unknown): boolean

/** OC-28966: does the converter reject this Calculate item with "Missing calculation"? */
export function isCalculationMissing(calculation?: string, defaultValue?: string): boolean

declare const utils: {
  split_paste: typeof split_paste
  parseHelper: typeof parseHelper
  sluggifyLabel: typeof sluggifyLabel
  isValidXmlTag: typeof isValidXmlTag
  sluggify: typeof sluggify
  isHiddenField: typeof isHiddenField
  shouldShowCalculationReadonlyHint: typeof shouldShowCalculationReadonlyHint
  isDefaultDynamic: typeof isDefaultDynamic
  isCalculationMissing: typeof isCalculationMissing
  Validator: any
  skipLogicParser: any
  validationLogicParser: any
}
export default utils
