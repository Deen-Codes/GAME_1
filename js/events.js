// Life events: BitLife-style moments that pop up as you live, shaped by who you are,
// with choices that ripple forward (butterfly effects) through scheduled follow-ups and flags.
// Each event: id, w (weight) or when(api) → weight, title, icon, text(api, data), choices(api, data) → [{ label, go(api, data) → result text }]
// api: see lifeApi() in main.js

const pick = a => a[Math.floor(Math.random() * a.length)];
const roll = p => Math.random() < p;
const NAMES = ['Danny', 'Marcus', 'Leah', 'Tasha', 'Jules', 'Ricky', 'Priya', 'Omar', 'Bex', 'Kenji', 'Sofia', 'Dre', 'Mel', 'Callum', 'Yaz', 'Theo'];

export const EVENTS = [
  // ---------------------------------------------------------------- money & friends
  { id: 'loan', icon: 'cash', title: 'An old friend', when: a => a.money() > 300 ? 3 : 0,
    text: (a, d) => `${d.name}, an old friend from school, calls out of nowhere. "Bro, I'm in a hole. Can you lend me ${a.fmt(d.amt)}? I'll pay you back, swear down."`,
    init: a => ({ name: pick(NAMES), amt: Math.min(2000, Math.max(100, Math.round(a.money() * 0.15 / 50) * 50)) }),
    choices: (a, d) => [
      { label: `Lend ${a.fmt(d.amt)}`, go: () => { a.take(d.amt); a.karma(3); a.schedule(roll(0.55 + a.karmaV() * 0.004) ? 'loan_back' : 'loan_gone', 4 + Math.random() * 6, d); return `${d.name} nearly cries. "You're a real one."`; } },
      { label: 'Sorry, I can\'t', go: () => { if (roll(0.3)) a.schedule('loan_grudge', 6 + Math.random() * 8, d); return `"Yeah... cool. Forget it." ${d.name} hangs up.`; } },
    ] },
  { id: 'loan_back', icon: 'cash', title: 'Paid back', follow: true,
    text: (a, d) => `${d.name} turns up with an envelope. "Told you I'd pay you back. Plus a little extra for trusting me." It's ${a.fmt(d.amt * 2)}.`,
    choices: (a, d) => [{ label: 'Take it', go: () => { a.give(d.amt * 2); a.mood(10); a.flag('friend_' + d.name, 'loyal'); a.schedule('loyal_friend', 15 + Math.random() * 15, d); return 'Faith in people: restored.'; } }] },
  { id: 'loan_gone', icon: 'x', title: 'Ghosted', follow: true,
    text: (a, d) => `It's been a week. ${d.name} isn't answering. Then you see their Instagram: a new watch and a holiday in Cabo.`,
    choices: (a, d) => [
      { label: 'Track them down', go: () => { if (roll(0.5 + a.lvl('strength') * 0.04)) { a.give(d.amt); a.mood(6); return `You find ${d.name} at the Anchor bar. One look at you and they pay up in full.`; } a.hp(-25); a.mood(-8); return `${d.name}'s new "friends" jump you in the car park. You limp home with nothing.`; } },
      { label: 'Let it go', go: () => { a.mood(-6); a.karma(4); return 'Lesson learned. Some people never change.'; } },
    ] },
  { id: 'loan_grudge', icon: 'x', title: 'Grudge', follow: true,
    text: (a, d) => `${d.name} has been telling everyone you think you're too good for them. Some of the local dealers have heard.`,
    choices: (a, d) => [
      { label: 'Call and smooth it over', go: () => { a.lvlUp('charm', 15); return `You talk it out with ${d.name}. Mostly fine.`; } },
      { label: 'Ignore it', go: () => { a.dealerRel(-6); return 'Dealers are a little colder with you now.'; } },
    ] },
  { id: 'loyal_friend', icon: 'heart', title: 'A real friend', follow: true,
    text: (a, d) => `${d.name} calls. "Remember when you lent me that money? I got a job at the docks now. If you ever need anything moved, no questions, I got you."`,
    choices: (a, d) => [{ label: 'Good to know', go: () => { a.flag('docks_friend', d.name); return `${d.name} will cover for you. Your next arrest might go easier.`; } }] },

  { id: 'wallet', icon: 'wallet', title: 'Found a wallet', w: 3,
    init: () => ({ cash: 80 + Math.floor(Math.random() * 300), owner: pick(['Gloria Mendez', 'Arthur Bell', 'Nadia Okafor', 'Hank Pruitt']) }),
    text: (a, d) => `You find a wallet on the pavement. ${a.fmt(d.cash)} in cash and an ID: ${d.owner}, with an address in Northfield.`,
    choices: (a, d) => [
      { label: 'Keep the cash', go: () => { a.give(d.cash); a.karma(-6); if (roll(0.25)) a.schedule('wallet_caught', 3 + Math.random() * 5, d); return 'Finders keepers.'; } },
      { label: 'Return it', go: () => { a.karma(8); a.mood(6); a.schedule('wallet_reward', 2 + Math.random() * 4, d); return `${d.owner} can't stop thanking you. They took your number.`; } },
    ] },
  { id: 'wallet_reward', icon: 'heart', title: 'Good karma', follow: true,
    text: (a, d) => `${d.owner} texts you. "I'm a defence lawyer. If you EVER get in trouble, call me. Free of charge. You're a good person."`,
    choices: (a, d) => [{ label: 'Thank you!', go: () => { a.flag('lawyer_friend', d.owner); return 'Your next prison sentence will be halved by a free lawyer.'; } }] },
  { id: 'wallet_caught', icon: 'x', title: 'Caught on camera', follow: true,
    text: (a, d) => `A doorbell camera caught you pocketing ${d.owner}'s cash. Their son found you. He's big, and he wants ${a.fmt(d.cash * 2)}.`,
    choices: (a, d) => [
      { label: `Pay ${a.fmt(d.cash * 2)}`, go: () => { a.take(d.cash * 2); return 'Expensive lesson.'; } },
      { label: 'Fight him', go: () => { if (roll(0.35 + a.lvl('strength') * 0.06)) { a.lvlUp('strength', 20); return 'You drop him with one punch. He won\'t be back.'; } a.hp(-35); return 'He wipes the floor with you.'; } },
    ] },

  { id: 'mugger', icon: 'fist', title: 'Mugged!', when: a => (a.night() && !a.driving() && a.money() > 100) ? 3 : 0,
    text: () => 'A guy steps out of an alley with a knife. "Wallet. Now."',
    choices: a => [
      { label: 'Hand it over', go: () => { const l = Math.round(a.money() * 0.2); a.take(l); a.mood(-8); return `He takes ${a.fmt(l)} and runs.`; } },
      { label: 'Fight', go: () => { if (roll(0.3 + a.lvl('strength') * 0.07)) { const g = 50 + Math.floor(Math.random() * 200); a.give(g); a.lvlUp('strength', 25); return `You disarm him and take HIS wallet. ${a.fmt(g)}.`; } a.hp(-40); a.take(Math.round(a.money() * 0.2)); return 'He cuts you and takes the money anyway.'; } },
      { label: 'Run', go: () => { if (roll(0.4 + a.lvl('stamina') * 0.06)) return 'You sprint off. He doesn\'t follow.'; a.hp(-15); a.take(Math.round(a.money() * 0.1)); return 'He catches you. Shoves you down, takes some cash.'; } },
    ] },
  { id: 'scratch', icon: 'star', title: 'Scratch card', w: 2,
    text: () => 'The QuickMart guy waves a scratch card at you. "Jackpot\'s $50,000 this week. Five bucks."',
    choices: a => [
      { label: 'Buy one ($5)', go: () => { a.take(5); const r = Math.random(); if (r < 0.002) { a.give(50000); a.mood(50); return 'JACKPOT! $50,000! You scream in the middle of the shop.'; } if (r < 0.06) { a.give(500); a.mood(15); return 'Winner! $500!'; } if (r < 0.25) { a.give(10); return 'Won $10. Small wins.'; } return 'Nothing. Of course.'; } },
      { label: 'No thanks', go: () => 'Probably smart.' },
    ] },
  { id: 'crypto', icon: 'chart', title: 'Hot tip', when: a => a.money() > 600 ? 2 : 0,
    text: () => 'A guy in a fleece vest corners you: "BayCoin, bro. Ground floor. Put in $500 today, Lambo by Friday."',
    choices: a => [
      { label: 'Invest $500', go: () => { a.take(500); a.schedule('crypto_result', 5 + Math.random() * 5, {}); return 'You are now a crypto investor. Allegedly.'; } },
      { label: 'Walk away', go: () => 'You leave him pitching to a pigeon.' },
    ] },
  { id: 'crypto_result', icon: 'chart', title: 'BayCoin', follow: true,
    text: () => 'BayCoin is all over the news.',
    choices: a => [{ label: 'Check your wallet', go: () => { const r = Math.random(); if (r < 0.2) { a.give(4000); a.mood(25); return 'It MOONED. Your $500 is now $4,000!'; } if (r < 0.45) { a.give(650); return 'Up a little. You cash out $650.'; } a.mood(-10); return 'It was a rug pull. The founder fled to Belize. $500 gone.'; } }] },

  // ---------------------------------------------------------------- work
  { id: 'shady_boss', icon: 'case', title: 'Off the books', when: a => a.career() ? 2 : 0,
    text: a => `Your manager pulls you aside. "Fudge a few numbers on the ${a.careerName()} reports this month. There's ${a.fmt(1500)} in it for you."`,
    choices: a => [
      { label: 'Do it', go: () => { a.give(1500); a.karma(-8); a.schedule('audit', 8 + Math.random() * 10, {}); return 'Easy money. For now.'; } },
      { label: 'Refuse', go: () => { a.perf(-10); a.karma(5); a.schedule('whistle', 6 + Math.random() * 8, {}); return 'Your manager goes cold on you.'; } },
    ] },
  { id: 'audit', icon: 'shield', title: 'The audit', follow: true,
    text: () => 'Investigators are going through the books. Your name is all over the bad numbers.',
    choices: a => [
      { label: 'Blame the manager', go: () => { if (roll(0.5 + a.lvl('charm') * 0.04)) { a.perf(15); return 'They believe you. The manager is marched out. You get their desk.'; } a.fire(); a.crime(2); return 'Nobody buys it. Fired, and the police want a word.'; } },
      { label: 'Confess', go: () => { a.fire(); a.take(1500); a.karma(6); return 'You pay it back and lose the job, but there\'s no charge.'; } },
    ] },
  { id: 'whistle', icon: 'star', title: 'Integrity pays', follow: true,
    text: () => 'Your old manager just got caught cooking the books. Head office heard you refused to take part.',
    choices: a => [{ label: 'Nice', go: () => { a.promote(); a.mood(20); return 'You\'ve been promoted. Doing the right thing paid off.'; } }] },
  { id: 'headhunter', icon: 'case', title: 'Headhunted', when: a => (!a.career() && a.lvl('smarts') >= 3) ? 2 : 0,
    text: () => 'A recruiter messages you. "Bay Corp is looking for sharp people. Interested in an Office Assistant job, no degree needed?"',
    choices: a => [
      { label: 'Take the job', go: () => { a.hire('office'); return 'You start at Bay Corp Tower. Clock in at reception.'; } },
      { label: 'Not now', go: () => 'Maybe another time.' },
    ] },

  // ---------------------------------------------------------------- family & love
  { id: 'kid_fight', icon: 'people', title: 'Call from school', when: a => a.kidAge('Child', 'Teen') ? 3 : 0,
    init: a => ({ kid: a.kidAge('Child', 'Teen') }),
    text: (a, d) => `The school calls. ${d.kid.name} got into a fight and gave another kid a black eye.`,
    choices: (a, d) => [
      { label: 'Ground them', go: () => { a.rel(d.kid.id, -6); a.flag('kid_disc_' + d.kid.id, 1); a.schedule('kid_grades', 8 + Math.random() * 8, d); return `${d.kid.name} sulks, but gets the message.`; } },
      { label: 'Talk it through', go: () => { a.rel(d.kid.id, 8); a.schedule('kid_grades', 8 + Math.random() * 8, d); return 'Turns out someone was bullying them. You handle it together.'; } },
      { label: 'High five them', go: () => { a.rel(d.kid.id, 6); a.flag('kid_wild_' + d.kid.id, 1); a.schedule('kid_trouble', 10 + Math.random() * 10, d); return '"That\'s my kid!" ...You may regret this.'; } },
    ] },
  { id: 'kid_grades', icon: 'book', title: 'Report card', follow: true,
    text: (a, d) => `${d.kid.name}'s report card came home. Straight As, and a note from the teacher saying how much they've grown.`,
    choices: (a, d) => [{ label: 'Proud parent', go: () => { a.rel(d.kid.id, 10); a.mood(15); return 'You stick it on the fridge.'; } }] },
  { id: 'kid_trouble', icon: 'shield', title: 'Police at the door', follow: true,
    text: (a, d) => `Two officers at your door. ${d.kid.name} was caught spraying graffiti on the Bay Bridge.`,
    choices: (a, d) => [
      { label: 'Pay the fine ($400)', go: () => { a.take(400); a.rel(d.kid.id, 4); return 'Paid. You have a long talk on the drive home.'; } },
      { label: 'Let them face it', go: () => { a.rel(d.kid.id, -12); a.flag('kid_record_' + d.kid.id, 1); return `${d.kid.name} gets community service and won't speak to you for a week.`; } },
    ] },
  { id: 'ex_text', icon: 'heart', title: 'New message', when: a => a.hasDated() ? 2 : 0,
    text: a => `Your ex texts at 2am: "I can't stop thinking about you. Can we meet?"${a.partner() ? ` ${a.partner().name} is asleep next to you.` : ''}`,
    choices: a => [
      { label: 'Meet up', go: () => { a.mood(8); if (a.partner()) { a.schedule(roll(0.5) ? 'caught_cheating' : 'secret_kept', 3 + Math.random() * 5, {}); return 'You sneak out. Nobody has to know... right?'; } return 'It\'s nice. Maybe there\'s something there.'; } },
      { label: 'Block them', go: () => { a.karma(3); if (a.partner()) a.rel(a.partner().id, 3); return 'Clean break.'; } },
    ] },
  { id: 'caught_cheating', icon: 'x', title: 'Busted', follow: true,
    text: a => `${a.partner()?.name || 'Your partner'} found the messages.`,
    choices: a => [
      { label: 'Beg forgiveness', go: () => { if (!a.partner()) return 'Too late.'; if (roll(a.relV(a.partner().id) / 140)) { a.rel(a.partner().id, -30); return 'They forgive you. Barely. Things are cold for a while.'; } a.breakup(); return 'They pack a bag and leave.'; } },
      { label: 'Deny everything', go: () => { if (!a.partner()) return 'Too late.'; a.rel(a.partner().id, -40); if (roll(0.5)) { a.breakup(); return 'They don\'t believe a word. It\'s over.'; } return 'They don\'t believe you, but they stay. For now.'; } },
    ] },
  { id: 'secret_kept', icon: 'heart', title: 'Close call', follow: true,
    text: a => `${a.partner()?.name || 'Your partner'} picked up your phone and nearly saw the messages. Nearly.`,
    choices: a => [{ label: 'Delete everything', go: () => { a.mood(-4); return 'Your heart is still pounding.'; } }] },

  // ---------------------------------------------------------------- health & body
  { id: 'chest', icon: 'cross', title: 'Chest pains', when: a => (a.fat() > 0.55 || a.drinker()) ? 3 : 0,
    text: () => 'Sharp pains in your chest, and your left arm feels funny.',
    choices: a => [
      { label: 'See a doctor ($200)', go: () => { a.take(200); a.flag('heart_warning', 1); return 'Early warning signs. The doctor says: cut the junk food, cut the booze, do some cardio.'; } },
      { label: 'Walk it off', go: () => { a.schedule('collapse', 2 + Math.random() * 4, {}); return 'It passes. Probably nothing.'; } },
    ] },
  { id: 'collapse', icon: 'cross', title: 'Collapsed', follow: true,
    text: () => 'It was not nothing. You collapse in the street.',
    choices: a => [{ label: 'Wake up in hospital', go: () => { a.hospital(); return 'A minor heart attack. You were lucky. The bill is steep.'; } }] },
  { id: 'gym_bro', icon: 'dumbbell', title: 'Spotted', when: a => a.muscle() > 0.35 ? 2 : 0,
    text: () => 'A guy at Muscle Beach is filming you lifting. "Yo, you\'re HUGE. I run a fitness brand. Want to model our protein?"',
    choices: a => [
      { label: 'Sign the deal', go: () => { a.give(800); a.mood(12); a.schedule('brand_deal', 10 + Math.random() * 10, {}); return 'Shoot\'s next week. $800 up front.'; } },
      { label: 'Nah', go: () => 'You keep lifting.' },
    ] },
  { id: 'brand_deal', icon: 'star', title: 'You\'re on a billboard', follow: true,
    text: () => 'Your face is on a protein billboard downtown. People are pointing at you.',
    choices: a => [{ label: 'Flex', go: () => { a.give(1500); a.lvlUp('charm', 40); return 'Royalties: $1,500. Charm up.'; } }] },

  // ---------------------------------------------------------------- street & crime
  { id: 'prison_mate', icon: 'lock', title: 'Old friend from inside', when: a => a.wasInside() ? 3 : 0,
    text: () => 'A guy you knew in Bay County slides up. "I got a car that needs to disappear. Drive it to Lucky\'s chop shop: $2,000, no questions."',
    choices: a => [
      { label: 'Do it', go: () => { if (roll(0.6)) { a.give(2000); a.karma(-5); return 'Smooth run. $2,000.'; } a.crime(3); return 'The car was already reported. Cops are on you!'; } },
      { label: 'I\'m done with that life', go: () => { a.karma(6); a.mood(4); return '"Respect," he says. And means it.'; } },
    ] },
  { id: 'homeless_help', icon: 'hand', title: 'Spare some change?', w: 2,
    text: () => 'An old man on a cardboard bed looks up. "Got anything, friend? Even five bucks."',
    choices: a => [
      { label: 'Give $20', go: () => { a.take(20); a.karma(6); a.mood(4); if (roll(0.5)) a.schedule('homeless_tip', 3 + Math.random() * 5, {}); return '"God bless you."'; } },
      { label: 'Buy him a meal', go: () => { a.take(15); a.karma(8); a.schedule('homeless_tip', 3 + Math.random() * 5, {}); return 'You sit and eat tacos together. His name is Walt.'; } },
      { label: 'Keep walking', go: () => { a.karma(-2); return 'You keep walking.'; } },
    ] },
  { id: 'homeless_tip', icon: 'star', title: 'Walt remembers', follow: true,
    text: () => 'Walt flags you down. "You were kind to me. I sleep behind the Anchor bar. Saw a guy stash a bag under the pier yesterday. Never came back for it."',
    choices: a => [
      { label: 'Check the pier', go: () => { const g = 400 + Math.floor(Math.random() * 1600); a.give(g); return `There's a gym bag with ${a.fmt(g)} in it. Thanks, Walt.`; } },
      { label: 'Leave it', go: () => 'Not your business.' },
    ] },
  { id: 'deal_gone_bad', icon: 'deal', title: 'Rip-off', when: a => a.lvl('dealing') >= 2 ? 2 : 0,
    text: () => 'A new customer wants a big order. Cash on delivery, round the back of the car wash. Something feels off.',
    choices: a => [
      { label: 'Go anyway', go: () => { if (roll(0.5)) { a.give(900); a.lvlUp('dealing', 40); return 'Legit. $900 and a new regular.'; } a.hp(-30); a.loseStash(); return 'It was a setup. They took everything you were carrying.'; } },
      { label: 'Trust your gut', go: () => { a.lvlUp('dealing', 15); return 'Next day you hear the car wash got raided. Good call.'; } },
    ] },
  { id: 'tax', icon: 'case', title: 'Tax man', when: a => a.money() > 40000 ? 3 : 0,
    text: a => `A letter from Revenue: unreported income. They want ${a.fmt(Math.round(a.money() * 0.12))}.`,
    choices: a => [
      { label: 'Pay up', go: () => { a.take(Math.round(a.money() * 0.12)); return 'Paid. Painful but clean.'; } },
      { label: 'Hide it offshore', go: () => { if (roll(0.55)) { a.karma(-6); return 'Your "accountant" makes it vanish.'; } a.take(Math.round(a.money() * 0.25)); a.crime(2); return 'They found it. Double the bill and the cops want a chat.'; } },
    ] },
  { id: 'aunt', icon: 'cash', title: 'Inheritance', w: 0.6,
    init: () => ({ amt: 2000 + Math.floor(Math.random() * 12) * 1000 }),
    text: (a, d) => `A lawyer calls. A great-aunt you never met has died and left you ${a.fmt(d.amt)}.`,
    choices: (a, d) => [
      { label: 'Accept it', go: () => { a.give(d.amt); return 'Rest in peace, Aunt Ruth.'; } },
      { label: 'Give it to charity', go: () => { a.karma(20); a.mood(15); return 'You donate the lot. You feel lighter.'; } },
    ] },
  { id: 'car_noise', icon: 'car', title: 'Car trouble', when: a => a.hasCar() ? 2 : 0,
    text: () => 'Your car is making a horrible grinding noise.',
    choices: a => [
      { label: 'Garage ($250)', go: () => { a.take(250); return 'Worn brake pads. Fixed.'; } },
      { label: 'Ignore it', go: () => { a.schedule('car_break', 2 + Math.random() * 3, {}); return 'It\'ll be fine.'; } },
    ] },
  { id: 'car_break', icon: 'car', title: 'Breakdown', follow: true,
    text: () => 'Your car\'s brakes failed and it rolled into a lamp post. It\'s badly damaged.',
    choices: a => [{ label: 'Ugh', go: () => { a.carDamage(60); return 'Get it fixed at a fuel station or the car wash.'; } }] },
  { id: 'viral', icon: 'star', title: 'Going viral', when: a => a.has('danced') ? 2 : 0,
    text: () => 'Someone filmed you on the Neon Room dance floor. 2 million views overnight.',
    choices: a => [
      { label: 'Lean into it', go: () => { a.lvlUp('charm', 50); a.give(600); a.flag('famous', 1); return 'Brand deals, followers, free drinks. $600 from sponsors.'; } },
      { label: 'Ask them to delete it', go: () => { a.mood(-4); return 'Too late, it\'s everywhere. But it fades.'; } },
    ] },
  { id: 'neighbour', icon: 'house', title: 'Next door', when: a => a.ownsHome() ? 2 : 0,
    text: () => 'Your neighbours are throwing a loud party. It\'s 1am.',
    choices: a => [
      { label: 'Join in', go: () => { a.mood(12); a.drunk(0.6); if (roll(0.4)) { a.lvlUp('charm', 20); return 'Best night in ages. You meet half the street.'; } return 'You wake up on their sofa.'; } },
      { label: 'Call the cops', go: () => { a.karma(-2); return 'The party ends. The neighbours glare at you for weeks.'; } },
      { label: 'Earplugs', go: () => { a.energy(-15); return 'You barely sleep.'; } },
    ] },
];
export const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));
