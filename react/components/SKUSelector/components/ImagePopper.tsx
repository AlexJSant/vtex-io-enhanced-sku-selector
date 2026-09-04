import React, { FC, memo, useState, useRef, useEffect } from 'react'
import classNames from 'classnames'

import { useSKUSelectorCssHandles } from '../SKUSelectorCssHandles'
import { imageUrlForDisplaySize } from '../utils'

export const CSS_HANDLES = ['imagePopper', 'imagePopperContent', 'imagePopperLabel'] as const

interface ImagePopperProps {
    imageUrl: string
    imageLabel?: string | null
    children: React.ReactElement
    popperImageSize?: number
    variationValue?: string
}

const ImagePopper: FC<ImagePopperProps> = ({
    imageUrl,
    imageLabel,
    children,
    popperImageSize = 400,
    variationValue,
}) => {
    const { handles } = useSKUSelectorCssHandles()
    const [isVisible, setIsVisible] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const hasPrefetchedRef = useRef(false)

    // Resize image for popper (larger than thumbnail). The size has to be
    // written in the url path, since the width/height querystring params are
    // ignored on /arquivos/ids/ urls.
    const popperImageUrl = imageUrlForDisplaySize(
        imageUrl,
        popperImageSize,
        popperImageSize
    )

    const handleMouseEnter = () => {
        // Starts downloading during the delay below, since the trigger
        // thumbnail no longer warms up this image for the popper.
        if (!hasPrefetchedRef.current && popperImageUrl) {
            hasPrefetchedRef.current = true
            const preloader = new window.Image()

            preloader.src = popperImageUrl
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true)
        }, 100)
    }

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
            setIsVisible(false)
        }, 100)
    }

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [])

    // Debug
    useEffect(() => {
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            console.log('ImagePopper state:', { isVisible, imageUrl: popperImageUrl })
        }
    }, [isVisible, popperImageUrl])

    return (
        <div
            ref={containerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ position: 'relative', display: 'inline-block' }}
        >
            {React.cloneElement(children)}
            {isVisible && (
                <div
                    className={classNames(handles.imagePopper, 'bg-base pa3 br3 shadow-3')}
                    style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '10px',
                        zIndex: 99999,
                        pointerEvents: 'none',
                    }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className={classNames(handles.imagePopperContent, 'flex flex-column items-center justify-center')}>
                        <img
                            src={popperImageUrl}
                            alt={imageLabel || undefined}
                            style={{
                                maxWidth: `${popperImageSize}px`,
                                maxHeight: `${popperImageSize}px`,
                                width: 'auto',
                                height: 'auto',
                                objectFit: 'contain',
                            }}
                        />
                        {variationValue && (
                            <div className={classNames(handles.imagePopperLabel, 'mt2 tc')}>
                                {variationValue}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default memo(ImagePopper)

