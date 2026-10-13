// Life events: moments that happen IN the world, not on cards.
// via: 'approach' (someone walks up to you), 'call' (your phone rings), 'home' (your kid/partner tells you when you get home),
//      'place:<interior>' (happens when you walk into that place), 'work' (at your workplace), 'thought' (you stop and think it over),
//      'object' (something on the ground you can pick up), 'pickup' (go and collect your kid from school)
// who(api, data) → { role, name, seed, tag } for approach / call / place speakers
// text(api, data) → a line or list of lines the speaker says (thoughts are in your own voice)
// choices(api, data) → [{ label, go(api, data) → reply line }]. Choices can schedule follow-ups: butterfly effects.

const pick = a => a[Math.floor(Math.random() * a.length)];
const roll = p => Math.random() < p;
const NAMES = ['Danny', 'Marcus', 'Leah', 'Tasha', 'Jules', 'Ricky', 'Priya', 'Omar', 'Bex', 'Kenji', 'Sofia', 'Dre', 'Mel', 'Callum', 'Yaz', 'Theo'];
const friend = (a, d) => ({ role: 'guest', seed: d.seed, name: d.name, tag: 'Old friend' });

export const EVENTS = [
  // ---------------------------------------------------------------- money & friends
  { id: 'loan', via: 'approach', who: friend, when: a => a.money() > 300 ? 3 : 0,
    init: a => ({ name: pick(NAMES), seed: Math.floor(Math.random() * 1e5), amt: Math.min(2000, Math.max(100, Math.round(a.money() * 0.15 / 50) * 50)) }),
    text: (a, d) => [`Yo! Is that you? It's ${d.name}, from school!`, `Listen... I'm in a bit of a hole. Rent's due and my landlord is not playing. Could you lend me ${a.fmt(d.amt)}? I'll pay you back, swear down.`],
    choices: (a, d) => [
      { label: `Lend ${a.fmt(d.amt)}`, go: () => { a.take(d.amt); a.karma(3); a.schedule(roll(0.55 + a.karmaV() * 0.004) ? 'loan_back' : 'loan_gone', 4 + Math.random() * 6, d); return 'You\'re a real one. I won\'t forget this.'; } },
      { label: 'Sorry, I can\'t', go: () => { if (roll(0.3)) a.schedule('loan_grudge', 6 + Math.random() * 8, d); return '...Yeah. Cool. Forget I asked.'; } },
    ] },
  { id: 'loan_back', via: 'approach', follow: true, who: friend,
    text: (a, d) => [`There you are! I've been looking for you.`, `Told you I'd pay you back. Here, ${a.fmt(d.amt * 2)}. Double, for trusting me when nobody else did.`],
    choices: (a, d) => [{ label: 'Take it', go: () => { a.give(d.amt * 2); a.mood(10); a.schedule('loyal_friend', 15 + Math.random() * 15, d); return 'We\'re good, yeah? Proper friends.'; } }] },
  { id: 'loan_gone', via: 'thought', follow: true,
    text: (a, d) => [`It's been over a week. ${d.name} still isn't answering...`, `And now their Instagram's full of a new watch and a holiday in Cabo. With MY money.`],
    choices: (a, d) => [
      { label: 'Track them down', go: () => { a.errand('v_anchor', 'track_debtor', d, `Find ${d.name}`); return `Word is ${d.name} drinks at the Anchor Bar. Time to pay them a visit.`; } },
      { label: 'Let it go', go: () => { a.mood(-6); a.karma(4); return 'Lesson learned. Some people never change.'; } },
    ] },
  { id: 'loan_grudge', via: 'thought', follow: true,
    text: (a, d) => [`People are saying ${d.name} has been talking about me. Calling me stuck-up.`, 'The dealers round here have heard it too.'],
    choices: (a, d) => [
      { label: 'Call them and smooth it over', go: () => { a.lvlUp('charm', 15); return 'One awkward phone call later, we\'re mostly fine.'; } },
      { label: 'Ignore it', go: () => { a.dealerRel(-6); return 'Whatever. Let them talk.'; } },
    ] },
  { id: 'loyal_friend', via: 'call', follow: true, who: (a, d) => ({ ...friend(a, d), tag: 'Calling' }),
    text: (a, d) => ['Yo! Guess who got a job down at the docks?', 'Remember when you lent me that money? If you ever need anything, and I mean anything, I got you. Cops, whatever. No questions.'],
    choices: (a, d) => [{ label: 'Good to know', go: () => { a.flag('docks_friend', d.name); return 'Love you, man. Stay safe out there.'; } }] },

  { id: 'wallet', via: 'object', w: 3, obj: 'wallet',
    init: () => ({ cash: 80 + Math.floor(Math.random() * 300), owner: pick(['Gloria Mendez', 'Arthur Bell', 'Nadia Okafor', 'Hank Pruitt']) }),
    text: (a, d) => [`Someone's wallet. ${a.fmt(d.cash)} in cash, and an ID: ${d.owner}. There's an address in Northfield.`, 'Nobody saw me pick it up...'],
    choices: (a, d) => [
      { label: 'Keep the cash', go: () => { a.give(d.cash); a.karma(-6); if (roll(0.25)) a.schedule('wallet_caught', 3 + Math.random() * 5, d); return 'Finders keepers.'; } },
      { label: 'Hand it in', go: () => { a.errand('northfield', 'wallet_return', d, `${d.owner}'s house`); return 'I\'ll drop it at their address in Northfield. It\'s the right thing to do.'; } },
    ] },
  { id: 'wallet_reward', via: 'call', follow: true, who: (a, d) => ({ role: 'sales', seed: 4242, name: d.owner, tag: 'Calling' }),
    text: (a, d) => ['Hi, is this the person who returned my wallet? Thank you, honestly.', 'I\'m a defence lawyer. If you EVER get into trouble, call me. Free of charge. You\'re a good person.'],
    choices: (a, d) => [{ label: 'Thank you!', go: () => { a.flag('lawyer_friend', d.owner); return 'I mean it. Any time. (Your next prison sentence will be halved.)'; } }] },
  { id: 'wallet_caught', via: 'approach', follow: true, who: () => ({ role: 'dealer', seed: 777, name: 'Big guy', tag: 'Angry stranger' }),
    text: (a, d) => ['Oi. You. My mum\'s doorbell camera got you nicking her wallet.', `${a.fmt(d.cash * 2)}. Now. Or we do this the other way.`],
    choices: (a, d) => [
      { label: `Pay ${a.fmt(d.cash * 2)}`, go: () => { a.take(d.cash * 2); return 'Smart. Don\'t let me see you round Northfield.'; } },
      { label: 'Fight him', go: () => { if (roll(0.35 + a.lvl('strength') * 0.06)) { a.lvlUp('strength', 20); return 'Ugh... alright, alright! Keep it!'; } a.hp(-35); return 'That\'s what I thought.'; } },
    ] },

  { id: 'mugger', via: 'approach', who: () => ({ role: 'dealer', seed: Math.floor(Math.random() * 1e5), name: 'Hooded man', tag: 'Mugger' }), when: a => (a.night() && a.money() > 100) ? 3 : 0,
    text: () => ['Don\'t make a sound.', 'Wallet. Now. I won\'t ask twice.'],
    choices: a => [
      { label: 'Hand it over', go: () => { const l = Math.round(a.money() * 0.2); a.take(l); a.mood(-8); return `${a.fmt(l)}? Pleasure doing business.`; } },
      { label: 'Fight', go: () => { if (roll(0.3 + a.lvl('strength') * 0.07)) { const g = 50 + Math.floor(Math.random() * 200); a.give(g); a.lvlUp('strength', 25); return `Argh! Alright! Take it, take MY wallet! (+${a.fmt(g)})`; } a.hp(-40); a.take(Math.round(a.money() * 0.2)); return 'Big mistake.'; } },
      { label: 'Run', go: () => { if (roll(0.4 + a.lvl('stamina') * 0.06)) return 'Hey! Get back here!'; a.hp(-15); a.take(Math.round(a.money() * 0.1)); return 'Not fast enough.'; } },
    ] },
  { id: 'scratch', via: 'place:mart', w: 3, who: () => ({ tag: 'Cashier' }),
    text: () => ['Hey! Scratch cards just came in. Jackpot\'s fifty grand this week.', 'Five bucks. Feeling lucky?'],
    choices: a => [
      { label: 'One please ($5)', go: () => { a.take(5); const r = Math.random(); if (r < 0.002) { a.give(50000); a.mood(50); return 'NO WAY. FIFTY THOUSAND! Oh my god!'; } if (r < 0.06) { a.give(500); a.mood(15); return 'Five hundred! Nice one!'; } if (r < 0.25) { a.give(10); return 'Ten bucks. Hey, it\'s something.'; } return 'Nothing. Sorry, friend.'; } },
      { label: 'No thanks', go: () => 'Suit yourself.' },
    ] },
  { id: 'crypto', via: 'approach', who: () => ({ role: 'sales', seed: 1337, name: 'Guy in a fleece vest', tag: 'Investor' }), when: a => a.money() > 600 ? 2 : 0,
    text: () => ['Bro. Bro. Have you heard of BayCoin?', 'Ground floor, bro. Put five hundred in today, Lambo by Friday. Trust me.'],
    choices: a => [
      { label: 'Invest $500', go: () => { a.take(500); a.schedule('crypto_result', 5 + Math.random() * 5, {}); return 'WAGMI, bro! To the moon!'; } },
      { label: 'Walk away', go: () => 'Have fun staying poor!' },
    ] },
  { id: 'crypto_result', via: 'thought', follow: true,
    text: () => ['BayCoin is all over the news. Let me check my wallet...'],
    choices: a => [{ label: 'Look', go: () => { const r = Math.random(); if (r < 0.2) { a.give(4000); a.mood(25); return 'It MOONED. My $500 is $4,000! Cashing out NOW.'; } if (r < 0.45) { a.give(650); return 'Up a little. Cashing out $650 before it crashes.'; } a.mood(-10); return 'Rug pull. The founder fled to Belize. $500, gone.'; } }] },

  // ---------------------------------------------------------------- work
  { id: 'shady_boss', via: 'work', when: a => a.career() ? 2 : 0, who: () => ({ tag: 'Your manager' }),
    text: a => ['Shut the door a sec.', `I need you to fudge a few numbers on the ${a.careerName()} reports. Nothing crazy. There's ${a.fmt(1500)} in it for you.`],
    choices: a => [
      { label: 'Do it', go: () => { a.give(1500); a.karma(-8); a.schedule('audit', 8 + Math.random() * 10, {}); return 'Good. This stays between us.'; } },
      { label: 'Refuse', go: () => { a.perf(-10); a.karma(5); a.schedule('whistle', 6 + Math.random() * 8, {}); return 'Fine. Forget I said anything. ...I won\'t forget THIS, though.'; } },
    ] },
  { id: 'audit', via: 'call', follow: true, who: () => ({ role: 'sales', seed: 99, name: 'Head Office', tag: 'Calling' }),
    text: () => ['This is head office. We\'re auditing last month\'s reports.', 'Your name is all over the numbers that don\'t add up. Care to explain?'],
    choices: a => [
      { label: 'Blame the manager', go: () => { if (roll(0.5 + a.lvl('charm') * 0.04)) { a.perf(15); return 'We suspected as much. Your manager is gone. Their desk is yours.'; } a.fire(); a.crime(2); return 'Nice try. You\'re fired, and we\'ve called the police.'; } },
      { label: 'Confess', go: () => { a.fire(); a.take(1500); a.karma(6); return 'Pay it back and clear your desk. We won\'t press charges.'; } },
    ] },
  { id: 'whistle', via: 'call', follow: true, who: () => ({ role: 'sales', seed: 99, name: 'Head Office', tag: 'Calling' }),
    text: () => ['Your old manager was caught cooking the books.', 'We heard you refused to take part. That kind of integrity is rare.'],
    choices: a => [{ label: 'Just doing my job', go: () => { a.promote(); a.mood(20); return 'And you\'re doing it as our newest promotion. Congratulations.'; } }] },
  { id: 'headhunter', via: 'call', when: a => (!a.career() && a.lvl('smarts') >= 3) ? 2 : 0, who: () => ({ role: 'sales', seed: 314, name: 'Jen from Recruit Bay', tag: 'Calling', fem: true }),
    text: () => ['Hi! Jen from Recruit Bay. Your name came up, people say you\'re sharp.', 'Bay Corp needs an Office Assistant. No degree needed. Interested?'],
    choices: a => [
      { label: 'I\'ll take it', go: () => { a.hire('office'); return 'Amazing! Clock in at Bay Corp Tower reception.'; } },
      { label: 'Not right now', go: () => 'No worries, I\'ll keep you on file.' },
    ] },

  // ---------------------------------------------------------------- family & love
  { id: 'kid_fight', via: 'home', speaker: 'kid', when: a => a.kidAge('Child', 'Teen') ? 3 : 0,
    init: a => ({ kid: a.kidAge('Child', 'Teen') }),
    text: (a, d) => ['Um... I need to tell you something before school calls.', 'I got in a fight today. I gave Tyler a black eye.'],
    choices: (a, d) => [
      { label: 'You\'re grounded', go: () => { a.rel(d.kid.id, -6); a.schedule('kid_grades', 8 + Math.random() * 8, d); return 'That\'s so unfair! ...Fine.'; } },
      { label: 'Talk it through', go: () => { a.rel(d.kid.id, 8); a.schedule('kid_grades', 8 + Math.random() * 8, d); return 'He\'s been bullying me for weeks. Thanks for listening.'; } },
      { label: 'High five', go: () => { a.rel(d.kid.id, 6); a.schedule('kid_trouble', 10 + Math.random() * 10, d); return 'Ha! You\'re the best!'; } },
    ] },
  { id: 'kid_grades', via: 'home', speaker: 'kid', follow: true,
    text: () => ['Look! Look at my report card!', 'Straight As! And the teacher wrote I\'ve really grown up.'],
    choices: (a, d) => [{ label: 'I\'m so proud of you', go: () => { a.rel(d.kid.id, 10); a.mood(15); return 'Can it go on the fridge?'; } }] },
  { id: 'kid_trouble', via: 'call', follow: true, who: () => ({ role: 'cop', seed: 55, name: 'Officer Diaz', tag: 'Calling' }),
    text: (a, d) => ['This is Officer Diaz, Bay City PD.', `We picked up ${d.kid.name} spraying graffiti on the Bay Bridge. There's a $400 fine.`],
    choices: (a, d) => [
      { label: 'I\'ll pay it', go: () => { a.take(400); a.errand('v_police', 'collect_kid', d, `Collect ${d.kid.name}`); return 'Paid. Come collect them from the station.'; } },
      { label: 'Let them face it', go: () => { a.rel(d.kid.id, -12); return 'Community service, then. Your kid won\'t like it.'; } },
    ] },
  { id: 'pickup', via: 'pickup', when: a => a.kidAge('Child') && a.dayTime() ? 3 : 0,
    init: a => ({ kid: a.kidAge('Child') }) },
  { id: 'ex_text', via: 'call', when: a => a.hasDated() ? 2 : 0, who: a => ({ role: 'guest', seed: 2020, name: 'Your ex', tag: 'Late-night call', fem: true }),
    text: a => ['Hey... it\'s me. Sorry it\'s so late.', `I can't stop thinking about you. Can we meet up?${a.partner() ? ' I know you\'re with someone. I don\'t care.' : ''}`],
    choices: a => [
      { label: 'Meet up', go: () => { a.errand('f_diner2', 'ex_meet', {}, 'Meet your ex'); return 'Eastport Grill. Tonight. Don\'t tell anyone.'; } },
      { label: 'It\'s over. Bye.', go: () => { a.karma(3); if (a.partner()) a.rel(a.partner().id, 3); return '...Okay. I get it.'; } },
    ] },
  { id: 'caught_cheating', via: 'home', speaker: 'partner', follow: true,
    text: () => ['Sit down.', 'I saw the messages. Don\'t even try to lie to me.'],
    choices: a => [
      { label: 'I\'m so sorry', go: () => { if (!a.partner()) return '...'; if (roll(a.relV(a.partner().id) / 140)) { a.rel(a.partner().id, -30); return 'I\'ll stay. For the kids. But I don\'t trust you.'; } a.breakup(); return 'I\'m done. I\'m leaving.'; } },
      { label: 'Deny everything', go: () => { if (!a.partner()) return '...'; a.rel(a.partner().id, -40); if (roll(0.5)) { a.breakup(); return 'You\'re a liar. We\'re finished.'; } return 'I don\'t believe you. Sleep on the couch.'; } },
    ] },
  { id: 'secret_kept', via: 'thought', follow: true,
    text: a => [`${a.partner()?.name || 'They'} picked up my phone earlier. My heart nearly stopped.`, 'They didn\'t see anything. I think.'],
    choices: a => [{ label: 'Delete everything', go: () => { a.mood(-4); return 'Never again. Probably.'; } }] },

  // ---------------------------------------------------------------- health & body
  { id: 'chest', via: 'thought', when: a => (a.fat() > 0.55 || a.drinker()) ? 3 : 0,
    text: () => ['Ow... sharp pain in my chest. And my left arm feels weird.', 'That can\'t be good.'],
    choices: a => [
      { label: 'See a doctor ($200)', go: () => { a.errand('v_hospital', 'doctor_check', {}, 'See a doctor'); return 'Bay General. I\'m getting this looked at.'; } },
      { label: 'Walk it off', go: () => { a.schedule('collapse', 2 + Math.random() * 4, {}); return 'It\'s passing. Probably nothing.'; } },
    ] },
  { id: 'collapse', via: 'thought', follow: true,
    text: () => ['The pain is back. Worse. Everything is spinning...'],
    choices: a => [{ label: '...', go: () => { a.hospital(); return 'Everything goes black.'; } }] },
  { id: 'gym_bro', via: 'approach', who: () => ({ role: 'trainer', seed: 909, name: 'Brody', tag: 'Fitness influencer' }), when: a => a.muscle() > 0.35 ? 2 : 0,
    text: () => ['Yo! Bro! I\'ve been watching you. You are HUGE.', 'I run Brody Fuel protein. Want to be our next model? $800 up front.'],
    choices: a => [
      { label: 'Sign me up', go: () => { a.give(800); a.mood(12); a.schedule('brand_deal', 10 + Math.random() * 10, {}); return 'Let\'s GO! Shoot\'s next week!'; } },
      { label: 'Nah', go: () => 'Your loss, king.' },
    ] },
  { id: 'brand_deal', via: 'thought', follow: true,
    text: () => ['Wait... is that MY face on that billboard downtown?', 'People are pointing at me.'],
    choices: a => [{ label: 'Flex', go: () => { a.give(1500); a.lvlUp('charm', 40); return 'Royalty cheque: $1,500. I could get used to this.'; } }] },

  // ---------------------------------------------------------------- street & crime
  { id: 'prison_mate', via: 'approach', who: () => ({ role: 'dealer', seed: 616, name: 'Vinnie', tag: 'From Bay County' }), when: a => a.wasInside() ? 3 : 0,
    text: () => ['Well well. Look who\'s out. Remember me? Cell block B.', 'I got a car that needs to disappear. Drive it to Lucky\'s chop shop: two grand, no questions.'],
    choices: a => [
      { label: 'I\'m in', go: () => { a.errand('random', 'hot_car_pickup', {}, 'Pick up the car'); return 'It\'s parked up. I\'ll send you the spot. Get it to Lucky\'s, he\'ll pay you.'; } },
      { label: 'I\'m done with that life', go: () => { a.karma(6); a.mood(4); return 'Respect. For real. Stay out, man.'; } },
    ] },
  { id: 'homeless_help', via: 'approach', who: () => ({ role: 'homeless', seed: 4040, name: 'Walt', tag: 'Homeless' }), w: 2,
    text: () => ['Excuse me, friend... sorry to bother you.', 'Got anything? Even five bucks for a coffee.'],
    choices: a => [
      { label: 'Here\'s $20', go: () => { a.take(20); a.karma(6); a.mood(4); if (roll(0.5)) a.schedule('homeless_tip', 3 + Math.random() * 5, {}); return 'God bless you. I\'m Walt. I won\'t forget this.'; } },
      { label: 'Buy him a meal', go: () => { a.take(15); a.karma(8); a.schedule('homeless_tip', 3 + Math.random() * 5, {}); return 'Tacos? You\'re an angel. Name\'s Walt.'; } },
      { label: 'Sorry, no', go: () => { a.karma(-2); return 'That\'s okay. Have a good one.'; } },
    ] },
  { id: 'homeless_tip', via: 'approach', follow: true, who: () => ({ role: 'homeless', seed: 4040, name: 'Walt', tag: 'Homeless' }),
    text: () => ['Hey! It\'s me, Walt! You helped me out.', 'I sleep under the pier. Yesterday I saw a guy stash a gym bag there. Never came back for it. Figured you should know.'],
    choices: a => [
      { label: 'Check it out', go: () => { a.errand('pier', 'pier_bag', {}, 'Under the pier'); return 'Under the pier, by the beach end. Go take a look before someone else does!'; } },
      { label: 'Not my business', go: () => 'Suit yourself!' },
    ] },
  { id: 'deal_gone_bad', via: 'call', when: a => a.lvl('dealing') >= 2 ? 2 : 0, who: () => ({ role: 'dealer', seed: 3131, name: 'Unknown number', tag: 'Calling' }),
    text: () => ['Yo, I heard you\'re the plug. I need a big order.', 'Cash on delivery. Round the back of the car wash, tonight.'],
    choices: a => [
      { label: 'I\'ll be there', go: () => { a.dealMeet(); return 'Round the back of the car wash. Tonight. Come alone, and bring the stuff.'; } },
      { label: 'Nah, don\'t know you', go: () => { a.lvlUp('dealing', 15); return '(Next day you hear the car wash got raided. Good call.)'; } },
    ] },
  { id: 'tax', via: 'call', when: a => a.money() > 40000 ? 3 : 0, who: () => ({ role: 'sales', seed: 1040, name: 'Bay Revenue', tag: 'Calling' }),
    text: a => ['This is Bay Revenue. We\'ve noticed some... unreported income.', `You owe ${a.fmt(Math.round(a.money() * 0.12))}.`],
    choices: a => [
      { label: 'I\'ll pay', go: () => { a.take(Math.round(a.money() * 0.12)); return 'Thank you for your cooperation.'; } },
      { label: 'Hide it offshore', go: () => { if (roll(0.55)) { a.karma(-6); return '(Your "accountant" makes it vanish.)'; } a.take(Math.round(a.money() * 0.25)); a.crime(2); return 'We found the offshore account. Double the bill. And the police are on their way.'; } },
    ] },
  { id: 'aunt', via: 'call', w: 0.6, who: () => ({ role: 'sales', seed: 1111, name: 'Mr. Whitfield', tag: 'Probate lawyer' }),
    init: () => ({ amt: 2000 + Math.floor(Math.random() * 12) * 1000 }),
    text: (a, d) => ['Good afternoon. I\'m calling about the estate of your great-aunt, Ruth.', `I'm sorry for your loss. She left you ${a.fmt(d.amt)}.`],
    choices: (a, d) => [
      { label: 'Accept it', go: () => { a.give(d.amt); return 'The funds will be in your account today.'; } },
      { label: 'Give it to charity', go: () => { a.karma(20); a.mood(15); return 'That\'s... remarkably generous. Ruth would have liked you.'; } },
    ] },
  { id: 'car_noise', via: 'thought', scene: 'car', when: a => a.inCar() ? 3 : 0,
    text: () => ['What is that noise? Some kind of grinding when I brake...'],
    choices: a => [
      { label: 'Get it checked ($250)', go: () => { a.errand('mods', 'brake_fix', {}, 'Bay Customs'); return 'Bay Customs can look at it. Head over.'; } },
      { label: 'Ignore it', go: () => { a.schedule('car_break', 2 + Math.random() * 3, {}); return 'It\'s fine. Cars make noises.'; } },
    ] },
  { id: 'car_break', via: 'thought', scene: 'car', follow: true,
    text: () => ['The brakes went! I couldn\'t stop!', 'The car is wrecked at the front. Should have got that noise checked.'],
    choices: a => [{ label: 'Ugh', go: () => { a.carDamage(60); return 'Fuel station or car wash can fix it.'; } }] },
  { id: 'viral', via: 'approach', when: a => a.has('danced') ? 2 : 0, who: () => ({ role: 'guest', seed: 2468, name: 'Excited fan', tag: 'Stranger', fem: true }),
    text: () => ['OH MY GOD. It\'s you! The dancer from the Neon Room video!', 'Two million views! Can I get a selfie?!'],
    choices: a => [
      { label: 'Lean into the fame', go: () => { a.lvlUp('charm', 50); a.give(600); a.flag('famous', 1); return 'Eeee! Thank you! (Sponsors start messaging you. $600 already.)'; } },
      { label: 'Please, no photos', go: () => { a.mood(-4); return 'Oh... okay. Sorry.'; } },
    ] },
  { id: 'neighbour', via: 'thought', when: a => a.atHome() && a.night() && a.neighbours() ? 4 : 0,
    text: () => ['It\'s 1am and next door\'s party is SHAKING the walls.'],
    choices: a => [
      { label: 'Go join in', go: () => { a.mood(12); a.drunk(0.6); if (roll(0.4)) { a.lvlUp('charm', 20); return 'Best night in ages. I know half the street now.'; } return 'Woke up on their sofa. No regrets.'; } },
      { label: 'Call the cops', go: () => { a.karma(-2); return 'Party\'s over. The neighbours will hate me.'; } },
      { label: 'Earplugs', go: () => { a.energy(-15); return 'Barely slept.'; } },
    ] },
  { id: 'life_doubt', via: 'thought', when: a => a.moodV() < 35 ? 3 : 0,
    text: () => ['What am I even doing with my life?', 'Every day is the same. I need a change.'],
    choices: a => [
      { label: 'Go back to school', go: () => { a.waypoint('v_college'); a.mood(6); return 'Bay City College. Maybe it\'s not too late.'; } },
      { label: 'Hit the gym', go: () => { a.waypoint('v_gym'); a.mood(4); return 'Healthy body, healthy mind.'; } },
      { label: 'Call someone', go: () => { a.mood(10); return 'Talking it out helps. I\'m not alone in this.'; } },
    ] },
];
// what happens when you actually get to the place an event sent you (errands). Return the line you think/say there.
export const ARRIVE = {
  pier_bag: a => { const g = 400 + Math.floor(Math.random() * 1600); a.give(g); a.mood(8); return `There it is, wedged behind a post: a gym bag with ${a.fmt(g)} inside. Walt was right.`; },
  wallet_return: (a, d) => { a.karma(8); a.mood(6); a.schedule('wallet_reward', 2 + Math.random() * 4, d); return `${d.owner} opens the door and nearly cries. "You brought it back? With the cash still in it?"`; },
  track_debtor: (a, d) => { if (roll(0.5 + a.lvl('strength') * 0.04)) { a.give(d.amt); a.mood(6); return `${d.name} is at the bar. One look at my face and they pay up in full.`; } a.hp(-25); a.mood(-8); return `${d.name}'s new "friends" jumped me in the car park. Great.`; },
  collect_kid: (a, d) => { a.rel(d.kid.id, 6); return `${d.kid.name} shuffles out of the station, staring at the floor. "...Thanks for coming."`; },
  ex_meet: a => { a.mood(8); if (a.partner()) a.schedule(roll(0.5) ? 'caught_cheating' : 'secret_kept', 3 + Math.random() * 5, {}); return 'We talk for hours. Old feelings. This is a bad idea.'; },
  doctor_check: a => { a.take(200); return 'Doctor says early warning signs. Less junk food, less booze, more cardio. Message received.'; },
  brake_fix: a => { a.take(250); return 'Worn brake pads. Fixed. Glad I didn\'t ignore that.'; },
  hot_car_pickup: a => { const hot = roll(0.4); a.hotCar(hot); a.errand('chop', 'hot_car_drop', { hot }, 'Lucky\'s Chop Shop', true); return hot ? 'Keys are in it... wait, is that a police scanner chirping? Just drive.' : 'Keys in the sun visor. Easy. Now get it to Lucky\'s.'; },
  hot_car_drop: a => { a.give(2000); a.karma(-5); a.dropHotCar(); return 'Lucky looks it over and peels off $2,000. "Vinnie\'s friend? Pleasure."'; },
};
export const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));
