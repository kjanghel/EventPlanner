// Default event templates. Pure client-side data — no migrations.
//
// On NewEvent submit, if the user picked a non-blank template, we:
//   1. createEvent → eventId
//   2. for each template group: createCategoryGroup(eventId, name)
//   3. for each group's categories: createCategory(eventId, {group_id, name})
//
// The localised group/category names are resolved at template-apply time
// using the user's current locale (English or Hindi). Once stored in the DB,
// they're plain strings and the user can rename freely.

import {
  createCategory,
  createCategoryGroup,
  type CategoryGroup,
} from './queries'
import type { TKey } from './i18n'

export type TemplateId = 'wedding' | 'birthday' | 'concert' | 'blank'

export type TemplateCategoryDef = {
  nameKey: TKey
}

export type TemplateGroupDef = {
  nameKey: TKey
  categories: TemplateCategoryDef[]
}

export type TemplateDef = {
  id: TemplateId
  labelKey: TKey
  descriptionKey: TKey
  groups: TemplateGroupDef[]
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'wedding',
    labelKey: 'templates.wedding.label',
    descriptionKey: 'templates.wedding.description',
    groups: [
      {
        nameKey: 'templates.wedding.haldi',
        categories: [
          { nameKey: 'templates.cat.decoration' },
          { nameKey: 'templates.cat.catering' },
          { nameKey: 'templates.cat.music' },
          { nameKey: 'templates.cat.photography' },
        ],
      },
      {
        nameKey: 'templates.wedding.mehendi',
        categories: [
          { nameKey: 'templates.cat.decoration' },
          { nameKey: 'templates.cat.mehendiArtist' },
          { nameKey: 'templates.cat.catering' },
          { nameKey: 'templates.cat.music' },
        ],
      },
      {
        nameKey: 'templates.wedding.sangeet',
        categories: [
          { nameKey: 'templates.cat.decoration' },
          { nameKey: 'templates.cat.catering' },
          { nameKey: 'templates.cat.dj' },
          { nameKey: 'templates.cat.photography' },
        ],
      },
      {
        nameKey: 'templates.wedding.barat',
        categories: [
          { nameKey: 'templates.cat.decoration' },
          { nameKey: 'templates.cat.horseCar' },
          { nameKey: 'templates.cat.band' },
          { nameKey: 'templates.cat.catering' },
        ],
      },
      {
        nameKey: 'templates.wedding.reception',
        categories: [
          { nameKey: 'templates.cat.venue' },
          { nameKey: 'templates.cat.decoration' },
          { nameKey: 'templates.cat.catering' },
          { nameKey: 'templates.cat.dj' },
          { nameKey: 'templates.cat.photography' },
        ],
      },
    ],
  },
  {
    id: 'birthday',
    labelKey: 'templates.birthday.label',
    descriptionKey: 'templates.birthday.description',
    groups: [
      {
        nameKey: 'templates.birthday.celebration',
        categories: [
          { nameKey: 'templates.cat.cake' },
          { nameKey: 'templates.cat.decoration' },
          { nameKey: 'templates.cat.catering' },
          { nameKey: 'templates.cat.gifts' },
          { nameKey: 'templates.cat.photography' },
        ],
      },
    ],
  },
  {
    id: 'concert',
    labelKey: 'templates.concert.label',
    descriptionKey: 'templates.concert.description',
    groups: [
      {
        nameKey: 'templates.concert.stage',
        categories: [
          { nameKey: 'templates.cat.lighting' },
          { nameKey: 'templates.cat.sound' },
          { nameKey: 'templates.cat.stageSetup' },
        ],
      },
      {
        nameKey: 'templates.concert.artist',
        categories: [
          { nameKey: 'templates.cat.artistFees' },
          { nameKey: 'templates.cat.travel' },
          { nameKey: 'templates.cat.accommodation' },
        ],
      },
      {
        nameKey: 'templates.concert.venue',
        categories: [
          { nameKey: 'templates.cat.venueRental' },
          { nameKey: 'templates.cat.security' },
        ],
      },
      {
        nameKey: 'templates.concert.marketing',
        categories: [
          { nameKey: 'templates.cat.promotion' },
          { nameKey: 'templates.cat.tickets' },
        ],
      },
    ],
  },
  {
    id: 'blank',
    labelKey: 'templates.blank.label',
    descriptionKey: 'templates.blank.description',
    groups: [],
  },
]

// Apply a template to a freshly-created event. Resolves names with the
// caller-supplied translator so the user's current locale is honoured.
//
// Order matters: groups must exist before categories reference them via
// group_id. We create groups sequentially (small list, simpler than juggling
// IDs from parallel inserts) then fan out categories in parallel per-group.
export async function applyTemplate(
  eventId: string,
  template: TemplateDef,
  t: (key: TKey) => string,
): Promise<void> {
  if (template.groups.length === 0) return

  const groupResults: CategoryGroup[] = []
  for (const groupDef of template.groups) {
    const group = await createCategoryGroup(eventId, {
      name: t(groupDef.nameKey),
    })
    groupResults.push(group)
  }

  await Promise.all(
    template.groups.flatMap((groupDef, idx) =>
      groupDef.categories.map((catDef) =>
        createCategory(eventId, {
          group_id: groupResults[idx]!.id,
          name: t(catDef.nameKey),
        }),
      ),
    ),
  )
}
