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
    choices: (a, d) => [
      { label: 'Take it', go: () => { a.give(d.amt * 2); a.mood(10); a.schedule('loyal_friend', 15 + Math.random() * 15, d); return 'We\'re good, yeah? Proper friends.'; } },
      { label: 'Just the loan back, keep the rest', go: () => { a.give(d.amt); a.karma(4); a.mood(8); a.schedule('loyal_friend', 8 + Math.random() * 8, { ...d, extra: true }); return 'You\'re too good, man. I owe you big. Bigger.'; } },
      { label: 'Keep it all. Look after your mum', go: () => { a.karma(9); a.mood(12); a.schedule('loyal_friend', 6 + Math.random() * 6, { ...d, extra: true, saint: true }); return '...Nobody\'s ever done that for me. I won\'t forget it.'; } },
    ] },
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
    choices: (a, d) => [
      { label: 'Good to know', go: () => { a.flag('docks_friend', d.name); return `Love you, man. If the cops are ever on you, I\'ll call in a fake tip and pull them off. Once.${d.saint ? ' Twice, for you.' : ''}`; } },
      { label: 'Get me some work down there', go: () => { a.schedule('docks_shift', 3 + Math.random() * 4, d); return 'Say less. I\'ll call you when there\'s a night shift going. Pays cash.'; } },
      { label: 'Owe me nothing. Stay out of trouble', go: () => { a.karma(5); a.mood(5); return 'Ha! Look who\'s talking. Alright. Love you, man.'; } },
    ] },
  { id: 'docks_shift', via: 'call', follow: true, who: (a, d) => ({ ...friend(a, d), tag: 'Night shift' }),
    text: (a, d) => ['Shift\'s on tonight. Container ship came in.', 'Normal pay is three hundred for lugging boxes. But... there\'s a crate nobody\'s meant to check. Fifteen hundred to drive it out the gate.'],
    choices: (a, d) => [
      { label: 'Honest shift ($300)', go: () => { a.give(300); a.energy(-30); a.lvlUp('strength', 40); return 'Good graft. Your back will hate you tomorrow. Same time next week?'; } },
      { label: 'Drive the crate out ($1,500)', go: () => { a.give(1500); a.karma(-6); if (roll(0.3)) { a.crime(2); return 'Go go go! Port police saw the truck. They\'re on you!'; } return 'Clean. Nobody saw nothing. Pleasure.'; } },
      { label: 'Not tonight', go: () => 'No stress. Plenty more ships.' },
    ] },

  { id: 'wallet', via: 'object', w: 3, obj: 'wallet',
    init: () => ({ cash: 80 + Math.floor(Math.random() * 300), owner: pick(['Gloria Mendez', 'Arthur Bell', 'Nadia Okafor', 'Hank Pruitt']) }),
    text: (a, d) => [`Someone's wallet. ${a.fmt(d.cash)} in cash, and an ID: ${d.owner}. There's an address in Northfield.`, 'Nobody saw me pick it up...'],
    choices: (a, d) => [
      { label: 'Keep the cash', go: () => { a.give(d.cash); a.karma(-6); if (roll(0.25)) a.schedule('wallet_caught', 3 + Math.random() * 5, d); return 'Finders keepers.'; } },
      { label: 'Hand it in', go: () => { a.errand('northfield', 'wallet_return', d, `${d.owner}'s house`); return 'I\'ll drop it at their address in Northfield. It\'s the right thing to do.'; } },
    ] },
  { id: 'wallet_reward', via: 'call', follow: true, who: (a, d) => ({ role: 'sales', seed: 4242, name: d.owner, tag: 'Calling' }),
    text: (a, d) => ['Hi, is this the person who returned my wallet? Thank you, honestly.', 'I\'m a defence lawyer. If you EVER get into trouble, call me. Free of charge. You\'re a good person.'],
    choices: (a, d) => [
      { label: 'Thank you!', go: () => { a.flag('lawyer_friend', d.owner); return 'I mean it. Any time. (Your next prison sentence will be halved.)'; } },
      { label: 'Was there a reward?', go: () => { a.give(150); a.karma(-2); return '...Oh. Sure. I\'ll send you a hundred and fifty. Take care.'; } },
      { label: 'Could you teach me some law?', go: () => { a.flag('lawyer_friend', d.owner); a.lvlUp('smarts', 60); return 'Ha! I like you. Coffee on Thursday, I\'ll bring my old textbooks. (Smarts up, and your next sentence will be halved.)'; } },
    ] },
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
    choices: a => [
      { label: 'Sell before I look', go: () => { a.give(520); return 'Sold blind. $520 back. Boring, but safe.'; } },
      { label: 'Hold. Diamond hands', go: () => { a.schedule('crypto_hold', 6 + Math.random() * 8, {}); return 'Not selling. Not even checking. It\'s going to the moon.'; } },
      { label: 'Look', go: () => { const r = Math.random(); if (r < 0.2) { a.give(4000); a.mood(25); return 'It MOONED. My $500 is $4,000! Cashing out NOW.'; } if (r < 0.45) { a.give(650); return 'Up a little. Cashing out $650 before it crashes.'; } a.mood(-10); return 'Rug pull. The founder fled to Belize. $500, gone.'; } },
    ] },
  { id: 'crypto_hold', via: 'thought', follow: true,
    text: () => ['BayCoin is trending again. Everyone is screaming about it.', 'Time to finally check what I held...'],
    choices: a => [{ label: 'Check', go: () => { const r = Math.random(); if (r < 0.15) { a.give(12000); a.mood(35); return 'TWELVE GRAND. I am never working again. (I am.)'; } if (r < 0.4) { a.give(1800); a.mood(12); return '$1,800. Holding paid off.'; } a.mood(-14); return 'Zero. It\'s worth zero. The founder is on a yacht.'; } }, { label: 'Hold even longer', go: () => { if (roll(0.5)) { a.give(25000); a.mood(40); return 'I held through EVERYTHING. $25,000. Legend.'; } a.mood(-18); return 'It went to zero while I was holding. Classic.'; } }] },
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
    choices: a => [
      { label: 'Just doing my job', go: () => { a.promote(); a.mood(20); return 'And you\'re doing it as our newest promotion. Congratulations.'; } },
      { label: 'I\'d rather have a bonus', go: () => { a.give(3000); a.mood(12); return 'A practical choice. $3,000 bonus, on its way.'; } },
      { label: 'I\'ll testify against him', go: () => { a.promote(); a.karma(10); a.schedule('old_boss', 10 + Math.random() * 10, {}); return 'Brave. We\'ll need you in court. And yes, the promotion is yours.'; } },
    ] },
  { id: 'old_boss', via: 'approach', follow: true, who: () => ({ role: 'sales', seed: 1999, name: 'Your old manager', tag: 'Out on bail' }),
    text: () => ['Well, well. The star witness.', 'You cost me everything. My job, my house, my wife. You know what I\'ve got left? Time.'],
    choices: a => [
      { label: 'You did this to yourself', go: () => { a.karma(3); if (roll(0.5)) { a.hp(-25); return '*He swings at you, then runs off before anyone sees.*'; } return '...Yeah. Maybe I did. *He walks off.*'; } },
      { label: 'Pay him to go away ($1,000)', go: () => { a.take(1000); return 'Smart. You\'ll never see me again.'; } },
      { label: 'Call the police', go: () => { a.karma(2); return 'Fine! Fine. I\'m going. *He breaks bail and skips town that night.*'; } },
    ] },
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
    choices: (a, d) => [
      { label: 'I\'m so proud of you', go: () => { a.rel(d.kid.id, 10); a.mood(15); return 'Can it go on the fridge?'; } },
      { label: 'Fifty bucks for every A', go: () => { a.take(250); a.rel(d.kid.id, 16); a.mood(10); return 'TWO HUNDRED AND FIFTY?! Best. Parent. EVER.'; } },
      { label: 'Ice cream to celebrate!', go: () => { a.take(20); a.rel(d.kid.id, 14); a.mood(18); return 'Yesss! Can I get sprinkles AND a flake?'; } },
      { label: 'Don\'t get big-headed', go: () => { a.rel(d.kid.id, -6); return '...Okay. *They go to their room.*'; } },
    ] },
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
      { label: 'I\'m so sorry', go: () => { if (!a.partner()) return '...'; if (roll(a.relV(a.partner().id) / 140)) { a.rel(a.partner().id, -30); return 'I\'ll stay. ' + (a.hasKids?.() ? 'For the kids. ' : 'For us. ') + 'But I don\'t trust you.'; } a.breakup(); return 'I\'m done. I\'m leaving.'; } },
      { label: 'Deny everything', go: () => { if (!a.partner()) return '...'; a.rel(a.partner().id, -40); if (roll(0.5)) { a.breakup(); return 'You\'re a liar. We\'re finished.'; } return 'I don\'t believe you. Sleep on the couch.'; } },
    ] },
  { id: 'secret_kept', via: 'thought', follow: true,
    text: a => [`${a.partner()?.name || 'She'} just texted: "Who's been messaging you so late?"`, 'My heart nearly stopped. She doesn\'t know. Not yet.'],
    choices: a => [{ label: 'Delete the chats', go: () => { a.mood(-4); return 'Gone. Never again. Probably.'; } }, { label: 'Come clean', go: () => { if (!a.partner()) return '...'; a.rel(a.partner().id, -25); if (roll(0.4)) { a.breakup(); return 'She\'s done. Bags packed by the time I got home.'; } return 'She cried. She\'s staying. For now.'; } }] },

  // ---------------------------------------------------------------- health & body
  { id: 'chest', via: 'thought', when: a => (a.fat() > 0.55 || a.drinker()) ? 3 : 0,
    text: () => ['Ow... sharp pain in my chest. And my left arm feels weird.', 'That can\'t be good.'],
    choices: a => [
      { label: 'See a doctor ($200)', go: () => { a.errand('v_hospital', 'doctor_check', {}, 'See a doctor'); return 'Bay General. I\'m getting this looked at.'; } },
      { label: 'Walk it off', go: () => { a.schedule('collapse', 2 + Math.random() * 4, {}); return 'It\'s passing. Probably nothing.'; } },
    ] },
  { id: 'collapse', via: 'thought', follow: true,
    text: () => ['The pain is back. Worse. Everything is spinning...'],
    choices: a => [
      { label: 'Call an ambulance', go: () => { a.hospital(); return 'You dial. Then everything goes black.'; } },
      { label: 'Tough it out', go: () => { if (roll(0.45 + a.lvl('stamina') * 0.04)) { a.hp(-40); a.energy(-40); a.mood(-8); return 'You sit on the kerb until it passes. Book a doctor. Seriously.'; } a.hospital(); a.mood(-10); return 'You try to stand. You don\'t make it.'; } },
      { label: 'Wave down a stranger', go: () => { if (roll(0.4 + Math.max(0, a.karmaV()) * 0.006)) { a.hp(-15); a.karma(2); return 'A nurse on her way home stops. Gets you water, sits you down. You\'re okay.'; } a.hospital(); return 'People walk past. Then the pavement comes up to meet you.'; } },
    ] },
  { id: 'gym_bro', via: 'approach', who: () => ({ role: 'trainer', seed: 909, name: 'Brody', tag: 'Fitness influencer' }), when: a => a.muscle() > 0.35 ? 2 : 0,
    text: () => ['Yo! Bro! I\'ve been watching you. You are HUGE.', 'I run Brody Fuel protein. Want to be our next model? $800 up front.'],
    choices: a => [
      { label: 'Sign me up', go: () => { a.give(800); a.mood(12); a.schedule('brand_deal', 10 + Math.random() * 10, {}); return 'Let\'s GO! Shoot\'s next week!'; } },
      { label: 'Nah', go: () => 'Your loss, king.' },
    ] },
  { id: 'brand_deal', via: 'thought', follow: true,
    text: () => ['Wait... is that MY face on that billboard downtown?', 'People are pointing at me.'],
    choices: a => [
      { label: 'Flex', go: () => { a.give(1500); a.lvlUp('charm', 40); return 'Royalty cheque: $1,500. I could get used to this.'; } },
      { label: 'Call Brody for more money', go: () => { if (roll(0.3 + a.lvl('charm') * 0.06)) { a.give(4500); a.lvlUp('charm', 60); return 'Brody caved. $4,500 and my own protein flavour. Bay Berry Blast.'; } a.give(300); return 'Brody laughed and cancelled the deal. Kill fee: $300. Should\'ve kept quiet.'; } },
      { label: 'Ask them to take it down', go: () => { a.mood(4); a.karma(2); return 'Too weird. They take it down. I keep my dignity.'; } },
    ] },

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
    choices: a => [
      { label: 'Leave it, fix it later', go: () => { a.carDamage(60); return 'Front\'s smashed. A fuel station or car wash can fix it.'; } },
      { label: 'Call a tow truck ($150)', go: () => { a.take(150); a.carDamage(20); return 'Towed, patched up roadside. Only a few dents.'; } },
      { label: 'Fix it myself', go: () => { if (roll(0.35 + a.lvl('strength') * 0.04)) { a.carDamage(25); a.lvlUp('driving', 30); return 'Bit of wire, bit of swearing. It\'ll hold.'; } a.carDamage(80); a.mood(-6); return 'I made it worse. Much worse.'; } },
    ] },
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
  // ---------------------------------------------------------------- new: neighbours, the city, chance and consequence
  { id: 'noisy_neighbour', via: 'home', speaker: 'partner', when: a => a.partner() && a.night() ? 2 : 0,
    text: () => ['Babe. It\'s the neighbours again.', 'Third night this week. Bass through the wall. I can\'t sleep.'],
    choices: a => [
      { label: 'Go knock on their door', go: () => { if (roll(0.55 + a.lvl('charm') * 0.05)) { a.mood(6); a.rel(a.partner().id, 6); return 'They turned it down. Even said sorry. My hero.'; } a.mood(-6); a.schedule('neighbour_feud', 8 + Math.random() * 10, {}); return 'He slammed the door in your face?! Unbelievable.'; } },
      { label: 'Bang on the wall', go: () => { a.rel(a.partner().id, 2); a.schedule('neighbour_feud', 6 + Math.random() * 8, {}); return 'Ha! That shut them up. ...For now.'; } },
      { label: 'Earplugs. Not worth it', go: () => { a.rel(a.partner().id, -4); return 'Fine. I\'ll just never sleep again.'; } },
    ] },
  { id: 'neighbour_feud', via: 'approach', follow: true, who: () => ({ role: 'guest', seed: 4411, name: 'Your neighbour', tag: 'Furious' }),
    text: () => ['Oi! You\'re the one banging on my wall at midnight.', 'Somebody keyed my car last night. Was that you?'],
    choices: a => [
      { label: 'Wasn\'t me. Let\'s squash this', go: () => { a.karma(3); a.mood(4); return '...Fine. Truce. I\'ll keep the music down after eleven.'; } },
      { label: 'Maybe it was', go: () => { a.karma(-4); if (roll(0.5)) { a.carDamage(30); return 'Then you won\'t mind THIS. *Your car gets a matching scratch that night.*'; } a.crime(1); return 'Right. I\'m calling the police.'; } },
      { label: 'Buy him a drink ($40)', go: () => { a.take(40); a.mood(8); a.karma(4); return 'Alright, alright. You\'re not so bad. Same again Friday?'; } },
    ] },
  { id: 'jury_duty', via: 'call', w: 1, when: a => a.wasInside() ? 0 : 1, who: () => ({ role: 'sales', seed: 1212, name: 'Bay County Court', tag: 'Calling' }),
    text: () => ['This is Bay County Court. You\'ve been selected for jury duty.', 'Report to the courthouse this week. Failure to attend is contempt of court.'],
    choices: a => [
      { label: 'Do your civic duty', go: () => { a.energy(-25); a.give(120); a.lvlUp('smarts', 50); a.karma(4); return 'Three days, one verdict, $120 juror pay. You learned a lot about the law.'; } },
      { label: 'Claim you\'re too busy', go: () => { if (roll(0.6)) return 'Excused. Lucky.'; a.take(500); return 'Not excused. $500 fine for contempt.'; } },
      { label: 'Ignore it', go: () => { a.schedule('jury_fine', 5 + Math.random() * 5, {}); return 'Bin. Nobody\'s checking. Right?'; } },
    ] },
  { id: 'jury_fine', via: 'call', follow: true, who: () => ({ role: 'cop', seed: 55, name: 'Officer Diaz', tag: 'Calling' }),
    text: () => ['Officer Diaz here. There\'s a bench warrant out for you.', 'You skipped jury duty. Pay the $800 fine today or I come find you.'],
    choices: a => [
      { label: 'Pay $800', go: () => { a.take(800); return 'Paid. Next time, just turn up.'; } },
      { label: 'Come find me then', go: () => { a.crime(2); return 'Have it your way.'; } },
    ] },
  { id: 'street_fight', via: 'approach', w: 1, when: a => a.night() ? 2 : 0, who: () => ({ role: 'dealer', seed: 8080, name: 'Drunk lad', tag: 'Looking for trouble' }),
    text: () => ['Oi. What you looking at?', 'You looking at my girl? Eh? You wanna go?'],
    choices: a => [
      { label: 'Talk him down', go: () => { if (roll(0.4 + a.lvl('charm') * 0.07)) { a.lvlUp('charm', 25); return '...Yeah. Sorry mate. Long night. *He hugs you. A bit too long.*'; } a.hp(-20); return 'Wrong answer. *He catches you with a lucky swing.*'; } },
      { label: 'Square up', go: () => { if (roll(0.35 + a.lvl('strength') * 0.07)) { a.lvlUp('strength', 35); a.mood(6); return '*One punch. He sits down on the kerb and rethinks his life.*'; } a.hp(-35); a.mood(-8); return '*He was a boxer. Of course he was.*'; } },
      { label: 'Walk away', go: () => { a.mood(-2); return 'Yeah, walk away! WALK AWAY! *He yells at a lamppost.*'; } },
    ] },
  { id: 'lost_dog', via: 'approach', w: 2, who: () => ({ role: 'guest', seed: 6262, name: 'Upset owner', tag: 'Lost her dog', fem: true }),
    text: () => ['Please, have you seen a little brown dog? His name is Biscuit.', 'He slipped his lead by the park. There\'s a reward, anything.'],
    choices: a => [
      { label: 'I\'ll help look', go: () => { a.energy(-10); if (roll(0.6)) { a.give(200); a.karma(6); a.mood(10); return 'BISCUIT! Oh my god. Thank you. Please, take this. ($200)'; } a.karma(3); return 'Nothing. But thank you for trying. I\'ll keep looking.'; } },
      { label: 'Sorry, haven\'t seen him', go: () => 'Okay... thanks anyway.' },
    ] },
  { id: 'lottery', via: 'place:mart', w: 2, who: () => ({ tag: 'Cashier' }),
    text: a => ['Rollover week! The Bay Lotto jackpot is huge.', 'Ticket\'s ten bucks. Feeling lucky?'],
    choices: a => [
      { label: 'One ticket ($10)', go: () => { a.take(10); const r = Math.random(); if (r < 0.004) { a.give(250000); a.mood(60); return 'Wait. WAIT. All six numbers. You just won $250,000!!'; } if (r < 0.06) { a.give(100); return 'Four numbers! $100.'; } return 'Nothing. Next week.'; } },
      { label: 'Ten tickets ($100)', go: () => { a.take(100); const r = Math.random(); if (r < 0.006) { a.give(250000); a.mood(60); return 'JACKPOT. $250,000. The cashier screams.'; } if (r < 0.4) { a.give(150); return 'A couple of small wins. $150 back.'; } return 'Not a sausage.'; } },
      { label: 'Nah, mug\'s game', go: () => 'Smart. The house always wins.' },
    ] },
  { id: 'festival', via: 'call', w: 1, when: a => a.hasDated() ? 2 : 1, who: a => a.partner() ? { role: 'guest', seed: 3131, name: a.partner().name, tag: 'Calling', fem: true } : { role: 'guest', seed: 3132, name: 'Bay Live', tag: 'Promo' },
    text: a => a.partner() ? ['Babe! Bay Live festival this weekend. EVERYONE is going.', 'Tickets are $180 each. Pleeeease?'] : ['Bay Live festival! Three stages, two days, one beach.', 'Early bird tickets $180. Selling fast!'],
    choices: a => [
      { label: a.partner() ? 'Get two tickets ($360)' : 'Buy a ticket ($180)', go: () => { a.take(a.partner() ? 360 : 180); a.mood(25); a.energy(-30); if (a.partner()) a.rel(a.partner().id, 15); a.lvlUp('charm', 30); return a.partner() ? 'BEST WEEKEND EVER. I love you.' : 'Lost my voice, found three new mates. Worth it.'; } },
      { label: 'Can\'t afford it', go: () => { if (a.partner()) a.rel(a.partner().id, -5); return a.partner() ? 'Ugh. Fine. I\'ll go with the girls then.' : 'Maybe next year.'; } },
    ] },
  { id: 'home_burglary', via: 'home', speaker: 'partner', when: a => a.partner() && a.ownsHome() ? 1 : 0,
    text: () => ['Someone broke in while we were out.', 'The TV\'s gone. The back window is smashed. I don\'t feel safe here.'],
    choices: a => [
      { label: 'Install an alarm ($600)', go: () => { a.take(600); a.rel(a.partner().id, 8); a.flag('alarm', 1); return 'Thank you. I\'ll sleep better knowing it\'s there.'; } },
      { label: 'Find out who did it', go: () => { a.errand('random', 'burglar_hunt', {}, 'Find the burglar'); return 'Word is somebody\'s selling a TV cheap on the corner. Go look.'; } },
      { label: 'Claim on insurance', go: () => { a.give(400); return 'Insurance paid out $400. Doesn\'t fix the fear though.'; } },
    ] },
  { id: 'old_teacher', via: 'approach', w: 1, who: () => ({ role: 'trainer', seed: 5151, name: 'Mr Okafor', tag: 'Your old teacher' }),
    text: a => ['Well I never. Is that you? From my maths class?', a.lvl('smarts') >= 4 ? 'I always knew you were bright. Look at you now.' : 'You never did hand in that homework, did you? Ha!'],
    choices: a => [
      { label: 'You were my favourite teacher', go: () => { a.mood(8); a.karma(2); return 'Oh, stop it. You\'ll make an old man cry. Come by the college sometime, I tutor in the evenings.'; } },
      { label: 'Tutor me?', go: () => { a.take(100); a.lvlUp('smarts', 120); return 'For you, a hundred a session. Let\'s start right now. (Smarts up a lot.)'; } },
      { label: 'Do I know you?', go: () => { a.mood(-2); return 'Ah. Never mind. Take care.'; } },
    ] },
  { id: 'debt_collector', via: 'approach', w: 1, when: a => a.money() < 200 ? 3 : 0, who: () => ({ role: 'dealer', seed: 9191, name: 'Collector', tag: 'Bay Credit Recovery' }),
    text: () => ['Afternoon. Bay Credit Recovery.', 'Your phone contract defaulted three months ago. $300, plus fees. Today.'],
    choices: a => [
      { label: 'Pay what I can', go: () => { const p = Math.min(a.money(), 300); a.take(p); return p >= 300 ? 'Account settled. Have a nice day.' : `Partial payment of ${a.fmt(p)}. We\'ll be in touch.`; } },
      { label: 'That\'s not my debt', go: () => { if (roll(0.4 + a.lvl('smarts') * 0.06)) return '...Hm. Wrong surname. My apologies.'; a.mood(-6); return 'It is. Ignoring it makes it worse.'; } },
      { label: 'Do one', go: () => { a.mood(-4); if (roll(0.5)) a.schedule('debt_collector_back', 10 + Math.random() * 10, {}); return 'We\'ll see you again. With interest.'; } },
    ] },
  { id: 'debt_collector_back', via: 'approach', follow: true, who: () => ({ role: 'dealer', seed: 9192, name: 'Bailiff', tag: 'Enforcement agent' }),
    text: () => ['Enforcement agent. The debt\'s now $900 with fees.', 'Pay, or I take something worth that much.'],
    choices: a => [
      { label: 'Pay $900', go: () => { a.take(900); return 'Done. You should\'ve paid the first time.'; } },
      { label: 'Take the car then', go: () => { a.carDamage(100); return 'Clamped and towed. Get it back from the pound when you\'ve got money.'; } },
    ] },
  { id: 'charity_run', via: 'approach', w: 1, when: a => a.lvl('stamina') >= 2 ? 2 : 1, who: () => ({ role: 'trainer', seed: 7373, name: 'Jess', tag: 'Charity runner', fem: true }),
    text: () => ['Hi! We\'re doing a 10k for the children\'s hospital on Sunday.', 'Would you run with us? Or sponsor someone?'],
    choices: a => [
      { label: 'I\'ll run it', go: () => { a.energy(-40); a.lvlUp('stamina', 80); a.karma(8); a.mood(14); return 'You crossed the line! Your sponsors raised $1,200 for the kids.'; } },
      { label: 'Sponsor ($50)', go: () => { a.take(50); a.karma(5); return 'Thank you! Every bit helps.'; } },
      { label: 'Not for me', go: () => 'No worries! Have a great day.' },
    ] },
  { id: 'found_phone', via: 'object', w: 2, obj: 'wallet',
    init: () => ({ owner: pick(['Kayla', 'Marcus', 'Imani', 'Theo']) }),
    text: (a, d) => [`Someone\'s phone. It\'s unlocked. A text pops up from "${d.owner}\'s Mum": where are you??`, 'It\'s a nice phone. Could get a few hundred for it.'],
    choices: (a, d) => [
      { label: 'Call "Mum" and return it', go: () => { a.karma(6); a.schedule('phone_thanks', 3 + Math.random() * 5, d); return 'She\'s so relieved. She\'s coming to meet you.'; } },
      { label: 'Sell it at a dealer', go: () => { a.give(220); a.karma(-6); return '$220. Wiped and gone.'; } },
      { label: 'Leave it where it is', go: () => 'Not my problem.' },
    ] },
  { id: 'phone_thanks', via: 'approach', follow: true, who: (a, d) => ({ role: 'guest', seed: 6565, name: `${d.owner}\'s mum`, tag: 'Grateful', fem: true }),
    text: (a, d) => ['Thank you SO much. That phone has every photo of my late husband on it.', 'I run the bakery on Main. You never pay for bread again. I mean it.'],
    choices: a => [
      { label: 'Honestly, no need', go: () => { a.karma(4); a.flag('bakery_friend', 1); a.mood(10); return 'Too late. You\'re family now.'; } },
      { label: 'Free bread? I\'ll take it', go: () => { a.flag('bakery_friend', 1); a.mood(8); return 'Ha! Come by any morning.'; } },
    ] },
  { id: 'pet_offer', via: 'approach', w: 1, when: a => a.ownsHome() ? 2 : 0, who: () => ({ role: 'guest', seed: 7474, name: 'Rescue volunteer', tag: 'Bay Animal Rescue', fem: true }),
    text: () => ['Hi! We\'re rehoming animals this weekend.', 'This one\'s been with us eight months. Nobody wants an old dog. Would you?'],
    choices: a => [
      { label: 'Adopt him', go: () => { a.take(80); a.mood(20); a.karma(8); a.flag('pet_dog', 1); return 'You\'ve made his whole year. He\'s called Rocket. He\'ll be waiting at home.'; } },
      { label: 'Donate instead ($40)', go: () => { a.take(40); a.karma(4); return 'That\'s kind. Thank you.'; } },
      { label: 'Not right now', go: () => 'I understand. He\'ll find someone.' },
    ] },
  { id: 'job_offer_rival', via: 'call', w: 1, when: a => a.career() ? 1 : 0, who: () => ({ role: 'sales', seed: 2323, name: 'Rival firm', tag: 'Headhunter' }),
    text: a => ['We\'ve been watching your work. Very impressive.', `We\'ll beat whatever you\'re paid at your ${a.careerName()} job. Come over to us.`],
    choices: a => [
      { label: 'Use it to get a raise', go: () => { if (roll(0.5 + a.lvl('charm') * 0.04)) { a.promote(); return 'Your boss panicked and promoted you on the spot.'; } a.perf(-8); return 'Your boss called your bluff. Awkward.'; } },
      { label: 'Take the bonus to switch ($2,000)', go: () => { a.give(2000); a.perf(-20); return 'Signing bonus paid. Your old team isn\'t thrilled.'; } },
      { label: 'I\'m loyal, thanks', go: () => { a.perf(10); a.karma(2); return 'Shame. Offer stands.'; } },
    ] },
  { id: 'rain_shelter', via: 'approach', w: 1, who: () => ({ role: 'guest', seed: 8686, name: 'Stranger', tag: 'Caught in the rain', fem: true }),
    text: () => ['Sorry, can I share your umbrella to the corner?', 'I\'m going to be soaked for my interview.'],
    choices: a => [
      { label: 'Walk her there', go: () => { a.karma(4); a.mood(6); if (roll(0.3)) { a.lvlUp('charm', 30); return 'She got the job! She texted you a thank you... with her number.'; } return 'Made it dry. She waves you off. Nice.'; } },
      { label: 'Sorry, in a rush', go: () => 'Oh... okay.' },
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
  gang_drop: (a, d) => { a.give(600 + Math.floor(Math.random() * 600)); a.gang(d.g, 15); a.karma(-4); return 'A guy in a parked car takes the package, nods, and hands over an envelope of cash. The crew will hear you came through.'; },
  burglar_hunt: a => { if (roll(0.55 + a.lvl('strength') * 0.04)) { a.give(500); a.lvlUp('strength', 30); return 'It\'s him. Your TV, on a market stall. One look and he hands it back with $500 "for the trouble".'; } a.hp(-25); return 'He had friends. You didn\'t. Lesson learned.'; },
  hot_car_drop: a => { a.give(2000); a.karma(-5); a.dropHotCar(); return 'Lucky looks it over and peels off $2,000. "Vinnie\'s friend? Pleasure."'; },
};
export const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));
