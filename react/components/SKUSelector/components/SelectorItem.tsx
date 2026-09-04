import React, { memo, SyntheticEvent, useMemo } from 'react'
import classNames from 'classnames'
import { FormattedNumber } from 'react-intl'

import { useSKUSelectorCssHandles } from '../SKUSelectorCssHandles'
import { slug, imageUrlForDisplaySize } from '../utils'
import { VARIATION_IMG_SIZE } from '../../module/images'
import ImagePopper from './ImagePopper'

interface Props {
  isAvailable: boolean
  isSelected: boolean
  maxPrice?: number | null
  price?: number | null
  onClick: (e: SyntheticEvent<HTMLDivElement>) => void
  isImage: boolean
  variationValue: string
  variationValueOriginalName: string
  imageUrl?: string
  imageLabel?: string | null
  originalImageUrl?: string
  isImpossible: boolean
  imageHeight?: number | string
  imageWidth?: number | string
  thumbnailImageSize?: number
  showBorders?: boolean
  variationLabel: string
  label: string
  showImagePopper?: boolean
  popperImageSize?: number
}

const getDiscount = (maxPrice?: number | null, price?: number | null) => {
  let discount = 0

  if (maxPrice && price) {
    discount = 1 - price / maxPrice
  }

  return discount
}

const toDisplayPixels = (value?: number | string) => {
  if (typeof value === 'number') return value

  const parsed = typeof value === 'string' ? parseFloat(value) : NaN

  return Number.isFinite(parsed) ? parsed : undefined
}

export const CSS_HANDLES = [
  'frameAround',
  'valueWrapper',
  'diagonalCross',
  'unavailable',
  'skuSelectorItem',
  'skuSelectorBadge',
  'skuSelectorItemImage',
  'skuSelectorInternalBox',
  'skuSelectorItemTextValue',
  'skuSelectorItemImageValue',
] as const

/**
 * Inherits the components that should be displayed inside the Selector component.
 */
function SelectorItem({
  isAvailable = true,
  isSelected = false,
  maxPrice,
  price,
  onClick,
  isImage,
  variationValue,
  variationValueOriginalName,
  imageUrl,
  imageLabel,
  originalImageUrl,
  isImpossible,
  imageHeight,
  imageWidth,
  thumbnailImageSize,
  showBorders = true,
  variationLabel,
  label,
  showImagePopper = true,
  popperImageSize = 400,
}: Props) {
  const discount = getDiscount(maxPrice, price)
  const { handles, withModifiers } = useSKUSelectorCssHandles()

  const containerClasses = useMemo(
    () =>
      classNames(
        withModifiers('skuSelectorItem', [
          slug(variationValueOriginalName),
          isSelected ? 'selected' : '',
        ]),
        'relative di pointer flex items-center outline-0 ma2',
        {
          [`${handles.skuSelectorItemImage}`]: isImage,
          'o-20': isImpossible,
        },
        'valueWrapper',
        !isAvailable ? `${handles.unavailable}` : ''
      ),
    [
      isImage,
      isAvailable,
      isSelected,
      isImpossible,
      variationValueOriginalName,
      withModifiers,
      handles.skuSelectorItemImage,
      handles.unavailable,
    ]
  )

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const passedAnyDimension = Boolean(imageHeight || imageWidth)
  let containerStyles = {}
  let imageSrcSet: string | undefined

  if (isImage && imageUrl) {
    if (passedAnyDimension) {
      containerStyles = {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        height: imageHeight || 'auto',
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        width: imageWidth || 'auto',
        padding: 0,
      }
    }

    // Only the downloaded size: imageWidth/imageHeight keep driving the layout,
    // which stores often override through CSS, so they cannot be trusted here.
    const thumbnailSize =
      toDisplayPixels(thumbnailImageSize) ?? VARIATION_IMG_SIZE

    const imageUrl1x = imageUrlForDisplaySize(
      imageUrl,
      thumbnailSize,
      thumbnailSize
    )

    const imageUrl2x = imageUrlForDisplaySize(
      imageUrl,
      thumbnailSize * 2,
      thumbnailSize * 2
    )

    imageUrl = imageUrl1x
    imageSrcSet =
      imageUrl1x && imageUrl2x
        ? `${imageUrl1x} 1x, ${imageUrl2x} 2x`
        : undefined
  }

  let itemTextValue = variationValue

  if (
    variationLabel === 'itemValue' ||
    variationLabel === 'variationAndItemValue'
  ) {
    itemTextValue = `${label} ${variationValue}`
  }

  const itemContent = (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      style={containerStyles}
      className={containerClasses}
      onKeyDown={e => e.key === 'Enter' && onClick(e)}
    >
      <div
        className={classNames(
          handles.frameAround,
          'absolute b--action-primary br3 bw1',
          {
            ba: isSelected,
          }
        )}
      />
      <div
        className={classNames(
          handles.skuSelectorInternalBox,
          'w-100 h-100 b--muted-4 br2 b z-1 c-muted-5 flex items-center overflow-hidden',
          {
            'hover-b--muted-2': !isSelected && !isImpossible,
            ba: showBorders,
          }
        )}
      >
        <div
          className={classNames('absolute absolute--fill', {
            [handles.diagonalCross]: !isAvailable,
          })}
        />
        <div
          className={classNames(
            withModifiers('valueWrapper', !isAvailable ? 'unavailable' : ''),
            {
              [`${handles.skuSelectorItemTextValue} c-on-base center pl5 pr5 z-1 t-body`]:
                !isImage,
              'h-100': isImage,
            }
          )}
        >
          {isImage && imageUrl ? (
            <img
              className={handles.skuSelectorItemImageValue}
              src={imageUrl}
              srcSet={imageSrcSet}
              alt={imageLabel as string | undefined}
            />
          ) : (
            itemTextValue
          )}
        </div>
      </div>
      {discount > 0 && (
        <span className={`${handles.skuSelectorBadge} b`}>
          <FormattedNumber value={discount} style="percent" />
        </span>
      )}
    </div>
  )

  // Render with popper if image is available and popper is enabled
  const shouldShowPopper = 
    isImage &&
    originalImageUrl &&
    showImagePopper &&
    !isImpossible &&
    isAvailable

  // Debug: verificar condições
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    if (isImage) {
      console.log('ImagePopper condições:', {
        isImage,
        hasOriginalImageUrl: !!originalImageUrl,
        originalImageUrl,
        showImagePopper,
        isImpossible,
        isAvailable,
        shouldShowPopper,
      })
    }
  }

  if (shouldShowPopper && originalImageUrl) {
    return (
      <ImagePopper
        imageUrl={originalImageUrl}
        imageLabel={imageLabel}
        popperImageSize={popperImageSize}
        variationValue={variationValueOriginalName}
      >
        {itemContent}
      </ImagePopper>
    )
  }

  return itemContent
}

export default memo(SelectorItem)
