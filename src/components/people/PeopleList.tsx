import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { listPeople, type Person, deletePerson } from '../../lib/queries'
import { PersonFormSheet } from './PersonFormSheet'

export function PeopleList() {
  const { id: eventId } = useParams<{ id: string }>()
  const [people, setPeople] = useState<Person[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (!eventId) return
    listPeople(eventId)
      .then(setPeople)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [eventId])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this person?')) return
    try {
      await deletePerson(id)
      setPeople((prev) => prev?.filter((p) => p.id !== id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete')
    }
  }

  const handlePersonAdded = (person: Person) => {
    setPeople((prev) => [...(prev ?? []), person].sort((a, b) => a.name.localeCompare(b.name)))
    setShowForm(false)
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}

      {people === null && !error && (
        <p className="text-sm text-slate-500 text-center py-8">Loading people…</p>
      )}

      {people?.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">No people yet.</p>
      )}

      <ul className="space-y-2">
        {people?.map((person) => (
          <li key={person.id}>
            <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 p-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{person.name}</p>
                {person.phone_e164 && (
                  <p className="text-xs text-slate-500">{person.phone_e164}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(person.id)}
                className="text-xs text-red-600 hover:text-red-700 ml-2"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-slate-900 text-white rounded-lg py-2.5 px-4 text-sm font-medium"
        >
          + Add person
        </button>
      ) : (
        <PersonFormSheet eventId={eventId!} onAdded={handlePersonAdded} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}
