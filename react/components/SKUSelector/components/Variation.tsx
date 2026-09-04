import React, { FC, memo, useState, Fragment, useCallback } from 'react'
import { Button } from 'vtex.styleguide'
import { IOMessage } from 'vtex.native-types'
import { SliderLayout } from 'vtex.slider-layout'
import { findIndex, propEq } from 'ramda'
import classnames from 'classnames'
import { useProduct } from 'vtex.product-context'
import { ResponsiveValuesTypes } from 'vtex.responsive-values'

import { stripUrl } from '../utils'
// import { isColor } from '../utils'
import { slug } from '../utils'
import styles from '../styles.css'
import { DisplayVariation } from '../types'
import { imageUrlForSize, VARIATION_IMG_SIZE } from '../../module/images'
import ErrorMessage from './ErrorMessage'
import SelectModeVariation from './SelectVariationMode'
import SelectorItem from './SelectorItem'
import { ShowVariationsLabels } from './SKUSelector'
import ImageModal from './ImageModal'
import { useIsMobile } from '../../../hooks/useIsMobile'

interface Props {
  variation: DisplayVariation
  maxSkuPrice?: number | null
  seeMoreLabel: string
  maxItems: number
  selectedItem: string | null
  showValueForVariation: boolean
  imageHeight?: number
  imageWidth?: number
  thumbnailImageSize?: number
  showBorders?: boolean
  showLabel: ShowVariationsLabels
  containerClasses?: string
  showErrorMessage: boolean
  mode?: string
  sliderDisplayThreshold: number
  sliderArrowSize: number
  sliderItemsPerPage: ResponsiveValuesTypes.ResponsiveValue<number>
  showImagePopper?: boolean
  popperImageSize?: number
}

const ITEMS_VISIBLE_THRESHOLD = 2

const findSelectedOption = (selectedItem: string | null) =>
  findIndex(propEq('label', selectedItem))

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => { }

