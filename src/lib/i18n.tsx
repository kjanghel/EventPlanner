import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'

export type Locale = 'en' | 'hi'

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  hi: 'हिंदी',
}

// English is the source of truth — every key must exist here.
// Hindi is allowed to omit keys; missing keys fall back to English.
const en = {
  // Common
  'common.back': 'Back',
  'common.save': 'Save',
  'common.saving': 'Saving…',
  'common.saved': 'Saved.',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.deleting': 'Deleting…',
  'common.edit': 'Edit',
  'common.add': 'Add',
  'common.loading': 'Loading…',
  'common.loadingEvents': 'Loading events…',
  'common.error': 'Something went wrong.',
  'common.requestTimeout': 'Request timed out. Please refresh.',
  'common.notSignedIn': 'Not signed in',
  'common.optional': 'optional',
  'common.or': 'or',
  'common.dangerZone': 'Danger zone',

  // Currency / numbers
  'currency.rupee': '₹',

  // Auth / SignIn
  'auth.appTitle': 'Event Planner',
  'auth.appSubtitle': 'Sign in to manage your event budget.',
  'auth.continueWithGoogle': 'Continue with Google',
  'auth.emailMeLink': 'Email me a sign-in link',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.linkSent': 'Check your inbox — we sent a sign-in link to {email}.',
  'auth.googleFailed': 'Google sign-in failed',
  'auth.linkFailed': 'Could not send magic link',
  'auth.signOut': 'Sign out',

  // Account menu
  'account.menuLabel': 'Account menu',
  'account.fallbackName': 'Account',
  'account.editProfile': 'Edit profile',

  // Profile
  'profile.title': 'Profile',
  'profile.yourDetails': 'Your details',
  'profile.email': 'Email',
  'profile.emailHelp': 'From your sign-in account.',
  'profile.displayName': 'Display name',
  'profile.displayNamePlaceholder': 'e.g. Karan',
  'profile.displayNameHelp': 'Shown to other members of events you share.',
  'profile.phone': 'Phone',
  'profile.phonePlaceholder': '+91 98765 43210',
  'profile.phoneHelp': 'Optional — shared with members so they can reach you.',
  'profile.language': 'Language',
  'profile.languageHelp': 'Changes labels and buttons. Names, notes, and category text stay as typed.',
  'profile.backToEvents': 'Back to events',
  'profile.saveFailed': 'Could not save',

  // Events list
  'events.greeting': 'Hello, {name}',
  'events.subtitle': 'Your events at a glance.',
  'events.empty.title': 'No events yet',
  'events.empty.body': 'Create one to start tracking budgets, payments, and people.',
  'events.empty.cta': 'Create your first event',
  'events.newEvent': 'New event',
  'events.backToEvents': 'Back to events',
  'events.event': 'Event',
  'events.percentPaid': '{pct}% paid',
  'events.planned': 'Planned',
  'events.confirmed': 'Confirmed',
  'events.paid': 'Paid',
  'events.scheduled': 'Scheduled',

  // Event tabs
  'tabs.summary': 'Summary',
  'tabs.budget': 'Budget',
  'tabs.activity': 'Activity',
  'tabs.upcoming': 'Upcoming',
  'tabs.people': 'People',

  // Event settings
  'eventSettings.title': 'Event settings',
  'eventSettings.eventDetails': 'Event details',
  'eventSettings.eventName': 'Event name',
  'eventSettings.eventDate': 'Date',
  'eventSettings.name': 'Name',
  'eventSettings.editEvent': 'Edit event',
  'eventSettings.settingsFallback': 'Settings',
  'eventSettings.members': 'Members',
  'eventSettings.noMembers': 'No members yet.',
  'eventSettings.unnamed': 'Unnamed',
  'eventSettings.you': '(you)',
  'eventSettings.remove': 'Remove',
  'eventSettings.confirmRemoveMember': 'Remove this member from the event?',
  'eventSettings.pendingInvites': 'Pending invites',
  'eventSettings.noPendingInvites': 'No pending invites.',
  'eventSettings.pendingLabel': 'Pending',
  'eventSettings.copyLink': 'Copy link',
  'eventSettings.copiedInvite': 'Invite text copied to clipboard.',
  'eventSettings.inviteCopyBody': 'You\'ve been invited to plan "{name}" on Event Planner.\nSign in with this email ({email}) at: {url}',
  'eventSettings.confirmCancelInvite': 'Cancel this invite?',
  'eventSettings.couldNotCancel': 'Could not cancel',
  'eventSettings.couldNotRemove': 'Could not remove',
  'eventSettings.couldNotLeave': 'Could not leave',
  'eventSettings.couldNotInvite': 'Could not invite',
  'eventSettings.couldNotDuplicate': 'Could not duplicate',
  'eventSettings.couldNotDelete': 'Could not delete event',
  'eventSettings.inviteByEmail': 'Invite by email',
  'eventSettings.invitePlaceholder': 'alice@gmail.com',
  'eventSettings.inviteHint': 'They\'ll join automatically the next time they sign in with this email.',
  'eventSettings.inviteEmailInvalid': 'Enter a valid email',
  'eventSettings.invitePending': 'This email already has a pending invite.',
  'eventSettings.invited': 'Invited {email}. Sign-in email sent.',
  'eventSettings.invitedNoEmail': 'Invited {email}. Email send failed ({reason}) — use Copy link below to share manually.',
  'eventSettings.inviting': 'Inviting…',
  'eventSettings.sendInvite': 'Send invite',
  'eventSettings.duplicate': 'Duplicate',
  'eventSettings.duplicateDesc': 'Create a new event with the same categories, people, transactions, and scheduled payments. Receipts aren\'t copied.',
  'eventSettings.duplicateThis': 'Duplicate this event',
  'eventSettings.duplicating': 'Duplicating…',
  'eventSettings.duplicatePrompt': 'Name for the new event?',
  'eventSettings.duplicateSuffix': '{name} (copy)',
  'eventSettings.nameEmpty': 'Event name cannot be empty',
  'eventSettings.leaveEvent': 'Leave event',
  'eventSettings.confirmLeave': 'Leave this event? You will lose access.',
  'eventSettings.dangerDesc': 'Deleting the event removes it for all members. Categories, transactions, and scheduled payments stay in the database but become inaccessible from the app.',
  'eventSettings.deleteEvent': 'Delete event',
  'eventSettings.confirmDelete': 'Delete {name}? This will remove it for everyone — members will lose access. This cannot be undone from the UI.',
  'eventSettings.deleteFallbackName': 'this event',

  // New event
  'newEvent.title': 'New event',
  'newEvent.create': 'Create event',
  'newEvent.creating': 'Creating…',
  'newEvent.namePlaceholder': 'e.g. Shadi',
  'newEvent.dateLabel': 'Event date',
  'newEvent.couldNotCreate': 'Could not create event',

  // Summary
  'summary.totals': 'Totals',
  'summary.insights': 'Insights',
  'summary.confirmedVsPlanned': 'Confirmed vs Planned',
  'summary.paidVsConfirmed': 'Paid vs Confirmed',
  'summary.perPerson': 'Paid by person',
  'summary.noPeople': 'No people added yet.',
  'summary.setAmountsHint': 'Set planned and confirmed amounts on categories.',
  'summary.noConfirmed': 'No confirmed amount set.',
  'summary.overPlan': 'over plan',
  'summary.savedVsPlan': 'saved vs plan',
  'summary.matchesPlan': 'matches plan',
  'summary.overConfirmed': 'over confirmed',
  'summary.remainingToPay': 'remaining to pay',
  'summary.fullyPaid': 'fully paid',
  'summary.daysToEvent': 'Days to event',
  'summary.eventIsToday': 'Event is today',
  'summary.daysSinceEvent': 'Days since event',
  'summary.overBudget': 'Over budget · {count} {countLabel}',
  'summary.categorySingular': 'category',
  'summary.categoryPlural': 'categories',
  'summary.topSpend': 'Top spend · {name}',

  // Categories / Budget
  'categories.title': 'Budget',
  'categories.newCategory': 'New category',
  'categories.editingCategory': 'Editing category',
  'categories.categoryName': 'Category name',
  'categories.planned': 'Planned',
  'categories.confirmed': 'Confirmed',
  'categories.note': 'Note',
  'categories.transactions': 'Transactions',
  'categories.scheduledPayments': 'Scheduled Payments',
  'categories.noTransactions': 'No transactions yet.',
  'categories.noScheduled': 'No scheduled payments.',
  'categories.markAsPaid': 'Mark as Paid',
  'categories.amount': 'Amount',
  'categories.date': 'Date',
  'categories.dueDate': 'Due date',
  'categories.paidBy': 'Paid by',
  'categories.expectedPayer': 'Expected payer',
  'categories.noOneAssigned': 'No one assigned',
  'categories.empty.title': 'No categories yet',
  'categories.empty.body': 'Add your first budget category to get started.',
  'categories.empty.cta': 'Add category',
  'categories.addCategoryButton': '+ Add category',
  'categories.loading': 'Loading categories…',
  'categories.confirmDelete': 'Delete this category?',
  'categories.couldNotDelete': 'Could not delete',
  'categories.couldNotSave': 'Could not save',
  'categories.couldNotAdd': 'Could not add category',
  'categories.adding': 'Adding…',
  'categories.namePlaceholder': 'e.g. Bhaat 1',
  'categories.plannedAmount': 'Planned (₹)',
  'categories.confirmedAmount': 'Confirmed (₹)',
  'categories.notePlaceholder': 'e.g. Vegetarian menu',
  'categories.remaining': 'Remaining',
  'categories.over': 'Over',
  'categories.editCategory': 'Edit category',
  'categories.confirmDeleteTxn': 'Delete this transaction?',
  'categories.confirmDeleteSched': 'Delete this scheduled payment?',
  'categories.noScheduledYet': 'No scheduled payments yet.',
  'categories.addTransaction': '+ Add transaction',
  'categories.addScheduled': '+ Add scheduled payment',
  'categories.paidLabel': 'Paid',
  'categories.markPaidShort': 'Mark paid',
  'categories.backBudget': '← Budget',
  'categories.categoryFallback': 'Category',
  'categories.amountGtZero': 'Amount must be greater than 0',
  'categories.selectPayer': 'Select who paid',
  'categories.notePlaceholderAdvance': 'e.g. Advance payment',
  'categories.couldNotAddTxn': 'Could not add transaction',
  'categories.couldNotAddSched': 'Could not add scheduled payment',
  'categories.txnSavedReceiptFailed': 'Transaction saved but receipt upload failed: {reason}',
  'categories.fillAllFields': 'Please fill in all fields. Amount must be greater than 0.',
  'categories.expectedAmount': 'Expected amount (₹)',
  'categories.notePlaceholderFinal': 'e.g. Final payment',

  // Mark as paid sheet
  'markPaid.title': 'Mark as Paid',
  'markPaid.partialHelp': 'Pay a smaller amount to record a partial payment.',
  'markPaid.confirm': 'Confirm payment',
  'markPaid.amountLabel': 'Amount paid (₹)',
  'markPaid.partialNotice': 'Partial: ₹{remaining} will remain pending.',
  'markPaid.recordPartial': 'Record partial',
  'markPaid.notePlaceholder': 'e.g. Paid via bank transfer',
  'markPaid.couldNotMark': 'Could not mark as paid',

  // Upcoming
  'upcoming.title': 'Upcoming',
  'upcoming.needsAttention': 'Needs attention',
  'upcoming.overdue': 'Overdue {days}d',
  'upcoming.overdueLabel': 'overdue',
  'upcoming.thisWeek': 'due this week',
  'upcoming.dueToday': 'Due today',
  'upcoming.dueTomorrow': 'Due tomorrow',
  'upcoming.dueIn': 'Due in {days}d',
  'upcoming.empty': 'No upcoming payments.',
  'upcoming.markPaid': 'Mark paid',
  'upcoming.openCategory': 'Open category',
  'upcoming.moreCount': '+ {count} more',

  // People
  'people.title': 'People',
  'people.addPerson': 'Add person',
  'people.addPersonButton': '+ Add person',
  'people.name': 'Name',
  'people.phone': 'Phone',
  'people.empty.title': 'No people yet',
  'people.empty.body': 'Add people who will pay or receive money for this event.',
  'people.loading': 'Loading people…',
  'people.confirmDelete': 'Delete this person?',
  'people.couldNotDelete': 'Could not delete',
  'people.namePlaceholder': 'e.g. Vivek',
  'people.phonePlaceholder': '+91...',
  'people.adding': 'Adding…',
  'people.couldNotAdd': 'Could not add person',

  // Activity
  'activity.title': 'Activity',
  'activity.empty': 'No activity yet.',
  'activity.noTransactions': 'No transactions yet.',
  'activity.all': 'All',
  'activity.personPaid': '{name} paid',
  'activity.totalPaid': 'Total paid',
  'activity.personFallback': 'Person',
  'activity.receipt': 'Receipt',
  'activity.couldNotOpen': 'Could not open receipt',
  'receipt.replace': 'Replace',
  'receipt.remove': 'Remove',
  'receipt.add': '+ Receipt',
  'receipt.uploading': 'Uploading…',
  'receipt.uploadFailed': 'Upload failed',
  'receipt.couldNotRemove': 'Could not remove',
  'receipt.confirmRemove': 'Remove this receipt?',

  // Quick add FAB
  'quickAdd.title': 'Quick add',
  'quickAdd.transaction': 'Transaction',
  'quickAdd.scheduled': 'Scheduled',
  'quickAdd.label': 'Quick add',
  'quickAdd.close': 'Close',
  'quickAdd.amount': 'Amount (₹)',
  'quickAdd.category': 'Category',
  'quickAdd.selectCategory': 'Select category…',
  'quickAdd.noCategoriesHint': 'No categories yet. Add one from the Budget tab.',
  'quickAdd.selectPerson': 'Select person…',
  'quickAdd.noPeopleHint': 'Add a person on the People tab first.',
  'quickAdd.receipt': 'Receipt',
  'quickAdd.note': 'Note',

  // Common — additions for groups + templates features
  'common.dismiss': 'Dismiss',
  'common.next': 'Next',

  // Categories — additions for groups feature
  'categories.add': 'Add',
  'categories.group': 'Group',

  // Category groups (Reception / Barat / Haldi sub-events)
  'groups.addGroup': 'Add group',
  'groups.groupName': 'Group name',
  'groups.namePlaceholder': 'e.g. Reception',
  'groups.adding': 'Adding…',
  'groups.couldNotAdd': 'Could not add group.',
  'groups.summary': 'Paid ₹{paid} · Planned ₹{planned}',
  'groups.hint.title': 'Tip',
  'groups.hint.body':
    "Your categories are in one 'General' group. Add groups like 'Reception' or 'Barat' to organise them.",
  'groups.expandAll': 'Expand all',
  'groups.collapseAll': 'Collapse all',
  'groups.renameGroup': 'Rename group',
  'groups.deleteGroup': 'Delete group',
  'groups.couldNotSave': 'Could not save group.',
  'groups.couldNotDelete': 'Could not delete group.',
  'groups.confirmDeleteEmpty': 'Delete the "{name}" group?',
  'groups.confirmDeleteWithCats':
    'Delete the "{name}" group? Its {count} categories will move to the General group.',

  // Templates (NewEvent template picker + applied group/category names)
  'templates.pickTitle': 'Start from a template',
  'templates.pickSubtitle': 'We\'ll create some common groups and categories for you. You can edit anything later.',
  'templates.wedding.label': 'Indian Wedding',
  'templates.wedding.description': '5 sub-events with catering, decor, music',
  'templates.wedding.haldi': 'Haldi',
  'templates.wedding.mehendi': 'Mehendi',
  'templates.wedding.sangeet': 'Sangeet',
  'templates.wedding.barat': 'Barat',
  'templates.wedding.reception': 'Reception',
  'templates.birthday.label': 'Birthday / Anniversary',
  'templates.birthday.description': 'Cake, decor, gifts, catering',
  'templates.birthday.celebration': 'Celebration',
  'templates.concert.label': 'Concert / Live event',
  'templates.concert.description': 'Stage, artist, venue, marketing',
  'templates.concert.stage': 'Stage',
  'templates.concert.artist': 'Artist',
  'templates.concert.venue': 'Venue',
  'templates.concert.marketing': 'Marketing',
  'templates.blank.label': 'Blank',
  'templates.blank.description': 'Start from scratch — no groups',
  'templates.applying': 'Setting up your event…',
  // Common template categories — reused across templates
  'templates.cat.decoration': 'Decoration',
  'templates.cat.catering': 'Catering',
  'templates.cat.music': 'Music',
  'templates.cat.photography': 'Photography',
  'templates.cat.mehendiArtist': 'Mehendi artist',
  'templates.cat.dj': 'DJ',
  'templates.cat.horseCar': 'Horse / Car',
  'templates.cat.band': 'Band',
  'templates.cat.venue': 'Venue',
  'templates.cat.cake': 'Cake',
  'templates.cat.gifts': 'Gifts',
  'templates.cat.lighting': 'Lighting',
  'templates.cat.sound': 'Sound',
  'templates.cat.stageSetup': 'Stage setup',
  'templates.cat.artistFees': 'Artist fees',
  'templates.cat.travel': 'Travel',
  'templates.cat.accommodation': 'Accommodation',
  'templates.cat.venueRental': 'Venue rental',
  'templates.cat.security': 'Security',
  'templates.cat.promotion': 'Promotion',
  'templates.cat.tickets': 'Tickets',

  // Summary — Phase E additions
  'summary.spendByGroup': 'Spend by group',
  'summary.spendOverTime': 'Spend over time',
  'summary.topSpenders': 'Top spenders',
  'summary.legendRemaining': 'Remaining',

  // Notifications (Web Push)
  'notifications.modal.title': 'Get daily reminders?',
  'notifications.modal.body':
    "Don't forget to log today's spends. We'll send a quick nudge at 8 pm so the budget stays current.",
  'notifications.modal.enable': 'Enable reminders',
  'notifications.modal.enabling': 'Enabling…',
  'notifications.modal.skipForNow': 'Skip for now',
  'notifications.modal.notNow': "Don't ask again",
  'notifications.errorUnsupported': 'This browser does not support push notifications.',
  'notifications.errorNoVapid': 'Notifications are not configured for this build yet.',
  'notifications.errorPermissionDenied':
    'Permission was denied. You can re-enable from your browser settings.',
  'notifications.errorNoUser': 'You need to be signed in.',
  'notifications.errorGeneric': 'Could not enable notifications. Please try again.',
  'notifications.settings.title': 'Daily reminders',
  'notifications.settings.body':
    'A quick notification at 8 pm IST asking if you spent anything today.',
  'notifications.settings.enable': 'Enable reminders',
  'notifications.settings.disable': 'Disable reminders',
  'notifications.settings.permissionDeniedHint':
    'Notifications are blocked in your browser. Unblock them in the site settings, then come back.',
  'notifications.settings.test': 'Send test notification',
  'notifications.settings.testing': 'Sending…',
  'notifications.settings.testSent': 'Test sent to {count} device(s). Check your lock screen.',
  'notifications.settings.testFailed': 'Test failed: {reason}',
  'notifications.settings.reminderTime': 'Reminder time',
  'notifications.settings.reminderTimeHelp':
    "We'll send the daily nudge at this hour in your timezone.",

  // PWA install nudge (iOS Safari only)
  'install.banner.title': 'Install Event Planner on your home screen',
  'install.banner.subtitle':
    'Daily reminders only work after you install. Takes 10 seconds.',
  'install.banner.show': 'Show me how',
  'install.banner.hide': 'Hide',
  'install.steps.step1': 'Tap the Share button at the bottom of Safari.',
  'install.steps.step2': 'Scroll down and tap "Add to Home Screen".',
  'install.steps.step3':
    'Tap "Add", then open Event Planner from your home screen icon.',
  'install.steps.openInSafari':
    'Note: this only works in Safari. Open this page in Safari first, then follow the steps.',
} as const

