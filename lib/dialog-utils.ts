import React from 'react'

/**
 * Utility functions for managing Dialog focus and accessibility
 */

/**
 * Manages focus when dialog opens
 * @param dialogRef - Reference to the dialog element
 * @param focusableSelector - CSS selector for focusable elements within dialog
 */
export const manageDialogFocus = (
  dialogRef: HTMLElement | null,
  focusableSelector: string = 'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
) => {
  if (!dialogRef) return

  // Find focusable elements within the dialog
  const focusableElements = dialogRef.querySelectorAll(focusableSelector)
  const firstFocusable = focusableElements[0] as HTMLElement
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement

  // Focus the first focusable element
  if (firstFocusable) {
    firstFocusable.focus()
  }

  // Handle tab key navigation
  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        // Shift + Tab: move to previous element
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable.focus()
        }
      } else {
        // Tab: move to next element
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable.focus()
        }
      }
    }
  }

  // Add event listener
  dialogRef.addEventListener('keydown', handleTabKey)

  // Return cleanup function
  return () => {
    dialogRef.removeEventListener('keydown', handleTabKey)
  }
}

/**
 * Prevents focus on elements outside dialog when dialog is open
 * @param dialogRef - Reference to the dialog element
 */
export const preventOutsideFocus = (dialogRef: HTMLElement | null) => {
  if (!dialogRef) return

  const handleFocus = (e: FocusEvent) => {
    const target = e.target as HTMLElement
    if (!dialogRef.contains(target)) {
      e.preventDefault()
      // Focus back to dialog
      const firstFocusable = dialogRef.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement
      if (firstFocusable) {
        firstFocusable.focus()
      }
    }
  }

  // Add event listener
  document.addEventListener('focusin', handleFocus)

  // Return cleanup function
  return () => {
    document.removeEventListener('focusin', handleFocus)
  }
}

/**
 * Restores focus to the element that had focus before dialog opened
 * @param previousFocusElement - Element that had focus before dialog opened
 */
export const restoreFocus = (previousFocusElement: HTMLElement | null) => {
  if (previousFocusElement && typeof previousFocusElement.focus === 'function') {
    previousFocusElement.focus()
  }
}

/**
 * Hook for managing dialog focus
 * @param isOpen - Whether the dialog is open
 * @param dialogRef - Reference to the dialog element
 */
export const useDialogFocus = (isOpen: boolean, dialogRef: HTMLElement | null) => {
  const [previousFocusElement, setPreviousFocusElement] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    if (isOpen && dialogRef) {
      // Store the currently focused element
      setPreviousFocusElement(document.activeElement as HTMLElement)

      // Manage focus within dialog
      const cleanupFocus = manageDialogFocus(dialogRef)
      const cleanupOutsideFocus = preventOutsideFocus(dialogRef)

      return () => {
        cleanupFocus?.()
        cleanupOutsideFocus?.()
        // Restore focus when dialog closes
        restoreFocus(previousFocusElement)
      }
    }
  }, [isOpen, dialogRef, previousFocusElement])
}

/**
 * Utility to check if an element should be focusable
 * @param element - The element to check
 */
export const isFocusable = (element: HTMLElement): boolean => {
  const tagName = element.tagName.toLowerCase()
  const type = (element as HTMLInputElement).type
  
  // Elements that are naturally focusable
  const naturallyFocusable = [
    'button', 'input', 'select', 'textarea', 'a', 'area', 'object', 'embed', 'iframe'
  ]
  
  if (naturallyFocusable.includes(tagName)) {
    // Check if element is disabled or hidden
    if (element.disabled || element.hidden) return false
    
    // Check input type
    if (tagName === 'input' && type === 'hidden') return false
    
    return true
  }
  
  // Check if element has tabindex
  const tabIndex = element.getAttribute('tabindex')
  if (tabIndex !== null && tabIndex !== '-1') return true
  
  return false
}

/**
 * Utility to get all focusable elements within a container
 * @param container - The container element
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    'area[href]',
    'object',
    'embed',
    'iframe',
    '[tabindex]:not([tabindex="-1"])'
  ]
  
  const elements = container.querySelectorAll(focusableSelectors.join(', '))
  return Array.from(elements).filter(isFocusable) as HTMLElement[]
}
