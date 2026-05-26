// monthsBefore = how many months before the wedding this task should be completed
// null = no date dependency (flexible timing)

export const DEFAULT_CATEGORIES = [
  {
    id: 'venue',
    label: 'Venue & Ceremony',
    icon: 'MapPin',
    color: 'rose',
    items: [
      {
        id: 'venue-vision',
        title: 'Define your ceremony vision',
        monthsBefore: 14,
        done: false,
        subQuestions: [
          'Indoor, outdoor, or a blend of both?',
          'Religious, civil, or a personal ceremony style?',
          "What's the overall vibe — intimate and romantic, or grand and celebratory?",
          'Any must-have elements like an arch, a view, or a meaningful location?',
        ],
      },
      {
        id: 'venue-research',
        title: 'Research and shortlist venues',
        monthsBefore: 13,
        done: false,
        subQuestions: [
          "What's your expected guest count — roughly?",
          'Are you open to destination venues, or staying local?',
          'Do you need a venue that includes catering, or prefer to bring your own?',
          "What's your venue budget as a rough % of the total?",
        ],
      },
      {
        id: 'venue-visit',
        title: 'Visit and compare your top venues',
        monthsBefore: 12,
        done: false,
        subQuestions: [
          "What are the must-ask questions at a venue viewing?",
          'Is the venue available on your preferred date?',
          "What's included in the hire fee — tables, AV, coordinator?",
          "What's the wet weather backup plan for outdoor spaces?",
        ],
      },
      {
        id: 'venue-book',
        title: 'Book and sign venue contract',
        monthsBefore: 11,
        done: false,
        subQuestions: [
          'Have you reviewed all contract terms and cancellation clauses?',
          "What's the deposit and payment schedule?",
          'Are there noise curfews or strict setup / breakdown windows?',
          'Is a dedicated venue coordinator included on the day?',
        ],
      },
      {
        id: 'ceremony-officiant',
        title: 'Book your ceremony officiant',
        monthsBefore: 10,
        done: false,
        subQuestions: [
          'Religious leader, civil celebrant, or a close friend/family member?',
          'Do you both want to write personal vows?',
          'How much creative input do you want in shaping the ceremony script?',
          'What legal paperwork needs to be filed, and when?',
        ],
      },
    ],
  },

  {
    id: 'cocktail',
    label: 'Cocktail Reception',
    icon: 'Wine',
    color: 'sage',
    items: [
      {
        id: 'cocktail-vision',
        title: 'Plan the cocktail hour concept',
        monthsBefore: 9,
        done: false,
        subQuestions: [
          'Same space as the ceremony, or moving guests to a new area?',
          'Relaxed garden mingling, or a more structured lounge setup?',
          'Passed canapes, grazing tables, or a mix?',
          'Signature cocktails, wine & beer, or a full open bar?',
        ],
      },
      {
        id: 'cocktail-entertainment',
        title: 'Book cocktail hour entertainment',
        monthsBefore: 7,
        done: false,
        subQuestions: [
          'Jazz trio, string duo, solo guitarist, or curated playlist?',
          'Any interactive elements — photobooth, live caricature artist, lawn games?',
          'How long will cocktail hour run before guests move into dinner?',
        ],
      },
      {
        id: 'cocktail-menu',
        title: 'Finalise cocktail menu and signature drinks',
        monthsBefore: 3,
        done: false,
        subQuestions: [
          'Do you want a signature cocktail with a personal name or story behind it?',
          'What dietary restrictions need to be reflected in the canapes?',
          'Non-alcoholic signature drink option for guests who prefer it?',
        ],
      },
    ],
  },

  {
    id: 'reception',
    label: 'Dinner & Reception',
    icon: 'UtensilsCrossed',
    color: 'rose',
    items: [
      {
        id: 'reception-format',
        title: 'Decide reception dinner format',
        monthsBefore: 10,
        done: false,
        subQuestions: [
          'Sit-down dinner, cocktail-style, or buffet?',
          'How many courses are you envisioning?',
          'Head table, sweetheart table, or mixed seating with family?',
          "What's the rough flow — speeches, first dance, dinner, dancing?",
        ],
      },
      {
        id: 'reception-cake',
        title: 'Choose and order the wedding cake',
        monthsBefore: 5,
        done: false,
        subQuestions: [
          'Traditional tiered cake, individual desserts, or a dessert bar?',
          'Which flavours are you drawn to?',
          'Should the cake match the floral or décor palette?',
          'Is the cake provided by your caterer, or a separate baker?',
        ],
      },
      {
        id: 'reception-runsheet',
        title: 'Build the reception run sheet',
        monthsBefore: 1,
        done: false,
        subQuestions: [
          "Who's speaking, in what order, and for how long?",
          'When do the first dance and parent dances happen?',
          'Any traditions — bouquet toss, cake cutting, shoe game?',
          "Who's your MC, and have they been briefed?",
        ],
      },
    ],
  },

  {
    id: 'photography',
    label: 'Photography',
    icon: 'Camera',
    color: 'sage',
    items: [
      {
        id: 'photo-style',
        title: 'Define your photography style',
        monthsBefore: 12,
        done: false,
        subQuestions: [
          'Documentary and candid, editorial, fine art, or a blend?',
          'Have you saved a collection of images to share as references?',
          'How important are formal portraits vs natural, in-between moments?',
          'Do you want golden hour portraits built into the day timeline?',
        ],
      },
      {
        id: 'photo-book',
        title: 'Book your photographer',
        monthsBefore: 11,
        done: false,
        subQuestions: [
          "Have you reviewed full wedding galleries, not just highlight reels?",
          "What's included — hours, final edited count, album, engagement shoot?",
          "Does their personality fit? You'll spend the entire day with them.",
          "What's their backup plan if they're unwell on the wedding day?",
        ],
      },
      {
        id: 'photo-engagement',
        title: 'Schedule your engagement shoot',
        monthsBefore: 8,
        done: false,
        subQuestions: [
          'Meaningful location, urban, studio, or natural outdoors?',
          'Will you use these images on save-the-dates or invitations?',
          'What outfits are you thinking for the shoot?',
        ],
      },
      {
        id: 'photo-shot-list',
        title: 'Create shot list and family photo plan',
        monthsBefore: 1,
        done: false,
        subQuestions: [
          'Which exact family groupings need formal portraits?',
          'Are there any specific moments your photographer must capture?',
          'How long have you allocated for family formals?',
          'First look, or keeping it traditional until the ceremony?',
        ],
      },
    ],
  },

  {
    id: 'videography',
    label: 'Videography',
    icon: 'Video',
    color: 'rose',
    items: [
      {
        id: 'video-decide',
        title: 'Decide on videography coverage',
        monthsBefore: 11,
        done: false,
        subQuestions: [
          'Full wedding film, highlights reel only, or ceremony only?',
          'Do you want a same-day edit played at the reception?',
          'Cinematic and film-like, or documentary style?',
          'Are drone or aerial shots something you want?',
        ],
      },
      {
        id: 'video-book',
        title: 'Book your videographer',
        monthsBefore: 10,
        done: false,
        subQuestions: [
          "Have you watched full wedding films — not just 60-second reels?",
          'Will they coordinate with your photographer for lighting and timing?',
          "What's the turnaround time for receiving your film?",
          'What music licensing is included in the final deliverable?',
        ],
      },
    ],
  },

  {
    id: 'florals',
    label: 'Florals & Décor',
    icon: 'Flower2',
    color: 'sage',
    items: [
      {
        id: 'florals-vision',
        title: 'Define your floral and décor vision',
        monthsBefore: 10,
        done: false,
        subQuestions: [
          'What colour palette are you working with — and does it match your attire?',
          'Wild and organic, structured and classic, or tropical and bold?',
          'Key floral moments: bridal bouquet, ceremony arch, table centrepieces?',
          'Any flowers you love, or any allergies to consider?',
        ],
      },
      {
        id: 'florals-book',
        title: 'Book your florist',
        monthsBefore: 9,
        done: false,
        subQuestions: [
          "Does the florist specialise in your aesthetic?",
          'Can they deliver within your floral budget?',
          "What's included — setup, breakdown, hire items like vessels and arches?",
          'Have you seen their work installed at a similar venue?',
        ],
      },
      {
        id: 'florals-finalise',
        title: 'Finalise floral details and quantities',
        monthsBefore: 2,
        done: false,
        subQuestions: [
          'How many boutonnieres, corsages, and bridesmaid bouquets?',
          'How many tables need centrepieces, and what style?',
          'Any ceremony arch, pew décor, or entrance floral pieces?',
          'Final check — do the flowers still align with the evolved colour palette?',
        ],
      },
    ],
  },

  {
    id: 'catering',
    label: 'Catering & Menu',
    icon: 'ChefHat',
    color: 'rose',
    items: [
      {
        id: 'catering-book',
        title: 'Book your caterer',
        monthsBefore: 9,
        done: false,
        subQuestions: [
          'Does your venue have preferred or exclusive caterers?',
          'Have you done a tasting — and did you both love it?',
          'Is service staff included, or is that a separate cost?',
          "What's their approach to dietary restrictions and allergen management?",
        ],
      },
      {
        id: 'catering-menu',
        title: 'Finalise the menu',
        monthsBefore: 2,
        done: false,
        subQuestions: [
          "Have you collected dietary requirements from your guest list?",
          'What are the vegetarian, vegan, and gluten-free options?',
          'Are you doing place cards that indicate meal choice?',
          'Late-night snack, cheese station, or after-party food?',
        ],
      },
    ],
  },

  {
    id: 'music',
    label: 'Music & Entertainment',
    icon: 'Music',
    color: 'sage',
    items: [
      {
        id: 'music-reception',
        title: 'Book DJ or band for the reception',
        monthsBefore: 10,
        done: false,
        subQuestions: [
          'DJ, live band, or a DJ with a live instrument hybrid?',
          'What genre and vibe are you going for at the reception?',
          'Have you seen them perform live at a wedding?',
          "What's their MC style — low-key announcer, or high-energy host?",
        ],
      },
      {
        id: 'music-ceremony',
        title: 'Plan ceremony music',
        monthsBefore: 5,
        done: false,
        subQuestions: [
          'What song will you walk down the aisle to?',
          'Live musicians, or recorded music played through speakers?',
          'Music during the signing of the register?',
          "What's the recessional song as you walk back out?",
        ],
      },
      {
        id: 'music-playlist',
        title: 'Create must-play and do-not-play lists',
        monthsBefore: 1,
        done: false,
        subQuestions: [
          "What's your first dance song?",
          'Parent dance songs — and who dances with whom?',
          'Any absolute do-not-play songs?',
          'Which three songs guarantee your crowd will be on the floor?',
        ],
      },
    ],
  },

  {
    id: 'beauty',
    label: 'Hair & Makeup',
    icon: 'Scissors',
    color: 'rose',
    items: [
      {
        id: 'beauty-book',
        title: 'Book hair & makeup artist',
        monthsBefore: 8,
        done: false,
        subQuestions: [
          'The same artist for both hair and makeup, or specialists for each?',
          'Natural and fresh, classic glam, or a more editorial look?',
          'How many people in your party need hair and makeup done?',
          'What time do you need to be fully ready by on the morning?',
        ],
      },
      {
        id: 'beauty-trial',
        title: 'Complete hair and makeup trial',
        monthsBefore: 3,
        done: false,
        subQuestions: [
          "Is the trial at the same location as the wedding morning, or the artist's studio?",
          'Will you wear your veil or headpiece during the trial?',
          "Have you brought inspo images that match what you're going for?",
          "What's the plan if you don't love the result — time to adjust?",
        ],
      },
      {
        id: 'beauty-confirm',
        title: 'Confirm final schedule and brief for wedding morning',
        monthsBefore: 0.5,
        done: false,
        subQuestions: [
          'Has the full schedule been shared with all bridesmaids and mothers?',
          'Is the start time realistic given when you need to leave?',
          'Any new skincare or treatments to avoid close to the wedding?',
          'Touch-up kit packed for the day — what does it need?',
        ],
      },
    ],
  },

  {
    id: 'attire',
    label: 'Attire (Dress, Suit, Accessories)',
    icon: 'Shirt',
    color: 'sage',
    items: [
      {
        id: 'dress-shop',
        title: 'Shop for the wedding dress',
        monthsBefore: 11,
        done: false,
        subQuestions: [
          'What silhouette are you drawn to — ball gown, A-line, fitted sheath, or jumpsuit?',
          'Fabric and texture — lace, silk, tulle, crepe, or beaded?',
          "What's your dress budget, including alterations?",
          'Keep your appointment group small — who are your two most decisive people?',
        ],
      },
      {
        id: 'dress-order',
        title: 'Order wedding dress',
        monthsBefore: 10,
        done: false,
        subQuestions: [
          "Most dresses take 4–6 months to arrive — have you confirmed the lead time?",
          'Have you budgeted separately for alterations (typically 10–20% of dress cost)?',
          'Second reception outfit, after-party look, or single dress all night?',
        ],
      },
      {
        id: 'dress-fittings',
        title: 'Complete dress fittings and alterations',
        monthsBefore: 1.5,
        done: false,
        subQuestions: [
          'Have you bought the shoes you plan to wear — fittings need them?',
          'Correct undergarments sourced and worn at each fitting?',
          "Who's responsible for keeping the dress before the wedding day?",
          "What's the plan for steaming or pressing on the morning?",
        ],
      },
      {
        id: 'suit-book',
        title: "Book the groom's suit or tuxedo",
        monthsBefore: 6,
        done: false,
        subQuestions: [
          'Bespoke, made-to-measure, or hire?',
          "Does the look coordinate with the bridal party's colour palette?",
          'All accessories sorted — tie, pocket square, cufflinks, shoes?',
          'Are groomsmen in matching suits or coordinating separates?',
        ],
      },
      {
        id: 'accessories',
        title: 'Source all accessories',
        monthsBefore: 3,
        done: false,
        subQuestions: [
          'Jewellery — something new, borrowed, or a family piece?',
          'Veil, headpiece, or no headpiece?',
          "Wedding shoes — have you started breaking them in?",
          "Groom's accessories — watch, cufflinks, boutonnière, belt?",
        ],
      },
    ],
  },

  {
    id: 'guests',
    label: 'Guest Management',
    icon: 'Users',
    color: 'rose',
    items: [
      {
        id: 'guests-list',
        title: 'Finalise the guest list',
        monthsBefore: 11,
        done: false,
        subQuestions: [
          'Have both families aligned on total numbers?',
          'Children — all welcome, immediate family only, or adults-only event?',
          "How are you handling plus-ones — all couples, or partners of 1 year+?",
          "Do you have a B-list ready in case initial RSVPs come back as declines?",
        ],
      },
      {
        id: 'guests-savethedate',
        title: 'Send save-the-dates',
        monthsBefore: 9,
        done: false,
        subQuestions: [
          'Printed cards, digital, or both?',
          "Do you have everyone's current postal address?",
          "Have you included your wedding website or accommodation suggestions?",
          'Using engagement photos? Have you had the shoot yet?',
        ],
      },
      {
        id: 'guests-invitations',
        title: 'Send formal invitations',
        monthsBefore: 3,
        done: false,
        subQuestions: [
          'Printed paper suite, digital, or a combination?',
          'Collecting RSVPs by mail, online form, or phone?',
          "What's the RSVP deadline? (Aim for 4–6 weeks before the wedding)",
          'Do invitations include accommodation, transport, or schedule info?',
        ],
      },
      {
        id: 'guests-rsvp',
        title: 'Chase and confirm all RSVPs',
        monthsBefore: 1.5,
        done: false,
        subQuestions: [
          "How many guests still haven't responded — who's chasing them?",
          'Do you have final dietary requirement counts ready for the caterer?',
          'Have you given confirmed numbers to the venue and caterer?',
          'Is the seating chart underway?',
        ],
      },
      {
        id: 'guests-seating',
        title: 'Finalise the seating chart',
        monthsBefore: 0.5,
        done: false,
        subQuestions: [
          'Any tricky family dynamics or relationships to navigate at tables?',
          'Kid-friendly tables, or keeping children with their parents?',
          'Accessible seating needed for anyone with mobility requirements?',
          "Who's printing or displaying the seating chart on the day?",
        ],
      },
    ],
  },

  {
    id: 'honeymoon',
    label: 'Honeymoon',
    icon: 'Plane',
    color: 'sage',
    items: [
      {
        id: 'honeymoon-vision',
        title: 'Agree on the honeymoon style',
        monthsBefore: 10,
        done: false,
        subQuestions: [
          'Beach and unwind, adventure and explore, city and culture, or a mix?',
          'How many days can you both take off work?',
          'Straight after the wedding, or a delayed honeymoon a few months later?',
          "What's your overall honeymoon budget?",
        ],
      },
      {
        id: 'honeymoon-book',
        title: 'Book flights and accommodation',
        monthsBefore: 8,
        done: false,
        subQuestions: [
          'Have you both checked passport expiry dates?',
          'Any visa requirements for your destination?',
          'Travel agent for a stress-free experience, or planning it yourselves?',
          'Have you looked at honeymoon registry options — cash gifts, experiences?',
        ],
      },
      {
        id: 'honeymoon-details',
        title: 'Sort honeymoon extras and final details',
        monthsBefore: 1,
        done: false,
        subQuestions: [
          'Travel insurance sorted — does it cover wedding-related cancellations?',
          'Any romantic extras pre-booked — private dinner, spa day, excursion?',
          'Bank notified of travel dates so cards are not blocked?',
          'Packing started — any new clothing needed for the destination climate?',
        ],
      },
    ],
  },

  {
    id: 'logistics',
    label: 'Logistics',
    icon: 'Clock',
    color: 'rose',
    items: [
      {
        id: 'logistics-accommodation',
        title: 'Organise accommodation for guests',
        monthsBefore: 9,
        done: false,
        subQuestions: [
          'Hotel room block near the venue — have you negotiated a group rate?',
          'Accommodation at multiple price points for different budgets?',
          'Who is communicating the options to guests with the invitations?',
          "Any guests needing accessibility-friendly rooms?",
        ],
      },
      {
        id: 'logistics-transport',
        title: 'Arrange wedding day transport',
        monthsBefore: 4,
        done: false,
        subQuestions: [
          'How are you getting from the prep location to the ceremony?',
          'Do you need guest shuttles between the ceremony and reception?',
          'Late-night transport option so guests can drink without driving?',
          'Bridal car style — classic, luxury modern, or something personal?',
        ],
      },
      {
        id: 'logistics-dayof',
        title: 'Build the full day-of timeline',
        monthsBefore: 0.5,
        done: false,
        subQuestions: [
          'Have all vendors confirmed their arrival and setup times?',
          "Who's the single point of contact for vendors on the day?",
          "Do you have a day-of coordinator, or are you relying on the venue?",
          "What's the decision-making protocol if something goes wrong?",
        ],
      },
      {
        id: 'logistics-rehearsal',
        title: 'Plan the ceremony rehearsal',
        monthsBefore: 0.25,
        done: false,
        subQuestions: [
          'Who attends — full bridal party, parents, officiant, readers?',
          "Where and when is the rehearsal dinner, and who's invited?",
          'Has the full ceremony order been shared with all participants?',
          "Has the rehearsal time been confirmed with the venue?",
        ],
      },
    ],
  },
]