export type TKey = keyof typeof en

const hi: Partial<Record<TKey, string>> = {
  // Common
  'common.back': 'वापस',
  'common.save': 'सहेजें',
  'common.saving': 'सहेज रहे हैं…',
  'common.saved': 'सहेज लिया।',
  'common.cancel': 'रद्द करें',
  'common.delete': 'हटाएं',
  'common.deleting': 'हटा रहे हैं…',
  'common.edit': 'बदलें',
  'common.add': 'जोड़ें',
  'common.loading': 'लोड हो रहा है…',
  'common.loadingEvents': 'इवेंट लोड हो रहे हैं…',
  'common.error': 'कुछ गलत हो गया।',
  'common.requestTimeout': 'अनुरोध का समय समाप्त हुआ। कृपया फिर से लोड करें।',
  'common.notSignedIn': 'साइन इन नहीं हैं',
  'common.optional': 'वैकल्पिक',
  'common.or': 'या',
  'common.dangerZone': 'ख़तरनाक कार्रवाई',

  // Currency
  'currency.rupee': '₹',

  // Auth
  'auth.appTitle': 'इवेंट प्लानर',
  'auth.appSubtitle': 'अपने इवेंट का बजट संभालने के लिए साइन इन करें।',
  'auth.continueWithGoogle': 'Google से जारी रखें',
  'auth.emailMeLink': 'मुझे साइन-इन लिंक ईमेल करें',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.linkSent': 'अपना इनबॉक्स देखें — हमने {email} पर साइन-इन लिंक भेजा है।',
  'auth.googleFailed': 'Google साइन-इन विफल हुआ',
  'auth.linkFailed': 'लिंक भेजा नहीं जा सका',
  'auth.signOut': 'साइन आउट',

  // Account menu
  'account.menuLabel': 'खाता मेन्यू',
  'account.fallbackName': 'खाता',
  'account.editProfile': 'प्रोफ़ाइल बदलें',

  // Profile
  'profile.title': 'प्रोफ़ाइल',
  'profile.yourDetails': 'आपकी जानकारी',
  'profile.email': 'ईमेल',
  'profile.emailHelp': 'आपके साइन-इन खाते से।',
  'profile.displayName': 'प्रदर्शन नाम',
  'profile.displayNamePlaceholder': 'जैसे — करण',
  'profile.displayNameHelp': 'जिन इवेंट में आप शामिल हैं, उनके अन्य सदस्यों को यह नाम दिखेगा।',
  'profile.phone': 'फोन',
  'profile.phonePlaceholder': '+91 98765 43210',
  'profile.phoneHelp': 'वैकल्पिक — सदस्य इसके ज़रिए आपसे संपर्क कर पाएंगे।',
  'profile.language': 'भाषा',
  'profile.languageHelp': 'सिर्फ़ लेबल और बटन बदलते हैं। नाम, नोट और कैटेगरी का टेक्स्ट जैसा टाइप किया वैसा ही रहेगा।',
  'profile.backToEvents': 'इवेंट पर वापस',
  'profile.saveFailed': 'सहेजा नहीं जा सका',

  // Events list
  'events.greeting': 'नमस्ते, {name}',
  'events.subtitle': 'आपके इवेंट एक नज़र में।',
  'events.empty.title': 'अभी कोई इवेंट नहीं',
  'events.empty.body': 'बजट, भुगतान और लोगों पर नज़र रखने के लिए एक इवेंट बनाएं।',
  'events.empty.cta': 'अपना पहला इवेंट बनाएं',
  'events.newEvent': 'नया इवेंट',
  'events.backToEvents': 'इवेंट पर वापस',
  'events.event': 'इवेंट',
  'events.percentPaid': '{pct}% भुगतान',
  'events.planned': 'अनुमानित',
  'events.confirmed': 'तय',
  'events.paid': 'भुगतान',
  'events.scheduled': 'निर्धारित',

  // Event tabs
  'tabs.summary': 'सारांश',
  'tabs.budget': 'बजट',
  'tabs.activity': 'गतिविधि',
  'tabs.upcoming': 'आगामी',
  'tabs.people': 'लोग',

  // Event settings
  'eventSettings.title': 'इवेंट सेटिंग्स',
  'eventSettings.eventDetails': 'इवेंट की जानकारी',
  'eventSettings.eventName': 'इवेंट का नाम',
  'eventSettings.eventDate': 'तारीख',
  'eventSettings.name': 'नाम',
  'eventSettings.editEvent': 'इवेंट बदलें',
  'eventSettings.settingsFallback': 'सेटिंग्स',
  'eventSettings.members': 'सदस्य',
  'eventSettings.noMembers': 'अभी कोई सदस्य नहीं।',
  'eventSettings.unnamed': 'बिना नाम',
  'eventSettings.you': '(आप)',
  'eventSettings.remove': 'हटाएं',
  'eventSettings.confirmRemoveMember': 'इस सदस्य को इवेंट से हटाएं?',
  'eventSettings.pendingInvites': 'लंबित आमंत्रण',
  'eventSettings.noPendingInvites': 'कोई लंबित आमंत्रण नहीं।',
  'eventSettings.pendingLabel': 'लंबित',
  'eventSettings.copyLink': 'लिंक कॉपी करें',
  'eventSettings.copiedInvite': 'आमंत्रण क्लिपबोर्ड पर कॉपी हो गया।',
  'eventSettings.inviteCopyBody': 'आपको "{name}" इवेंट प्लान करने के लिए Event Planner पर आमंत्रित किया गया है।\nइस ईमेल ({email}) से यहां साइन इन करें: {url}',
  'eventSettings.confirmCancelInvite': 'इस आमंत्रण को रद्द करें?',
  'eventSettings.couldNotCancel': 'रद्द नहीं हो पाया',
  'eventSettings.couldNotRemove': 'हटाया नहीं जा सका',
  'eventSettings.couldNotLeave': 'इवेंट छोड़ा नहीं जा सका',
  'eventSettings.couldNotInvite': 'आमंत्रण नहीं भेजा जा सका',
  'eventSettings.couldNotDuplicate': 'प्रतिलिपि नहीं बन पाई',
  'eventSettings.couldNotDelete': 'इवेंट हटाया नहीं जा सका',
  'eventSettings.inviteByEmail': 'ईमेल से आमंत्रित करें',
  'eventSettings.invitePlaceholder': 'alice@gmail.com',
  'eventSettings.inviteHint': 'जब वे इस ईमेल से अगली बार साइन इन करेंगे, अपने आप जुड़ जाएंगे।',
  'eventSettings.inviteEmailInvalid': 'सही ईमेल डालें',
  'eventSettings.invitePending': 'इस ईमेल को पहले से आमंत्रण भेजा जा चुका है।',
  'eventSettings.invited': '{email} को आमंत्रित किया। साइन-इन ईमेल भेजी गई।',
  'eventSettings.invitedNoEmail': '{email} को आमंत्रित किया। ईमेल भेजने में दिक्कत आई ({reason}) — मैन्युअल शेयर करने के लिए नीचे "लिंक कॉपी करें" का उपयोग करें।',
  'eventSettings.inviting': 'आमंत्रण भेज रहे हैं…',
  'eventSettings.sendInvite': 'आमंत्रण भेजें',
  'eventSettings.duplicate': 'प्रतिलिपि',
  'eventSettings.duplicateDesc': 'समान कैटेगरी, लोग, लेन-देन और निर्धारित भुगतान के साथ नया इवेंट बनाएं। रसीदें कॉपी नहीं होतीं।',
  'eventSettings.duplicateThis': 'इस इवेंट की प्रतिलिपि बनाएं',
  'eventSettings.duplicating': 'प्रतिलिपि बन रही है…',
  'eventSettings.duplicatePrompt': 'नए इवेंट का नाम?',
  'eventSettings.duplicateSuffix': '{name} (प्रतिलिपि)',
  'eventSettings.nameEmpty': 'इवेंट का नाम खाली नहीं हो सकता',
  'eventSettings.leaveEvent': 'इवेंट छोड़ें',
  'eventSettings.confirmLeave': 'यह इवेंट छोड़ें? आपकी पहुँच खत्म हो जाएगी।',
  'eventSettings.dangerDesc': 'इवेंट हटाने से वह सभी सदस्यों के लिए हट जाता है। कैटेगरी, लेन-देन और निर्धारित भुगतान डेटाबेस में रहते हैं लेकिन ऐप में दिखना बंद हो जाते हैं।',
  'eventSettings.deleteEvent': 'इवेंट हटाएं',
  'eventSettings.confirmDelete': '{name} हटाएं? यह सबके लिए हट जाएगा — सदस्यों की पहुँच खत्म हो जाएगी। यह कार्रवाई ऐप से वापस नहीं की जा सकती।',
  'eventSettings.deleteFallbackName': 'यह इवेंट',

  // New event
  'newEvent.title': 'नया इवेंट',
  'newEvent.create': 'इवेंट बनाएं',
  'newEvent.creating': 'बना रहे हैं…',
  'newEvent.namePlaceholder': 'जैसे — शादी',
  'newEvent.dateLabel': 'इवेंट की तारीख',
  'newEvent.couldNotCreate': 'इवेंट नहीं बनाया जा सका',

  // Summary
  'summary.totals': 'कुल योग',
  'summary.insights': 'विश्लेषण',
  'summary.confirmedVsPlanned': 'तय बनाम अनुमानित',
  'summary.paidVsConfirmed': 'भुगतान बनाम तय',
  'summary.perPerson': 'किसने कितना भुगतान किया',
  'summary.noPeople': 'अभी कोई व्यक्ति नहीं जोड़ा।',
  'summary.setAmountsHint': 'कैटेगरी में अनुमानित और तय रकम भरें।',
  'summary.noConfirmed': 'कोई तय रकम नहीं भरी।',
  'summary.overPlan': 'अनुमान से अधिक',
  'summary.savedVsPlan': 'अनुमान से बचत',
  'summary.matchesPlan': 'अनुमान के बराबर',
  'summary.overConfirmed': 'तय से अधिक',
  'summary.remainingToPay': 'भुगतान बाकी',
  'summary.fullyPaid': 'पूरा भुगतान हो गया',
  'summary.daysToEvent': 'इवेंट में बाकी दिन',
  'summary.eventIsToday': 'इवेंट आज है',
  'summary.daysSinceEvent': 'इवेंट के बाद बीते दिन',
  'summary.overBudget': 'बजट से अधिक · {count} {countLabel}',
  'summary.categorySingular': 'कैटेगरी',
  'summary.categoryPlural': 'कैटेगरी',
  'summary.topSpend': 'सबसे ज़्यादा खर्च · {name}',

  // Categories
  'categories.title': 'बजट',
  'categories.newCategory': 'नई कैटेगरी',
  'categories.editingCategory': 'कैटेगरी बदलें',
  'categories.categoryName': 'कैटेगरी का नाम',
  'categories.planned': 'अनुमानित',
  'categories.confirmed': 'तय',
  'categories.note': 'नोट',
  'categories.transactions': 'लेन-देन',
  'categories.scheduledPayments': 'निर्धारित भुगतान',
  'categories.noTransactions': 'अभी कोई लेन-देन नहीं।',
  'categories.noScheduled': 'कोई निर्धारित भुगतान नहीं।',
  'categories.markAsPaid': 'भुगतान दर्ज करें',
  'categories.amount': 'रकम',
  'categories.date': 'तारीख',
  'categories.dueDate': 'देय तारीख',
  'categories.paidBy': 'किसने भुगतान किया',
  'categories.expectedPayer': 'भुगतान कौन करेगा',
  'categories.noOneAssigned': 'किसी को नहीं चुना',
  'categories.empty.title': 'अभी कोई कैटेगरी नहीं',
  'categories.empty.body': 'शुरू करने के लिए अपनी पहली बजट कैटेगरी जोड़ें।',
  'categories.empty.cta': 'कैटेगरी जोड़ें',
  'categories.addCategoryButton': '+ कैटेगरी जोड़ें',
  'categories.loading': 'कैटेगरी लोड हो रही हैं…',
  'categories.confirmDelete': 'इस कैटेगरी को हटाएं?',
  'categories.couldNotDelete': 'हटाया नहीं जा सका',
  'categories.couldNotSave': 'सहेजा नहीं जा सका',
  'categories.couldNotAdd': 'कैटेगरी जोड़ी नहीं जा सकी',
  'categories.adding': 'जोड़ रहे हैं…',
  'categories.namePlaceholder': 'जैसे — भात 1',
  'categories.plannedAmount': 'अनुमानित (₹)',
  'categories.confirmedAmount': 'तय (₹)',
  'categories.notePlaceholder': 'जैसे — शाकाहारी मेन्यू',
  'categories.remaining': 'बाकी',
  'categories.over': 'अधिक',
  'categories.editCategory': 'कैटेगरी बदलें',
  'categories.confirmDeleteTxn': 'इस लेन-देन को हटाएं?',
  'categories.confirmDeleteSched': 'इस निर्धारित भुगतान को हटाएं?',
  'categories.noScheduledYet': 'अभी कोई निर्धारित भुगतान नहीं।',
  'categories.addTransaction': '+ लेन-देन जोड़ें',
  'categories.addScheduled': '+ निर्धारित भुगतान जोड़ें',
  'categories.paidLabel': 'भुगतान हो गया',
  'categories.markPaidShort': 'भुगतान दर्ज करें',
  'categories.backBudget': '← बजट',
  'categories.categoryFallback': 'कैटेगरी',
  'categories.amountGtZero': 'रकम 0 से ज़्यादा होनी चाहिए',
  'categories.selectPayer': 'किसने भुगतान किया, चुनें',
  'categories.notePlaceholderAdvance': 'जैसे — अग्रिम भुगतान',
  'categories.couldNotAddTxn': 'लेन-देन जोड़ा नहीं जा सका',
  'categories.couldNotAddSched': 'निर्धारित भुगतान जोड़ा नहीं जा सका',
  'categories.txnSavedReceiptFailed': 'लेन-देन सहेज लिया लेकिन रसीद अपलोड नहीं हो पाई: {reason}',
  'categories.fillAllFields': 'कृपया सभी फ़ील्ड भरें। रकम 0 से ज़्यादा होनी चाहिए।',
  'categories.expectedAmount': 'अपेक्षित रकम (₹)',
  'categories.notePlaceholderFinal': 'जैसे — अंतिम भुगतान',

  // Mark as paid
  'markPaid.title': 'भुगतान दर्ज करें',
  'markPaid.partialHelp': 'कम रकम डालकर आंशिक भुगतान दर्ज करें।',
  'markPaid.confirm': 'भुगतान की पुष्टि करें',
  'markPaid.amountLabel': 'चुकाई गई रकम (₹)',
  'markPaid.partialNotice': 'आंशिक: ₹{remaining} अभी भी बाकी रहेगा।',
  'markPaid.recordPartial': 'आंशिक भुगतान दर्ज करें',
  'markPaid.notePlaceholder': 'जैसे — बैंक ट्रांसफर से दिया',
  'markPaid.couldNotMark': 'भुगतान दर्ज नहीं हो पाया',

  // Upcoming
  'upcoming.title': 'आगामी',
  'upcoming.needsAttention': 'ध्यान दें',
  'upcoming.overdue': '{days} दिन की देरी',
  'upcoming.overdueLabel': 'बकाया',
  'upcoming.thisWeek': 'इस हफ्ते देय',
  'upcoming.dueToday': 'आज देय',
  'upcoming.dueTomorrow': 'कल देय',
  'upcoming.dueIn': '{days} दिन में देय',
  'upcoming.empty': 'कोई आगामी भुगतान नहीं।',
  'upcoming.markPaid': 'भुगतान दर्ज करें',
  'upcoming.openCategory': 'कैटेगरी खोलें',
  'upcoming.moreCount': '+ {count} और',

  // People
  'people.title': 'लोग',
  'people.addPerson': 'व्यक्ति जोड़ें',
  'people.addPersonButton': '+ व्यक्ति जोड़ें',
  'people.name': 'नाम',
  'people.phone': 'फोन',
  'people.empty.title': 'अभी कोई व्यक्ति नहीं',
  'people.empty.body': 'इस इवेंट में पैसे देने या लेने वाले लोगों को जोड़ें।',
  'people.loading': 'लोग लोड हो रहे हैं…',
  'people.confirmDelete': 'इस व्यक्ति को हटाएं?',
  'people.couldNotDelete': 'हटाया नहीं जा सका',
  'people.namePlaceholder': 'जैसे — विवेक',
  'people.phonePlaceholder': '+91...',
  'people.adding': 'जोड़ रहे हैं…',
  'people.couldNotAdd': 'व्यक्ति जोड़ा नहीं जा सका',

  // Activity
  'activity.title': 'गतिविधि',
  'activity.empty': 'अभी कोई गतिविधि नहीं।',
  'activity.noTransactions': 'अभी कोई लेन-देन नहीं।',
  'activity.all': 'सभी',
  'activity.personPaid': '{name} ने भुगतान किया',
  'activity.totalPaid': 'कुल भुगतान',
  'activity.personFallback': 'व्यक्ति',
  'activity.receipt': 'रसीद',
  'activity.couldNotOpen': 'रसीद नहीं खुल पाई',
  'receipt.replace': 'बदलें',
  'receipt.remove': 'हटाएं',
  'receipt.add': '+ रसीद',
  'receipt.uploading': 'अपलोड हो रहा है…',
  'receipt.uploadFailed': 'अपलोड विफल हुआ',
  'receipt.couldNotRemove': 'हटाया नहीं जा सका',
  'receipt.confirmRemove': 'यह रसीद हटाएं?',

  // Quick add
  'quickAdd.title': 'जल्दी जोड़ें',
  'quickAdd.transaction': 'लेन-देन',
  'quickAdd.scheduled': 'निर्धारित',
  'quickAdd.label': 'जल्दी जोड़ें',
  'quickAdd.close': 'बंद करें',
  'quickAdd.amount': 'रकम (₹)',
  'quickAdd.category': 'कैटेगरी',
  'quickAdd.selectCategory': 'कैटेगरी चुनें…',
  'quickAdd.noCategoriesHint': 'अभी कोई कैटेगरी नहीं। बजट टैब से जोड़ें।',
  'quickAdd.selectPerson': 'व्यक्ति चुनें…',
  'quickAdd.noPeopleHint': 'पहले "लोग" टैब से व्यक्ति जोड़ें।',
  'quickAdd.receipt': 'रसीद',
  'quickAdd.note': 'नोट',

  // Common
  'common.dismiss': 'बंद करें',
  'common.next': 'आगे',

  // Categories — groups addition
  'categories.add': 'जोड़ें',
  'categories.group': 'समूह',

  // Category groups
  'groups.addGroup': 'समूह जोड़ें',
  'groups.groupName': 'समूह का नाम',
  'groups.namePlaceholder': 'जैसे रिसेप्शन',
  'groups.adding': 'जोड़ रहे हैं…',
  'groups.couldNotAdd': 'समूह नहीं जोड़ पाए।',
  'groups.summary': 'भुगतान ₹{paid} · योजना ₹{planned}',
  'groups.hint.title': 'सुझाव',
  'groups.hint.body':
    'सभी कैटेगरी अभी "General" समूह में हैं। रिसेप्शन, बारात जैसे समूह बनाकर व्यवस्थित करें।',
  'groups.expandAll': 'सभी खोलें',
  'groups.collapseAll': 'सभी बंद करें',
  'groups.renameGroup': 'समूह का नाम बदलें',
  'groups.deleteGroup': 'समूह हटाएँ',
  'groups.couldNotSave': 'समूह सहेज नहीं पाए।',
  'groups.couldNotDelete': 'समूह हटा नहीं पाए।',
  'groups.confirmDeleteEmpty': '"{name}" समूह हटाएँ?',
  'groups.confirmDeleteWithCats':
    '"{name}" समूह हटाएँ? इसकी {count} कैटेगरी General समूह में चली जाएँगी।',

  // Templates
  'templates.pickTitle': 'टेम्पलेट से शुरू करें',
  'templates.pickSubtitle': 'हम आपके लिए कुछ सामान्य समूह और कैटेगरी बना देंगे। बाद में बदल सकते हैं।',
  'templates.wedding.label': 'भारतीय शादी',
  'templates.wedding.description': '5 उप-कार्यक्रम, कैटरिंग, सजावट, संगीत',
  'templates.wedding.haldi': 'हल्दी',
  'templates.wedding.mehendi': 'मेहंदी',
  'templates.wedding.sangeet': 'संगीत',
  'templates.wedding.barat': 'बारात',
  'templates.wedding.reception': 'रिसेप्शन',
  'templates.birthday.label': 'जन्मदिन / सालगिरह',
  'templates.birthday.description': 'केक, सजावट, उपहार, कैटरिंग',
  'templates.birthday.celebration': 'समारोह',
  'templates.concert.label': 'कॉन्सर्ट / लाइव कार्यक्रम',
  'templates.concert.description': 'मंच, कलाकार, स्थल, प्रचार',
  'templates.concert.stage': 'मंच',
  'templates.concert.artist': 'कलाकार',
  'templates.concert.venue': 'स्थल',
  'templates.concert.marketing': 'प्रचार',
  'templates.blank.label': 'खाली',
  'templates.blank.description': 'खाली शुरू करें — कोई समूह नहीं',
  'templates.applying': 'आपका कार्यक्रम तैयार हो रहा है…',
  'templates.cat.decoration': 'सजावट',
  'templates.cat.catering': 'कैटरिंग',
  'templates.cat.music': 'संगीत',
  'templates.cat.photography': 'फोटोग्राफी',
  'templates.cat.mehendiArtist': 'मेहंदी आर्टिस्ट',
  'templates.cat.dj': 'डीजे',
  'templates.cat.horseCar': 'घोड़ी / गाड़ी',
  'templates.cat.band': 'बैंड',
  'templates.cat.venue': 'स्थल',
  'templates.cat.cake': 'केक',
  'templates.cat.gifts': 'उपहार',
  'templates.cat.lighting': 'लाइटिंग',
  'templates.cat.sound': 'साउंड',
  'templates.cat.stageSetup': 'मंच सेटअप',
  'templates.cat.artistFees': 'कलाकार फीस',
  'templates.cat.travel': 'यात्रा',
  'templates.cat.accommodation': 'रहने की व्यवस्था',
  'templates.cat.venueRental': 'स्थल किराया',
  'templates.cat.security': 'सुरक्षा',
  'templates.cat.promotion': 'प्रचार',
  'templates.cat.tickets': 'टिकट',

  // Summary — Phase E
  'summary.spendByGroup': 'समूह के अनुसार खर्च',
  'summary.spendOverTime': 'समय के साथ खर्च',
  'summary.topSpenders': 'सबसे ज़्यादा खर्च करने वाले',
  'summary.legendRemaining': 'बचा हुआ',

  // Notifications
  'notifications.modal.title': 'क्या रोज़ रिमाइंडर चाहिए?',
  'notifications.modal.body':
    'आज के खर्च दर्ज करना न भूलें। शाम 8 बजे एक छोटा रिमाइंडर भेजेंगे ताकि बजट सही रहे।',
  'notifications.modal.enable': 'रिमाइंडर चालू करें',
  'notifications.modal.enabling': 'चालू कर रहे हैं…',
  'notifications.modal.skipForNow': 'अभी छोड़ें',
  'notifications.modal.notNow': 'फिर मत पूछें',
  'notifications.errorUnsupported': 'यह ब्राउज़र पुश नोटिफिकेशन समर्थन नहीं करता।',
  'notifications.errorNoVapid': 'इस बिल्ड में नोटिफिकेशन सेटअप नहीं हैं।',
  'notifications.errorPermissionDenied':
    'अनुमति नहीं मिली। ब्राउज़र सेटिंग से फिर से चालू कर सकते हैं।',
  'notifications.errorNoUser': 'पहले साइन इन करें।',
  'notifications.errorGeneric': 'नोटिफिकेशन चालू नहीं हो पाए। फिर कोशिश करें।',
  'notifications.settings.title': 'रोज़ का रिमाइंडर',
  'notifications.settings.body':
    'शाम 8 बजे IST पर एक छोटा नोटिफिकेशन — आज कोई खर्च हुआ क्या?',
  'notifications.settings.enable': 'रिमाइंडर चालू करें',
  'notifications.settings.disable': 'रिमाइंडर बंद करें',
  'notifications.settings.permissionDeniedHint':
    'ब्राउज़र में नोटिफिकेशन ब्लॉक हैं। साइट सेटिंग से अनब्लॉक करें।',
  'notifications.settings.test': 'टेस्ट नोटिफिकेशन भेजें',
  'notifications.settings.testing': 'भेज रहे हैं…',
  'notifications.settings.testSent': '{count} डिवाइस को टेस्ट भेजा। लॉक स्क्रीन देखें।',
  'notifications.settings.testFailed': 'टेस्ट विफल: {reason}',
  'notifications.settings.reminderTime': 'रिमाइंडर का समय',
  'notifications.settings.reminderTimeHelp':
    'आपके टाइमज़ोन में इस समय रोज़ का नोटिफिकेशन भेजा जाएगा।',

  // PWA install nudge
  'install.banner.title': 'Event Planner को होम स्क्रीन पर इंस्टॉल करें',
  'install.banner.subtitle':
    'रोज़ का रिमाइंडर इंस्टॉल करने के बाद ही काम करेगा। बस 10 सेकंड।',
  'install.banner.show': 'कैसे करें?',
  'install.banner.hide': 'छुपाएँ',
  'install.steps.step1': 'Safari के नीचे Share बटन दबाएँ।',
  'install.steps.step2': 'नीचे स्क्रॉल करके "Add to Home Screen" चुनें।',
  'install.steps.step3':
    '"Add" दबाएँ, फिर होम स्क्रीन से Event Planner खोलें।',
  'install.steps.openInSafari':
    'नोट: यह केवल Safari में काम करता है। पहले Safari में यह पेज खोलें, फिर आगे बढ़ें।',
}

