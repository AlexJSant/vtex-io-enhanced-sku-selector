import { clone, filter, prop, reject } from 'ramda'
import slugify from 'slugify'

import { getDefaultSeller } from '../../../utils/sellers'
import { SelectedVariations, SelectorProductItem } from '../types'

/**
 * Return the maximum sku price
 * @param {array of sku's} items
 */
export const getMaxSkuPrice = (items: SelectorProductItem[]) => {
  if (!items) return 0

  return items.reduce((max, sku) => {
    const seller = getDefaultSeller(sku.sellers)
    const price = seller?.commertialOffer.Price ?? 0

    return Math.max(max, price)
  }, 0)
}

/**
 * Remove the 'https' from the given url
 * @param {string} url
 */
export const stripUrl = (url: string) => url.replace(/^https?:/, '')

/**
 * Parse the variations field in the sku object
 * @param {sku} sku
 */
export const parseSku = (sku: ProductItem) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = clone(sku) as any
  const variationValues = {} as Record<string, string>

  for (const variation of sku.variations) {
    variationValues[variation.name] = variation.values[0]
  }

  const variations = sku.variations.map(prop('name'))

  result.variationValues = variationValues
  result.variations = variations

  return result as SelectorProductItem
}

/**
 * Verifies if the variation is color
 * Supports both exact matches (e.g., "Color") and composite variations (e.g., "Cor do Tampo", "Cor da Base")
 * @param {string} variation
 */
export const isColor = (variation: string) => {
  if (!variation) return false

  const possibleValues = [
    'cor',
    'color',
    'colour',
    'colore',
    'farbe',
    'couleur',
    'kleuren',
    'culoare',
    'värit',
    'kolory',
    'farve',
    'färger',
    'farby',
    'boje',
    'colori',
    'tsvyat',
    'цвят',
  ]

  const lowerVariation = variation.toLowerCase()

  // Check for exact match (backward compatibility)
  if (possibleValues.includes(lowerVariation)) {
    return true
  }

  // Check if the variation starts with or contains a color keyword
  // This supports composite variations like "Cor do Tampo", "Cor da Base", "Color del Tope"
  return possibleValues.some(colorWord => {
    const lowerColorWord = colorWord.toLowerCase()
    
    // Check if variation starts with the color word followed by a space or special char
    const startsWithPattern = new RegExp(`^${lowerColorWord}[\\s\\-_]`, 'i')
    
    // Check if variation contains the color word as a separate word
    // Use word boundaries for Latin characters, manual check for others
    const hasWordBoundary = /^[a-zA-Z]+$/.test(lowerColorWord)
    const containsPattern = hasWordBoundary
      ? new RegExp(`\\b${lowerColorWord}\\b`, 'i')
      : new RegExp(lowerColorWord, 'i')
    
    return startsWithPattern.test(variation) || containsPattern.test(variation)
  })
}

/**
 * Choose wich variation will be the main one.
 * @param {Array[string]} variations
 */
export const getMainVariationName = (variations: string[]) => {
  for (let i = 0; i < variations.length; i++) {
    if (isColor(variations[i])) return variations[i]
  }

  return variations[0]
}

/**
 * Given a selectedVariations, find the first item that has those variations selected
 * selectedVariations format: { "color": "black", size: "small", fabric: null }
 * items: skuItems parsed with variations fields
 * Output: item or null, if not present
 */
export const findItemWithSelectedVariations = (
  items: SelectorProductItem[],
  selectedVariations: SelectedVariations
) => {
  const selectedNotNull = filter(
    Boolean,
    selectedVariations
  ) as SelectedVariationsNotNull

  const selectedCount = Object.keys(selectedNotNull).length

  if (selectedCount === 0) {
    // may return any item, return first element
    return items[0]
  }

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return items.find(isSkuSelected(selectedNotNull))
}

/**
 * Given a selectedVariations, find items that have those variations selected
 * selectedVariations format: { "color": "black", size: "small", fabric: null }
 * items: skuItems parsed with variations fields
 * Output: list of items with those variations
 */
export const findListItemsWithSelectedVariations = (
  items: SelectorProductItem[],
  selectedVariations: SelectedVariations
) => {
  const selectedNotNull = filter(
    Boolean,
    selectedVariations
  ) as SelectedVariationsNotNull

  const selectedCount = Object.keys(selectedNotNull).length

  if (selectedCount === 0) {
    // return all
    return items
  }

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return items.filter(isSkuSelected(selectedNotNull))
}

export const uniqueOptionToSelect = (
  items: SelectorProductItem[],
  selectedVariations: SelectedVariations,
  isMainAndImpossible: boolean
) => {
  const possibleItems = !isMainAndImpossible
    ? items
    : findListItemsWithSelectedVariations(items, selectedVariations)

  const unselected = reject(Boolean, selectedVariations)
  const unselectedNames = Object.keys(unselected)
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const availableOptions = buildAvailableVariations(
    possibleItems,
    unselectedNames
  )

  const variationsWithOne = filter(
    setValues => setValues.size === 1,
    availableOptions
  )

  const variationsNames = Object.keys(variationsWithOne)
  const finalUniqueVariations = {} as Record<string, string>

  // Transform set to plain value
  for (const variationName of variationsNames) {
    const { value } = variationsWithOne[variationName].values().next()

    finalUniqueVariations[variationName] = value
  }

  return finalUniqueVariations
}

