import clsx from 'clsx'
import { useId, useLayoutEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useAnchoredPosition, useDismiss, type Align } from './anchored.js'
import { IconCheckOutline16, IconChevronDownOutline14 } from './icons.js'
import styles from './Select.module.css'

export type SelectOption<T extends string> = { value: T; label: string; lang?: string }

/** Shared pointer and keyboard picker; the menu follows its trigger within the viewport. */
export const Select = <T extends string>({
  value,
  options,
  onChange,
  placeholder,
  ariaLabel,
  className,
  prefix,
  align = 'start',
  disabled = false,
}: {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
  ariaLabel?: string
  className?: string
  prefix?: ReactNode
  align?: Align
  disabled?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const listId = useId()
  const selected = options.findIndex((option) => option.value === value)
  const current = options[selected]
  const { anchorRef, floatingRef, position } = useAnchoredPosition<
    HTMLButtonElement,
    HTMLDivElement
  >(open, { align, offset: 8, maxHeight: 320, minSpace: 160 })
  const close = (restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) {
      anchorRef.current?.focus({ preventScroll: true })
    }
  }
  useDismiss(open, [anchorRef, floatingRef], () => close(true), { captureEscape: true })
  useLayoutEffect(() => {
    if (open) {
      setHighlighted(Math.max(0, selected))
    }
  }, [open, selected, floatingRef])
  const positioned = position !== null
  useLayoutEffect(() => {
    if (open && positioned) {
      floatingRef.current?.focus({ preventScroll: true })
    }
  }, [open, positioned, floatingRef])
  useLayoutEffect(() => {
    if (open) {
      floatingRef.current
        ?.querySelector<HTMLElement>(`[data-option-index="${highlighted}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlighted, open, floatingRef])
  const choose = (index: number) => {
    const option = options[index]
    if (!option) {
      return
    }
    close(true)
    onChange(option.value)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted(
        (index) => (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
      )
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setHighlighted(event.key === 'Home' ? 0 : options.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(highlighted)
    } else if (event.key === 'Tab' || event.key === 'Escape') {
      close(true)
    } else if (event.key.length === 1) {
      const index = options.findIndex((option) =>
        option.label.toLowerCase().startsWith(event.key.toLowerCase())
      )
      if (index >= 0) {
        setHighlighted(index)
      }
    }
  }
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={clsx(styles.trigger, open && styles.open, className)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled || options.length === 0}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        {prefix ? <span className={styles.prefix}>{prefix}</span> : null}
        {current ? (
          <span className={styles.value} lang={current.lang}>
            {current.label}
          </span>
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}
        <span className={styles.arrow}>
          <IconChevronDownOutline14 />
        </span>
      </button>
      {open && !disabled
        ? createPortal(
            <div
              id={listId}
              ref={floatingRef}
              className={styles.menu}
              style={{
                ...position,
                minWidth: Math.max(148, anchorRef.current?.offsetWidth ?? 0),
                visibility: position ? 'visible' : 'hidden',
              }}
              role="listbox"
              aria-label={ariaLabel}
              aria-activedescendant={`${listId}-${highlighted}`}
              tabIndex={-1}
              onKeyDown={onKeyDown}
            >
              {options.map((option, index) => (
                <div
                  id={`${listId}-${index}`}
                  key={option.value}
                  role="option"
                  lang={option.lang}
                  aria-selected={option.value === value}
                  data-option-index={index}
                  data-highlighted={highlighted === index || undefined}
                  className={styles.option}
                  onPointerMove={() => setHighlighted(index)}
                  onClick={() => choose(index)}
                >
                  <span>{option.label}</span>
                  {option.value === value ? (
                    <IconCheckOutline16 />
                  ) : (
                    <span className={styles.checkSpace} />
                  )}
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  )
}
