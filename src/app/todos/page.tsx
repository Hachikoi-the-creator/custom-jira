'use client'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ListChecks, GripVertical, Plus, Trash2 } from 'lucide-react'

type Row = {
  id: string
  text: string
  completed: boolean
  sort_order: number
  created_at: string
}

export default function TodosPage() {
  const supabase = createClient()
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [newText, setNewText] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    const { data, error } = await supabase
      .from('simple_todos')
      .select('id, text, completed, sort_order, created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) {
      setLoadError(error.message)
      setItems([])
    } else {
      setItems((data as Row[]) ?? [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }
  }, [editingId])

  async function persistOrder(ordered: Row[]) {
    const withOrder = ordered.map((row, index) => ({ ...row, sort_order: index }))
    setItems(withOrder)
    await Promise.all(
      withOrder.map(row =>
        supabase.from('simple_todos').update({ sort_order: row.sort_order }).eq('id', row.id)
      )
    )
  }

  async function addTodo() {
    if (!newText.trim()) return
    setAdding(true)
    const nextOrder = items.length ? Math.max(...items.map(i => i.sort_order)) + 1 : 0
    const { data, error } = await supabase
      .from('simple_todos')
      .insert({ text: newText.trim(), sort_order: nextOrder })
      .select('id, text, completed, sort_order, created_at')
      .single()
    if (!error && data) {
      setItems(prev => [...prev, data as Row].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)))
      setNewText('')
    }
    setAdding(false)
  }

  async function deleteTodo(id: string) {
    await supabase.from('simple_todos').delete().eq('id', id)
    const next = items.filter(i => i.id !== id)
    await persistOrder(next)
  }

  async function saveText(id: string, text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    const { error } = await supabase.from('simple_todos').update({ text: trimmed }).eq('id', id)
    if (!error) setItems(prev => prev.map(i => (i.id === id ? { ...i, text: trimmed } : i)))
  }

  async function toggleCompleted(id: string, completed: boolean) {
    const { error } = await supabase.from('simple_todos').update({ completed }).eq('id', id)
    if (!error) setItems(prev => prev.map(i => (i.id === id ? { ...i, completed } : i)))
  }

  function startEdit(row: Row) {
    setEditingId(row.id)
    setEditDraft(row.text)
  }

  function cancelEdit(originalText: string) {
    setEditDraft(originalText)
    setEditingId(null)
  }

  function finishEdit(id: string, originalText: string) {
    const draft = editDraft
    if (!draft.trim()) {
      cancelEdit(originalText)
      return
    }
    if (draft !== originalText) void saveText(id, draft)
    setEditingId(null)
  }

  function onDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragEnd() {
    setDraggingId(null)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function reorder(draggedId: string, beforeId: string | null) {
    const dragged = items.find(i => i.id === draggedId)
    if (!dragged) return
    const rest = items.filter(i => i.id !== draggedId)
    if (beforeId === null) {
      void persistOrder([...rest, dragged])
      return
    }
    const insertAt = rest.findIndex(i => i.id === beforeId)
    if (insertAt === -1) {
      void persistOrder([...rest, dragged])
      return
    }
    void persistOrder([...rest.slice(0, insertAt), dragged, ...rest.slice(insertAt)])
  }

  function onDropOnRow(e: React.DragEvent, beforeId: string) {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/plain') || draggingId
    if (!draggedId || draggedId === beforeId) return
    reorder(draggedId, beforeId)
    setDraggingId(null)
  }

  function onDropAtEnd(e: React.DragEvent) {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/plain') || draggingId
    if (!draggedId) return
    reorder(draggedId, null)
    setDraggingId(null)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="text-muted-foreground p-8">Loading todos...</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary text-primary-foreground">
            <ListChecks size={20} />
          </div>
          <div>
            <h1 className="page-title">Todos</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Use the checkbox to complete. Click text to edit. Drag the handle to reorder.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-5 mb-4">
          <input
            className="input text-sm flex-1"
            placeholder="New item..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void addTodo()
              }
            }}
            disabled={adding}
          />
          <button
            type="button"
            onClick={() => void addTodo()}
            disabled={adding || !newText.trim()}
            className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3 whitespace-nowrap disabled:opacity-50"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {loadError && (
          <div className="mb-4 rounded-lg border border-border bg-muted/50 text-sm px-4 py-3 text-foreground">
            <p className="font-medium">Could not load todos</p>
            <p className="mt-1 text-muted-foreground">{loadError}</p>
          </div>
        )}

        <ul className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm">
          {items.map(item => (
            <li
              key={item.id}
              onDragOver={onDragOver}
              onDrop={e => onDropOnRow(e, item.id)}
              className={`flex items-stretch gap-1 group ${
                draggingId === item.id ? 'opacity-60 bg-muted/30' : ''
              }`}
            >
              <button
                type="button"
                draggable
                onDragStart={e => onDragStart(e, item.id)}
                onDragEnd={onDragEnd}
                className="flex-shrink-0 px-2 py-3 cursor-grab active:cursor-grabbing text-muted-foreground hover:bg-muted/50 border-0 bg-transparent"
                aria-label="Reorder"
              >
                <GripVertical size={16} />
              </button>

              <div className="flex-shrink-0 flex items-center pl-0 pr-1">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={e => void toggleCompleted(item.id, e.target.checked)}
                  onClick={e => e.stopPropagation()}
                  className="size-4 rounded border border-border bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-0 cursor-pointer"
                  aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                />
              </div>

              <div className="min-w-0 flex-1 py-2 pr-1">
                {editingId === item.id ? (
                  <input
                    ref={editInputRef}
                    className="input text-sm py-1.5"
                    value={editDraft}
                    onChange={e => setEditDraft(e.target.value)}
                    onBlur={() => finishEdit(item.id, item.text)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        ;(e.target as HTMLInputElement).blur()
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelEdit(item.text)
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="w-full text-left text-sm text-foreground py-1.5 px-1 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    {item.text ? (
                      <span className={item.completed ? 'text-muted-foreground line-through' : ''}>{item.text}</span>
                    ) : (
                      <span className="text-muted-foreground">Empty — click to write</span>
                    )}
                  </button>
                )}
              </div>

              <div className="flex-shrink-0 flex items-center pr-2">
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={e => {
                    e.stopPropagation()
                    void deleteTodo(item.id)
                    if (editingId === item.id) setEditingId(null)
                  }}
                  className="p-2 rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
          <li
            onDragOver={onDragOver}
            onDrop={onDropAtEnd}
            className="min-h-10 px-3 py-2 text-xs text-muted-foreground flex items-center"
          >
            {items.length === 0 ? 'No items yet — add one above.' : 'Drop here to move to the end'}
          </li>
        </ul>
      </div>
    </AppLayout>
  )
}
