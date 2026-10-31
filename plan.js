// Season 1: Lulu's 60-day focus plan, Nov 2 to Dec 31, 2026. Day 1 is Monday, Nov 2.
// The New Season flow replaces this every 60 days.
window.SEASON = {
  id: 'season-1',
  start: '2026-11-02',
  end: '2026-12-31',
  reward: 'Frye boots',
  goals: [
    { id: 'yf', name: 'Yesterday Forgotten', due: '2026-11-12', detail: 'Pattern collection for P&B Textiles. 6 must-have patterns, 6 bonus.' },
    { id: 'web', name: 'Website', plants: '2026-11-16', detail: 'Brand, portfolio, third collection, Instagram and links.' },
    { id: 'model', name: 'Modeling', plants: '2026-12-07', detail: 'NEXT Miami, AMAX and Blair Models applications.' }
  ],
  weeks: [
    { n: 1, phase: 'Finish Yesterday Forgotten', goal: 'yf', theme: 'Turn inspiration into a clear plan',
      moves: ['Gather all your mood boards and choose the strongest ideas', 'Decide your six must-have patterns and six bonus ones', 'Give each pattern a working name and list what it needs', 'Set up files, folders and the P&B submission requirements', 'One short session listing what the website and applications will need'],
      domino: 'Choose your six must-have patterns and put them in the order you will make them.' },
    { n: 2, phase: 'Finish Yesterday Forgotten', goal: 'yf', theme: 'Create, finish and prepare to submit',
      moves: ['Work through the patterns in order, most important first', 'Review the collection as a whole so it feels connected', 'Check colors, file names, formats and submission details', 'Get feedback from a trusted creative friend if it helps', 'Protect a block for final fixes and submission prep'],
      domino: 'Open your first pattern file and finish one focused block before checking messages.' },
    { n: 3, phase: 'Build your creative home online', goal: 'web', theme: 'Define the brand',
      moves: ['Celebrate the submission and take a short reset', 'Choose the feeling, colors, fonts and visual style for your site', 'Gather your strongest finished work in one folder', 'Decide what your third collection is about and make a small mood board', 'Write a simple outline for your website pages'],
      domino: 'Write one sentence about your brand and how you want visitors to feel.' },
    { n: 4, phase: 'Build your creative home online', goal: 'web', theme: 'Build your portfolio',
      moves: ['Choose the strongest pieces from your collections', 'Sort them into a portfolio that shows your style and range', 'Plan the home, portfolio, collections and contact pages', 'Start building pages with your colors, fonts and images', 'Keep a list of missing pieces instead of fixing every detail'],
      domino: 'Put your five strongest portfolio pieces in one folder.' },
    { n: 5, phase: 'Build your creative home online', goal: 'web', theme: 'Make the website feel real',
      moves: ['Work on the third collection with a small, clear brief', 'Add portfolio and collection pages to the site', 'Write a short introduction about who you are', 'Set up your Instagram photo, bio, link and a few strong posts', 'Connect the website and Instagram, then test the links'],
      domino: 'Build one complete website page, top to bottom, even if it is not perfect.' },
    { n: 6, phase: 'Apply, polish and share', goal: 'model', theme: 'Prepare your modeling applications',
      moves: ['Review current requirements for NEXT Miami, AMAX and Blair', 'Make a checklist of photos, measurements and details each needs', 'See which photos you already have', 'Arrange any missing photos or ask for help taking them', 'Make a clean folder of application materials'],
      domino: 'Make one document with the three agencies and space for each one’s requirements.' },
    { n: 7, phase: 'Apply, polish and share', goal: 'model', theme: 'Submit your applications',
      moves: ['Finish any missing photos or details', 'Check each agency’s official instructions one last time', 'Submit the applications that are ready', 'Record submission dates and any follow-up steps', 'Return to the website and fix the biggest gaps'],
      domino: 'Finish the application with the clearest requirements, then use it to prepare the others.' },
    { n: 8, phase: 'Apply, polish and share', goal: 'web', theme: 'Polish and publish',
      moves: ['Finish the key pieces of your third collection', 'Check the website on your phone and computer', 'Make sure portfolio, Instagram and contact links work', 'Publish the website, or list the final steps', 'Share one creative update on Instagram'],
      domino: 'Visit your website like a stranger would and write down the three biggest fixes.' },
    { n: 9, phase: 'Apply, polish and share', goal: null, theme: 'Review, celebrate and choose what comes next',
      moves: ['Review your three goals and record what you finished', 'Make any small, high-value website fixes', 'Check your application records and note next steps', 'Back up your work and write ideas for next season', 'Celebrate before setting new goals'],
      domino: 'List what is finished, what is still open, and what matters most next.' }
  ],
  // Minutes per day at the 20-hour level. 0 = Sunday.
  template: {
    1: [['create', 150], ['class', 60], ['maintain', 60]],
    2: [['create', 150], ['class', 60], ['market', 60]],
    3: [['create', 150], ['class', 60], ['maintain', 60]],
    4: [['create', 150], ['class', 60], ['market', 60]],
    5: [['create', 120], ['class', 60], ['maintain', 60], ['market', 60]],
    6: [['create', 90]],
    0: [['checkin', 15]]
  },
  rescue: {
    1: [['create', 60], ['class', 60]],
    2: [['market', 60]],
    3: [['class', 60]],
    4: [['create', 60]],
    5: [['maintain', 60], ['class', 60]],
    6: [],
    0: [['checkin', 15]]
  },
  refuel: ['Take a 10-minute walk outside', 'Stretch your back, shoulders and hands', 'Drink a glass of water and eat something', 'Clear your desk for five minutes', 'Put on a favorite playlist and organize files', 'Sit somewhere quiet without your phone', 'Look at your finished work', 'Take a real break. You don’t have to earn it.'],
  backOnTrack: [
    { day: 'Day 1 · Reset', steps: ['Write down everything that feels unfinished (10 min)', 'Look at your week and choose a realistic amount', 'Work on one important task for 25 minutes', 'Write down the next step'] },
    { day: 'Day 2 · Restart', steps: ['Do one or two focused blocks', 'Do one small thing that keeps your work visible', 'Keep the rest of the list out of sight'] },
    { day: 'Day 3 · Rebuild', steps: ['Review what you finished in two days', 'Pick your top three outcomes for next week', 'Restore your blocks at a level you can manage'] }
  ],
  filter: ['Does this directly support one of my three goals?', 'Is it needed for the Nov 12 deadline?', 'Can I finish a useful version in the time I have?', 'Is this the right week for it?', 'Will it help more than what I’d have to delay?'],
  rewards: [
    { goal: 'yf', when: 'You submit Yesterday Forgotten', what: 'A favorite treat and a real night off.' },
    { goal: 'web', when: 'Your website is ready to share', what: 'Screenshot it and show someone who’ll love it.' },
    { goal: 'model', when: 'Your applications are in', what: 'Something fun. That was brave.' },
    { goal: 'season', when: 'The season is done', what: 'Frye boots.' }
  ]
};