export function slug(str: string) {
  // eslint-disable-next-line no-useless-escape
  const replaced = str?.replace(/[*+~.()'`’"!:@&\[\]]/g, '') || ''
  const slugified = slugify(replaced, { lower: true }) || ''

  return slugified
}

type SelectedVariationsNotNull = Record<string, string>

/** Private functions */
const isSkuSelected =
  (selectedNotNull: SelectedVariationsNotNull) =>
  (sku: SelectorProductItem) => {
    const hasAll = Object.keys(selectedNotNull).every(variationName => {
      const selectedValue = selectedNotNull[variationName]

      return sku.variationValues[variationName] === selectedValue
    })

    return hasAll
  }

const buildAvailableVariations = (
  items: SelectorProductItem[],
  variationNames: string[]
) => {
  const result = {} as Record<string, Set<string>>

  for (const variationName of variationNames) {
    result[variationName] = new Set()
  }

  for (const item of items) {
    for (const variationName of variationNames) {
      const variationValue = item.variationValues[variationName]
      const currentSet = result[variationName]

      if (variationValue) {
        currentSet.add(variationValue)
      }
    }
  }

  return result
}

export const DEFAULT_WIDTH = 'auto'
export const DEFAULT_HEIGHT = 'auto'
export const MAX_WIDTH = 3000
export const MAX_HEIGHT = 4000

/**
 * Having the url below as base for the LEGACY file manager,
 * https://storecomponents.vteximg.com.br/arquivos/ids/155472/Frame-3.jpg?v=636793763985400000
 * the following regex will match https://storecomponents.vteximg.com.br/arquivos/ids/155472
 *
 * Also matches urls with defined sizes like:
 * https://storecomponents.vteximg.com.br/arquivos/ids/155473-160-auto
 * @type {RegExp}
 *
 * On the new vtex.file-manager isn't necessary replace the URL, just add the param on the querystring, like:
 * "?width=WIDTH&height=HEIGHT&aspect=true"
 *
 */
const baseUrlRegex = new RegExp(/.+ids\/(\d+)/)

export function cleanImageUrl(imageUrl: string) {
  const result = baseUrlRegex.exec(imageUrl) ?? []

  return result.length > 0 ? result[0] : null
}

function replaceLegacyFileManagerUrl(
  imageUrl: string,
  width: number | string,
  height: number | string
) {
  const legacyUrlPattern = '/arquivos/ids/'
  const isLegacyUrl = imageUrl.includes(legacyUrlPattern)

  if (!isLegacyUrl) return imageUrl

  return `${cleanImageUrl(imageUrl)}-${width}-${height}`
}

/**
 * Removes size params already present in the querystring, so a new requested
 * size is not shadowed by the original one (the first param wins in the API).
 */
export function stripImageSizeParams(imageUrl: string) {
  const [baseUrl, queryString] = imageUrl.split('?')

  if (!queryString) return imageUrl

  const remainingParams = queryString
    .split('&')
    .filter(param => !/^(width|height|aspect)=/.test(param))

  return remainingParams.length > 0
    ? `${baseUrl}?${remainingParams.join('&')}`
    : baseUrl
}

export function changeImageUrlSize(
  imageUrl: string,
  width: string | number = DEFAULT_WIDTH,
  height: string | number = DEFAULT_HEIGHT
) {
  if (!imageUrl) return
  typeof width === 'number' && (width = Math.min(width, MAX_WIDTH))
  typeof height === 'number' && (height = Math.min(height, MAX_HEIGHT))

  const normalizedImageUrl = replaceLegacyFileManagerUrl(
    imageUrl,
    width,
    height
  )

  const queryStringSeparator = normalizedImageUrl.includes('?') ? '&' : '?'

  return `${normalizedImageUrl}${queryStringSeparator}width=${width}&height=${height}&aspect=true`
}

/**
 * Matches the image id segment and its optional size suffix, e.g. both
 * "/ids/249632" and "/ids/249632-300-300" or "/ids/249632-80-auto".
 */
const imageIdSegmentRegex = /(\/ids\/\d+)(-[^/?]*)?/

/**
 * Requests the image at the given size.
 *
 * On /arquivos/ids/ urls the served size comes exclusively from the segment
 * right after the image id: the width/height querystring params are ignored,
 * so rewriting that segment is the only way to change what gets downloaded.
 * Other url shapes still rely on the querystring params.
 */
export function imageUrlForDisplaySize(
  imageUrl: string,
  width: number,
  height: number
) {
  if (!imageUrl) return imageUrl

  const adjustedWidth = Math.min(width, MAX_WIDTH)
  const adjustedHeight = Math.min(height, MAX_HEIGHT)
  const cleanedImageUrl = stripImageSizeParams(imageUrl)
  const [path, queryString] = cleanedImageUrl.split('?')

  if (!imageIdSegmentRegex.test(path)) {
    return changeImageUrlSize(cleanedImageUrl, adjustedWidth, adjustedHeight)
  }

  const resizedPath = path.replace(
    imageIdSegmentRegex,
    `$1-${adjustedWidth}-${adjustedHeight}`
  )

  return queryString ? `${resizedPath}?${queryString}` : resizedPath
}

export const DEFAULT_BOTTOM_MARGIN = 7
const MAX_POSSIBLE_MARGIN = 11
const MIN_POSSIBLE_MARGIN = 0

export function getValidMarginBottom(variationsSpacing?: number) {
  if (typeof variationsSpacing === 'undefined') {
    return DEFAULT_BOTTOM_MARGIN
  }

  return Math.max(
    Math.min(MAX_POSSIBLE_MARGIN, variationsSpacing),
    MIN_POSSIBLE_MARGIN
  )
}

export const NO_BOTTOM_MARGIN = 'none'
