import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface SKUImageLabelsContextValue {
    hiddenImageLabels: Set<string>
    addHiddenImageLabel: (label: string) => void
    addHiddenImageLabels: (labels: string[]) => void
}

const SKUImageLabelsContext = createContext<SKUImageLabelsContextValue | null>(null)

interface SKUImageLabelsProviderProps {
    children: ReactNode
}

export const SKUImageLabelsProvider: React.FC<SKUImageLabelsProviderProps> = ({
    children,
}) => {
    const [hiddenImageLabels, setHiddenImageLabels] = useState<Set<string>>(new Set())

    // Log quando o Provider é montado
    useEffect(() => {
        if (typeof window !== 'undefined') {
            console.log('[SKUImageLabels] Provider montado e pronto para receber labels')
        }
    }, [])

    const addHiddenImageLabel = useCallback((label: string) => {
        if (!label) return
        setHiddenImageLabels(prev => {
            const newSet = new Set(prev).add(label)
            if (typeof window !== 'undefined') {
                console.log('[SKUImageLabels] Label adicionado:', label, '| Total:', newSet.size)
            }
            return newSet
        })
    }, [])

    const addHiddenImageLabels = useCallback((labels: string[]) => {
        if (!labels || labels.length === 0) return
        setHiddenImageLabels(prev => {
            const newSet = new Set(prev)
            const newLabels: string[] = []
            labels.forEach(label => {
                if (label && !newSet.has(label)) {
                    newSet.add(label)
                    newLabels.push(label)
                }
            })
            if (typeof window !== 'undefined' && newLabels.length > 0) {
                console.log('[SKUImageLabels] Labels adicionados em lote:', newLabels.length, 'labels')
                console.log('[SKUImageLabels] Novos labels:', newLabels)
                console.log('[SKUImageLabels] Total de labels ocultos:', newSet.size)
            }
            return newSet
        })
    }, [])

    return (
        <SKUImageLabelsContext.Provider
            value={{
                hiddenImageLabels,
                addHiddenImageLabel,
                addHiddenImageLabels,
            }}
        >
            {children}
        </SKUImageLabelsContext.Provider>
    )
}

// Flag para logar apenas uma vez
let hasLoggedHookLoad = false

export const useSKUImageLabels = (): SKUImageLabelsContextValue => {
    const context = useContext(SKUImageLabelsContext)

    // Log quando o hook é chamado (apenas uma vez globalmente)
    if (typeof window !== 'undefined' && context && !hasLoggedHookLoad) {
        console.log('[SKUImageLabels] Hook carregado com sucesso. Labels disponíveis:', context.hiddenImageLabels.size)
        hasLoggedHookLoad = true
    }

    if (!context) {
        if (typeof window !== 'undefined') {
            console.warn('[SKUImageLabels] ⚠️ Hook chamado mas Provider não encontrado!')
        }
        throw new Error(
            'useSKUImageLabels must be used within a SKUImageLabelsProvider'
        )
    }
    return context
}