const dictionaries: Record<Locale, Partial<Record<TKey, string>>> = { en, hi }

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k]
    return v === undefined ? `{${k}}` : String(v)
  })
}

export function translate(locale: Locale, key: TKey, params?: Record<string, string | number>) {
  const template = dictionaries[locale][key] ?? en[key]
  return interpolate(template, params)
}

// Numbers: always Indian grouping (1,00,000) — independent of UI language.
// Hindi speakers in finance contexts read Western numerals fluently.
export function formatAmount(n: number, opts: { maximumFractionDigits?: number } = {}) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: opts.maximumFractionDigits ?? 0,
  }).format(n)
}

export function formatDate(dateStr: string, locale: Locale, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  const tag = locale === 'hi' ? 'hi-IN' : 'en-IN'
  return new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')).toLocaleDateString(tag, opts)
}

type LocaleState = {
  locale: Locale
  setLocale: (next: Locale) => Promise<void>
  t: (key: TKey, params?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleState | undefined>(undefined)

const STORAGE_KEY = 'eventplanner.locale'

function readStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'hi' || v === 'en' ? v : 'en'
  } catch {
    return 'en'
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { profile, user, refreshProfile } = useAuth()
  // Optimistic local state: snappy UI, persists across reloads even before profile loads.
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  // Sync from profile once it loads (server is authoritative for signed-in users).
  useEffect(() => {
    if (profile?.locale && profile.locale !== locale) {
      setLocaleState(profile.locale)
      try {
        localStorage.setItem(STORAGE_KEY, profile.locale)
      } catch {
        /* ignore */
      }
    }
  }, [profile?.locale]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reflect on <html lang> for accessibility / browser features.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback(
    async (next: Locale) => {
      setLocaleState(next)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      if (user) {
        const { error } = await supabase.from('profiles').update({ locale: next }).eq('id', user.id)
        if (error) throw error
        await refreshProfile()
      }
    },
    [user, refreshProfile],
  )

  const value = useMemo<LocaleState>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale, setLocale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>')
  return ctx
}

// Convenience hook for components that only need t().
export function useT() {
  return useLocale().t
}