const Variation: FC<Props> = ({
  mode = 'default',
  maxItems,
  showLabel,
  variation,
  imageWidth,
  imageHeight,
  thumbnailImageSize,
  showBorders,
  maxSkuPrice,
  seeMoreLabel,
  selectedItem,
  showErrorMessage,
  showValueForVariation,
  containerClasses: containerClassesProp,
  sliderArrowSize,
  sliderDisplayThreshold,
  sliderItemsPerPage,
  showImagePopper,
  popperImageSize,
}) => {
  const { originalName, name, options } = variation

  const visibleItemsWhenCollapsed = maxItems - ITEMS_VISIBLE_THRESHOLD

  const [showAll, setShowAll] = useState(() => {
    const selectedOptionPosition = findSelectedOption(selectedItem)(options)

    return selectedOptionPosition >= visibleItemsWhenCollapsed
  })

  const {
    buyButton = {
      clicked: false,
    },
  } = useProduct()

  // const displayImage = isColor(originalName)

  const displayImage = options.some(option => option.image !== undefined)

  const shouldCollapse = !showAll && options.length > maxItems

  const overflowQuantity = options.length - visibleItemsWhenCollapsed
  const displayOptions = options.slice(
    0,
    shouldCollapse ? visibleItemsWhenCollapsed : options.length
  )

  const showAllAction = useCallback(() => setShowAll(true), [setShowAll])
  const containerClasses = classnames(
    'flex flex-column',
    containerClassesProp,
    styles.skuSelectorSubcontainer,
    `${styles.skuSelectorSubcontainer}--${slug(originalName)}`
  )

  const shouldUseSlider =
    displayOptions.length > sliderDisplayThreshold && mode === 'slider'

  const sliderConfigurationProps = {
    itemsPerPage: sliderItemsPerPage,
    infinite: true,
    showNavigationArrows: 'always',
    showPaginationDots: 'never',
    arrowSize: sliderArrowSize,
    fullWidth: false,
  }

  // The following code is here to maintain backwards compatibility
  let variationLabel = ''

  if (typeof showLabel === 'boolean') {
    variationLabel = showLabel ? 'variation' : 'none'
  } else {
    variationLabel = showLabel
  }

  const showVariationLabelName =
    variationLabel === 'variation' || variationLabel === 'variationAndItemValue'

  // Find the originalName of the selected item
  const selectedOption = selectedItem
    ? options.find(option => option.label === selectedItem)
    : null
  const selectedOriginalName = selectedOption?.originalName

  // Mobile detection (max-width: 1024px)
  const isMobile = useIsMobile(1024)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Get selected option image URL for modal
  const selectedImageUrl = selectedOption?.image
    ? stripUrl(selectedOption.image.imageUrl)
    : null

  const selectorItemsArray = displayOptions.map(option => {
    return (
      <SelectorItem
        isSelected={option.label === selectedItem}
        key={`${option.label}-${name}`}
        isAvailable={option.available}
        maxPrice={maxSkuPrice}
        onClick={option.impossible ? noop : option.onSelectItem}
        isImage={displayImage}
        variationValue={option.label}
        variationValueOriginalName={option.originalName}
        imageHeight={imageHeight}
        imageWidth={imageWidth}
        thumbnailImageSize={thumbnailImageSize}
        showBorders={showBorders}
        imageUrl={
          option.image &&
          imageUrlForSize(stripUrl(option.image.imageUrl), VARIATION_IMG_SIZE)
        }
        originalImageUrl={
          option.image ? stripUrl(option.image.imageUrl) : undefined
        }
        imageLabel={option.image?.imageLabel}
        isImpossible={option.impossible}
        variationLabel={variationLabel}
        label={name}
        showImagePopper={showImagePopper}
        popperImageSize={popperImageSize}
      />
    )
  })

  return (
    <div className={containerClasses}>
      <div className={`${styles.skuSelectorNameContainer} ma1`}>
        <div className={`${styles.skuSelectorTextContainer} db mb3`}>
          {showVariationLabelName && (
            <span
              className={`${styles.skuSelectorName} c-muted-1 t-small overflow-hidden`}
            >
              {name}
              {selectedOriginalName && (
                <span className={`${styles.skuSelectorSelectedValue} c-muted-1 t-small`}>
                  {' - '}
                  {selectedOriginalName}
                </span>
              )}
              {/* Mobile: "ver detalhe" button when item is selected and has image */}
              {isMobile &&
                selectedOriginalName &&
                selectedImageUrl &&
                selectedOption?.image && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      setIsModalOpen(true)
                    }}
                    className={`${styles.skuSelectorViewDetailButton} c-link t-small ml2 bn bg-transparent pointer`}
                    style={{ textDecoration: 'underline' }}
                  >
                    <i className={`bi bi-zoom-in`}></i> Ver detalhes
                  </button>
                )}
              {showErrorMessage && buyButton.clicked && !selectedItem && (
                <ErrorMessage />
              )}
            </span>
          )}
          {selectedItem && showValueForVariation && (
            <Fragment>
              <span
                className={`${styles.skuSelectorNameSeparator} c-muted-1 t-small`}
              >
                :{' '}
              </span>
              <span
                className={`${styles.skuSelectorSelectorImageValue} c-muted-1 t-small`}
              >
                {selectedItem}
              </span>
            </Fragment>
          )}
        </div>
        <div
          className={`${styles.skuSelectorOptionsList} w-100 inline-flex flex-wrap ml2 items-center`}
        >
          {mode === 'select' && !displayImage ? (
            <SelectModeVariation
              selectedItem={selectedItem}
              displayOptions={displayOptions}
            />
          ) : shouldUseSlider ? (
            <SliderLayout {...sliderConfigurationProps}>
              {selectorItemsArray}
            </SliderLayout>
          ) : (
            selectorItemsArray
          )}
          {!showAll && shouldCollapse && (
            <div className={styles.seeMoreButton}>
              <Button
                variation="tertiary"
                onClick={showAllAction}
                size="small"
                collapseLeft
              >
                <IOMessage
                  id={seeMoreLabel}
                  values={{ quantity: overflowQuantity }}
                  data-testid="seeMoreLabel"
                />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal for Mobile */}
      {isMobile && selectedImageUrl && selectedOption?.image && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrl={selectedImageUrl}
          imageLabel={selectedOption.image.imageLabel}
          variationValue={selectedOriginalName || undefined}
        />
      )}
    </div>
  )
}

export default memo(Variation)
