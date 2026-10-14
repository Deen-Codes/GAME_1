// Text conversations. Every incoming text carries a topic; your reply options come from that topic and from who they are to you
// (a date, your girlfriend, the partner you live with, your wife, your kid). Each reply gets an answer that follows from what
// you actually said, can lead somewhere (picking her up, date night, groceries on the way home, sending your kid money) and can
// open a follow-up question, so conversations run a few messages deep and always make sense.
//
// C (context) = { kind: 'date'|'gf'|'live'|'wife'|'teen'|'adultkid'|'ex', name, rel, temper (0..1), preg, kids, withMe, busy, hour, money, hasNum, livesWithYou }
// A reply option: { t: text, k: key }. textReply(C, k) -> { say, next (topic or null), d (relationship change), act (what happens) }

const pick = a => a[Math.floor(Math.random() * a.length)];
const O = (t, k) => ({ t, k });
const R = (say, next = null, d = 2, act = null) => ({ say, next, d, act });
const loving = C => C.kind === 'gf' || C.kind === 'live' || C.kind === 'wife';
const atHome = C => C.kind === 'live' || C.kind === 'wife';
const evening = C => C.hour >= 17 || C.hour < 2;

// ---------------------------------------------------------------- what they text you (picked by context)
export function incomingText(C) {
  const pool = [];
  const add = (topic, w, ...lines) => pool.push({ topic, w, lines });
  if (C.kind === 'teen') { add('kidmoney', 3, 'Can I borrow $50?', 'Dad can I have some money for the cinema?'); add('kidride', 2, 'Can you drive me to the beach later?', 'Can you pick me up from Jess\'s?'); add('kidgood', 2, 'I got an A on my test!', 'I made the team!!'); add('kidhome', 1, 'Mom says you have to come home for dinner.'); return pickTopic(pool); }
  if (C.kind === 'adultkid') { add('adultkid', 3, 'Got a job interview tomorrow, wish me luck.', 'Hey Dad, how are you doing?', 'Miss you, call me sometime.'); return pickTopic(pool); }
  if (atHome(C)) {
    add('wyd', 2, 'What are you up to?', 'Where are you?');
    add('miss', 2, 'Miss you.', 'Thinking about you.');
    if (evening(C)) { add('dinner', 3, 'Dinner\'s ready when you are.', 'Making your favourite tonight.'); add('comehome', 3, 'Coming home soon?', 'Wanna chill at home tonight?'); }
    add('groceries', 2, 'Can you grab groceries on the way back?', 'We\'re out of milk. Again.');
    add('love', 1, 'Love you.');
    if (C.preg) add('baby', 3, 'The baby\'s kicking like crazy.', 'Your baby wants pickles and ice cream. At the same time.');
    if (C.kids) add('kidupdate', 2, 'The kids drew you a picture. It\'s... abstract.', 'Bedtime story duty tonight is yours.');
    return pickTopic(pool);
  }
  if (C.kind === 'gf') { add('wyd', 2, 'What are you up to?', 'Wyd?'); add('miss', 2, 'Thinking about you.', 'Miss you.'); add('lastnight', 1, 'Last night was fun.'); add('hang', 3, 'Come see me later?', 'Free tonight?'); add('love', 1, 'Love you.'); return pickTopic(pool); }
  if (C.kind === 'ex') { add('ex', 1, 'Hey... it\'s been a while.'); return pickTopic(pool); }
  // a date you've been seeing
  add('stranger', C.rel < 35 ? 3 : 1, 'Hey stranger.', 'You still alive?');
  add('bored', 2, 'Bored. Entertain me.', 'So bored rn.');
  add('sawyou', 1, 'Saw you drive past earlier ;)');
  add('hang', 2, 'Free tonight?', 'We should hang out again.');
  add('wyd', 2, 'What are you up to?', 'Heyyy. Wyd?');
  return pickTopic(pool);
}
function pickTopic(pool) { let tot = pool.reduce((a, p) => a + p.w, 0), r = Math.random() * tot; for (const p of pool) { r -= p.w; if (r <= 0) return { topic: p.topic, t: pick(p.lines) }; } return { topic: pool[0].topic, t: pool[0].lines[0] }; }

// texts sent by other parts of the game (no topic attached): work out what they're about
export function classify(text) {
  const s = text.toLowerCase();
  if (/stood me up|not coming|guess you're not/.test(s)) return 'stoodup';
  if (/who is she|saw you two|saw your messages|girl's number|explain\. now|can't believe you/.test(s)) return 'cheat';
  if (/we need to talk|do you even live here/.test(s)) return 'talk';
  if (/baby|pregnant|kicking/.test(s)) return 'baby';
  if (/kids? (keep|were)|keeps asking/.test(s)) return 'comehome';
  if (/location|i'll be outside|pin's on your map|sending you my/.test(s)) return 'pickup';
  if (/groceries|out of milk/.test(s)) return 'groceries';
  if (/dinner/.test(s)) return 'dinner';
  if (/coming home|chill at home|come home/.test(s)) return 'comehome';
  if (/come see me|free tonight|hang out|come get me|pick me up/.test(s)) return 'hang';
  if (/up to|wyd|where are you/.test(s)) return 'wyd';
  if (/miss you|thinking about you/.test(s)) return 'miss';
  if (/love you/.test(s)) return 'love';
  if (/last night/.test(s)) return 'lastnight';
  if (/bored/.test(s)) return 'bored';
  if (/stranger|still alive/.test(s)) return 'stranger';
  if (/saw you drive/.test(s)) return 'sawyou';
  if (/borrow|money|\$/.test(s)) return 'kidmoney';
  return null;
}

// ---------------------------------------------------------------- your options
export function textOptions(C, topic) {
  if (C.withMe) return [O('Look up. I\'m right next to you 😂', 'nextto'), O('😘', 'kissemoji')];
  const T = {
    wyd: () => atHome(C) ? [O('Just driving around. You?', 'wyd_drive'), O('Heading home soon.', 'home_soon'), O('Thinking about you, obviously.', 'wyd_think'), O('Busy day. Talk later?', 'wyd_busy')]
      : [O('Not much. Want to hang out?', 'hang_ask'), O('Thinking about you, actually.', 'wyd_think'), O('Just working. You?', 'wyd_work'), O('Busy day, talk later?', 'wyd_busy')],
    miss: () => [O('Miss you too.', 'miss_too'), loving(C) ? O('Love you.', 'love_say') : O('Thinking about you too.', 'think_too'), atHome(C) ? O('I\'ll be home soon.', 'home_soon') : O('Come see me later?', 'hang_ask'), O('Haha.', 'meh')],
    love: () => [O('Love you more.', 'love_more'), O('Love you too ❤️', 'love_too'), O('Stop, I\'m blushing.', 'love_blush')],
    lastnight: () => [O('Best night in ages.', 'ln_best'), O('Round two tonight? 😏', 'ln_again'), O('It was alright.', 'ln_meh')],
    hang: () => atHome(C)
      ? [O('On my way home now.', 'home_now'), O('Date night? Let\'s go out.', 'datenight'), O('Movie night in. I\'ll bring snacks.', 'movienight'), O('Late one tonight, don\'t wait up.', 'late')]
      : C.busy ? [O('Can\'t right now, tomorrow?', 'hang_tmrw'), O('Busy tonight, sorry.', 'hang_no')]
        : [O('I\'ll come grab you. Where are you?', 'grab_now'), O('Tonight. I\'ll pick you up at 8.', 'grab_eight'), O('Can\'t today, tomorrow?', 'hang_tmrw'), O('Not tonight, sorry.', 'hang_no')],
    bored: () => [O('Want to hang out?', 'hang_ask'), O('Come out with me tonight.', 'grab_eight'), O('Watch something trashy. It\'s what I do.', 'bored_tv'), O('Same 😩', 'bored_same')],
    stranger: () => [O('Hey! Sorry, it\'s been mad busy.', 'str_sorry'), O('Missed you. Drinks this week?', 'hang_ask'), O('Who\'s this?', 'str_who')],
    sawyou: () => [O('You should\'ve waved!', 'saw_wave'), O('Like what you saw? 😉', 'saw_flirt'), O('Wasn\'t me 👀', 'saw_deny')],
    groceries: () => [O('Sure, what do we need?', 'groc_what'), O('On it. Passing QuickMart now.', 'groc_yes'), O('Can\'t, I\'m swamped. Order in?', 'groc_no'), O('Again? You eat like a horse 😂', 'groc_tease')],
    groc_list: () => [O('On it.', 'groc_yes'), O('Ice cream it is.', 'groc_yes_ice'), O('That\'s a lot. Can you go?', 'groc_no')],
    dinner: () => [O('Starving, on my way!', 'home_now'), O('Save me a plate?', 'dinner_plate'), O('What are we having?', 'dinner_what'), O('Already ate, sorry.', 'dinner_ate')],
    dinner_dish: () => [O('Amazing. Be there soon.', 'home_now'), O('You\'re the best.', 'love_too'), O('Can we have takeaway instead? 😬', 'dinner_takeaway')],
    comehome: () => [O('On my way.', 'home_now'), O('Give me an hour.', 'home_hour'), O('Working late, sorry.', 'late'), O('Miss you. Nearly done.', 'home_soon')],
    baby: () => [O('Can\'t wait to feel it. Coming home now.', 'home_now'), O('How are you feeling?', 'baby_how'), O('Need anything? I\'ll pick it up.', 'baby_need'), O('Rest up. Back soon ❤️', 'home_soon')],
    baby_need: () => [O('Pickles and ice cream. Got it.', 'groc_yes'), O('Anything for you two.', 'love_too')],
    kidupdate: () => [O('I\'ll hang it on the fridge.', 'kid_fridge'), O('Story time is my speciality.', 'kid_story'), O('Back before bedtime, promise.', 'home_hour')],
    stoodup: () => [O('I\'m so sorry, something came up.', 'su_sorry'), O('Let me make it up to you. Dinner on me.', 'su_makeup'), O('Relax, it\'s not that deep.', 'su_cold')],
    cheat: () => [O('I can explain.', 'ch_explain'), O('It\'s not what it looks like.', 'ch_deny'), O('I\'m sorry. It was a mistake.', 'ch_sorry'), O('Whatever.', 'ch_cold')],
    cheat_explain: () => [O('It was a mistake. I\'m sorry.', 'ch_sorry'), O('Nothing happened, I swear.', 'ch_deny'), O('We were just talking.', 'ch_deny')],
    talk: () => [O('Okay... what\'s up?', 'talk_what'), O('Can it wait till I\'m home?', 'talk_wait'), O('Not now.', 'talk_no')],
    talk_why: () => [O('You\'re right. I\'ll do better. Home tonight.', 'talk_better'), O('I\'m doing all this for us.', 'talk_forus'), O('You\'re overreacting.', 'talk_cold')],
    pickup: () => [O('Pulling up in 5.', 'pu_five'), O('Running late, sorry! 10 more mins.', 'pu_late'), O('Actually, I can\'t make it.', 'pu_bail')],
    chat: () => [O('Sounds like you need a treat.', 'chat_treat'), O('Haha classic.', 'chat_lol'), O('Tell me more.', 'chat_more')],
    kidmoney: () => [O('Sure, sending $50.', 'km_send'), O('What\'s it for?', 'km_what'), O('No. Earn it.', 'km_no')],
    kidmoney_why: () => [O('Fine. Sending it.', 'km_send'), O('Do your homework first.', 'km_home'), O('Nope.', 'km_no')],
    kidride: () => [O('Sure, I\'ll come get you.', 'kr_yes'), O('Ask your mum.', 'kr_mum'), O('Get the bus, kid.', 'kr_no')],
    kidgood: () => [O('So proud of you!', 'kg_proud'), O('That\'s my kid! Pizza tonight.', 'kg_pizza'), O('Nice.', 'kg_meh')],
    kidhome: () => [O('On my way.', 'home_now'), O('Tell her an hour.', 'home_hour'), O('Can\'t tonight.', 'late')],
    adultkid: () => [O('Good luck! You\'ve got this.', 'ak_luck'), O('Miss you too. Dinner soon?', 'ak_dinner'), O('Call you later.', 'ak_later')],
    ex: () => [O('Hey. Yeah, it has.', 'ex_hey'), O('Why are you texting me?', 'ex_why'), O('It\'s over. Bye.', 'ex_bye')],
  };
  if (T[topic]) return T[topic]();
  // nothing pending: you start the conversation
  if (C.kind === 'teen' || C.kind === 'adultkid') return [O('How was school?', 'k_school'), O('Love you, kiddo.', 'k_love'), O('Need anything?', 'k_need'), O('Be home by 10.', 'k_curfew')];
  if (atHome(C)) return [O('Love you.', 'love_say'), O('What\'s for dinner?', 'ask_dinner'), O('How\'s your day going?', 'ask_day'), O('Need anything from the shop?', 'ask_shop'), O('Date night tonight?', 'datenight'), O('Heading home soon.', 'home_soon')];
  if (C.kind === 'gf') return [O('Hey you.', 'hey'), O('Thinking about you.', 'think_too'), O('Want to hang out?', 'hang_ask'), O('How\'s your day?', 'ask_day'), O('Love you.', 'love_say')];
  if (C.kind === 'ex') return [O('Hey. You good?', 'ex_hey')];
  return [O('Hey you.', 'hey'), O('Want to hang out?', 'hang_ask'), O('You looked amazing the other day.', 'comp'), O('How\'s your day?', 'ask_day')];
}

// ---------------------------------------------------------------- their answer to what you said
export function textReply(C, k) {
  const hot = C.temper > 0.62, cold = C.rel < 15 && !['hey', 'str_sorry'].includes(k);
  if (cold && !C.kind.includes('kid') && C.kind !== 'teen') return R(pick(['k.', '...', 'Who is this again?']), null, 0);
  switch (k) {
    // with you right now
    case 'nextto': return R(pick(['Haha. I know, I just like texting you.', 'Oops 😂']), null, 1);
    case 'kissemoji': return R('😘', null, 1);
    // what are you up to
    case 'wyd_drive': return R(pick(['On the sofa watching trash TV. Come home?', 'Just got out the bath. Coming home soon?']), 'comehome', 2);
    case 'wyd_think': return R(pick(['Aww. Stop. ...Don\'t stop.', 'Smooth. Very smooth.']), loving(C) ? null : 'hang', 3);
    case 'wyd_work': return R(pick(['Boring! Come and rescue me later?', 'Same. Free tonight though?']), 'hang', 1);
    case 'wyd_busy': return hot ? R(pick(['You\'re always busy.', 'Fine.']), null, -2) : R(pick(['Okay! Don\'t work too hard x', 'Go get em.']), null, 1);
    // missing / love
    case 'miss_too': return R(pick(['Then come see me 😘', 'Prove it 😏']), atHome(C) ? 'comehome' : 'hang', 3);
    case 'think_too': return R(pick(['Good 😊', 'Stop, you\'re making me blush.']), null, 3);
    case 'love_say': return loving(C) || C.rel > 60 ? R(pick(['Love you too.', 'Love you more.', 'Aww. Love you too babe.']), null, 4) : R(pick(['Woah... that\'s a big word.', 'Haha. Slow down, you.']), null, -1);
    case 'love_more': return R(pick(['Not possible.', 'Fight me.']), null, 3);
    case 'love_too': return R(pick(['❤️', 'You\'re sweet.', 'I know 😌']), null, 3);
    case 'love_blush': return R('Good. Stay blushing.', null, 2);
    case 'meh': return R(hot ? 'Haha? That\'s it?' : 'lol', null, hot ? -2 : 0);
    // last night
    case 'ln_best': return R(pick(['Same. Can\'t stop smiling.', 'We should do it again.']), loving(C) ? null : 'hang', 3);
    case 'ln_again': return R(pick(['Behave 😏 ...Maybe.', 'You wish. ...Okay, maybe.']), atHome(C) ? 'comehome' : 'hang', 3);
    case 'ln_meh': return R(pick(['Wow. Okay.', 'Alright?? Thanks a lot.']), null, -5);
    // hanging out (not living together)
    case 'hang_ask': return C.busy ? R('Aren\'t you out with someone right now?', null, -3) : Math.random() < 0.75 ? R(pick(['Yes! Come get me?', 'Yesss. Pick me up?', 'Go on then. Come get me.']), 'hang', 2) : R(pick(['Can\'t today, I\'m with my sister. Tomorrow?', 'Ugh, I\'m working. Another day?']), null, 1);
    case 'grab_now': return R(pick(['Yay! Sending you my location now.', 'Okay! I\'ll be outside. Location sent.', 'Hurry up! Pin\'s on your map.']), 'pickup', 4, 'meetNow');
    case 'grab_eight': return C.hour >= 19.5 || C.hour < 3 ? R(pick(['It\'s nearly 8 now! Come get me. Location sent.', 'Now works. I\'ll be outside.']), 'pickup', 4, 'meetNow') : R(pick(['8pm. Don\'t be late. I\'ll send my location then.', 'It\'s a date. 8 sharp.']), null, 4, 'meetEight');
    case 'hang_tmrw': return hot ? R(pick(['You always say tomorrow.', 'Sure. Whatever.']), null, -2) : R('Okay, tomorrow then 😘', null, 1);
    case 'hang_no': return hot ? R('Fine. Your loss.', null, -3) : R('No worries. Another time.', null, 0);
    case 'bored_tv': return R(pick(['Way ahead of you. Bay Housewives is on.', 'Lol okay grandpa.']), null, 1);
    case 'bored_same': return R('Entertain each other then? 👀', 'hang', 1);
    case 'str_sorry': return R(pick(['Mhm. Likely story.', 'You better be.']), 'hang', 2);
    case 'str_who': return R(pick(['Wow. Lose my number then.', 'Seriously?? Bye.']), null, -8);
    case 'saw_wave': return R('I did! You didn\'t see me 😩', null, 2);
    case 'saw_flirt': return R(pick(['Maybe 😏', 'Don\'t flatter yourself. ...Yes.']), 'hang', 3);
    case 'saw_deny': return R('Hmm. Your car is pretty hard to miss.', null, 0);
    case 'comp': return R(pick(['Haha, thank you!', 'Stop it. ...Don\'t stop.']), null, 3);
    case 'hey': return R(pick(['Heyyy. What you up to?', 'Hey you 😊', 'Hey stranger.']), C.kind === 'date' ? 'wyd' : null, 1);
    case 'ask_day': return R(pick(['Long. My boss is a nightmare.', 'Honestly? Pretty good. Better now.', 'I spilled coffee on my white top. Iconic.']), 'chat', 2);
    case 'chat_treat': return R(pick(['Yes. Bring wine. Or bring yourself.', 'Treat me then 😌']), atHome(C) ? 'comehome' : 'hang', 3);
    case 'chat_lol': return R('Glad my pain amuses you.', null, 1);
    case 'chat_more': return R(pick(['So THEN she says... never mind, I\'ll tell you later.', 'Too much to text. Later x']), null, 2);
    // living together
    case 'home_now': return R(pick(['Yay. Drive safe.', 'Hurry, it\'s getting cold!', 'See you soon x']), null, 3, 'promiseHome');
    case 'home_soon': return R(pick(['Don\'t be too long x', 'I\'ll keep the sofa warm.']), null, 2, 'promiseHome');
    case 'home_hour': return R(hot ? 'An hour. I\'m counting.' : 'Okay, see you in a bit.', null, 1, 'promiseHour');
    case 'late': return hot ? R(pick(['Again?', 'Of course you are.']), null, -3) : R('Okay. Don\'t wait up then... I will though.', null, 0);
    case 'datenight': return R(pick(['Ooh yes. Getting ready! Pick me up outside.', 'Finally! Give me 20 mins. Honk when you\'re outside.']), null, 5, 'meetHome');
    case 'movienight': return R(pick(['Yes!! Get the big popcorn.', 'Perfect. I\'ll pick the film. You\'ll hate it.']), null, 4, 'promiseHome');
    case 'ask_dinner': return R(pick(['Lasagne. Be home by 8.', 'Tacos! Don\'t be late.', 'Your favourite. Don\'t ask questions.']), 'dinner_dish', 1);
    case 'ask_shop': return R(pick(['Milk, bread, and something sweet 😏', 'Toilet roll. Urgently.']), 'groc_list', 3);
    case 'groc_what': return R(pick(['Milk, eggs, bread. And chocolate.', 'Just the basics. And ice cream.']), 'groc_list', 2);
    case 'groc_yes': return R(pick(['You\'re the best.', 'My hero x']), null, 3, 'promiseGroc');
    case 'groc_yes_ice': return R('Cookie dough. Don\'t you dare get vanilla.', null, 4, 'promiseGroc');
    case 'groc_no': return hot ? R('Fine. I\'ll do it. Again.', null, -2) : R('Okay, pizza it is then.', null, 0);
    case 'groc_tease': return hot ? R('Excuse me?? Get the groceries.', 'groc_list', -2) : R('Rude 😂 Get the groceries.', 'groc_list', 1);
    case 'dinner_plate': return R('Fine, but it\'s better hot. Hurry.', null, 1, 'promiseHome');
    case 'dinner_what': return R(pick(['Lasagne. Your favourite.', 'Steak. Don\'t make me wait.']), 'dinner_dish', 1);
    case 'dinner_ate': return R(hot ? 'I cooked for an HOUR.' : 'Oh. Okay. More for me then.', null, hot ? -4 : -1);
    case 'dinner_takeaway': return R('I will throw this lasagne at you.', 'dinner_dish', 0);
    case 'baby_how': return R(pick(['Tired. Huge. Happy.', 'Like a whale. A happy whale.']), 'baby', 3);
    case 'baby_need': return R('Pickles. And ice cream. Don\'t judge us.', 'baby_need', 2);
    case 'kid_fridge': return R('They\'ll be so happy.', null, 3);
    case 'kid_story': return R('The dragon one. Again. Good luck.', null, 3, 'promiseHome');
    // sorry / trouble
    case 'su_sorry': return R(hot ? 'Something always comes up.' : 'Hmm. Okay. Don\'t do it again.', null, hot ? 0 : 2);
    case 'su_makeup': return R(pick(['You better. Pick me up tonight then.', 'Dinner. Your treat. Tonight.']), 'hang', 4);
    case 'su_cold': return R(pick(['Wow. Okay. Bye.', 'Not that deep? Lose my number.']), null, -8);
    case 'ch_explain': return R('Go on then.', 'cheat_explain', 0);
    case 'ch_sorry': return C.rel > 50 ? R('I need time. Don\'t come near me tonight.', null, -10) : R('Sorry doesn\'t fix this. We\'re done.', null, -20, 'breakup');
    case 'ch_deny': return Math.random() < 0.4 ? R('...Okay. I want to believe you.', null, -5) : R('Don\'t lie to me. I know what I saw.', null, -15);
    case 'ch_cold': return R('Whatever?? We\'re finished.', null, -25, 'breakup');
    case 'talk_what': return R(pick(['I never see you anymore.', 'I feel like I\'m doing this on my own.']), 'talk_why', 0);
    case 'talk_wait': return R('Fine. But you\'re coming home tonight.', null, 0, 'promiseHome');
    case 'talk_no': return R('It\'s never a good time with you.', null, -5);
    case 'talk_better': return R('...Okay. I\'ll hold you to that.', null, 6, 'promiseHome');
    case 'talk_forus': return R('I don\'t need money. I need you here.', null, 0);
    case 'talk_cold': return R('Overreacting?! Wow.', null, -10);
    case 'pu_five': return R(pick(['Yay! Outside now.', 'Hurry, it\'s cold!']), null, 2);
    case 'pu_late': return R(hot ? 'Seriously? Fine. Hurry.' : 'Okay, I\'ll wait x', null, hot ? -1 : 0, 'meetExtend');
    case 'pu_bail': return R(hot ? pick(['Wow. I literally got ready.', 'Seriously?? Fine.']) : 'Oh. Okay. Another time.', null, -6, 'meetCancel');
    // kids
    case 'km_send': return C.money >= 50 ? R(pick(['YES. Best dad ever!', 'Thank youuu!']), null, 5, 'send50') : R('...Dad, you\'re broke aren\'t you.', null, 0);
    case 'km_what': return R(pick(['Cinema with Jess and them.', 'New trainers. Mine have a hole.']), 'kidmoney_why', 0);
    case 'km_home': return R('It\'s done!! Mostly.', 'kidmoney_why', 0);
    case 'km_no': return R('Ugh. Fine.', null, -2);
    case 'kr_yes': return R('Thank you!! Be quick.', null, 4);
    case 'kr_mum': return R('She said ask YOU.', 'kidride', 0);
    case 'kr_no': return R('Wow. Thanks Dad.', null, -3);
    case 'kg_proud': return R('😊😊', null, 5);
    case 'kg_pizza': return R('PIZZA!!! Best dad.', null, 6, 'promiseHome');
    case 'kg_meh': return R('...Nice? That\'s it?', null, -2);
    case 'ak_luck': return R('Thanks Dad. Means a lot.', null, 5);
    case 'ak_dinner': return R('Sunday? I\'ll bring dessert.', null, 4);
    case 'ak_later': return R('Okay. Love you.', null, 1);
    case 'k_school': return R(pick(['Fine.', 'Boring. As always.', 'We had a fire drill! It was sick.']), null, 2);
    case 'k_love': return R(pick(['Love you too.', 'Dad. Embarrassing. ...Love you.']), null, 3);
    case 'k_need': return R(pick(['Can I get $20?', 'Nah I\'m good.']), 'kidmoney', 1);
    case 'k_curfew': return R('Ugh. Fine.', null, 0);
    // exes
    case 'ex_hey': return R('Can we meet up? I\'ve been thinking about us.', null, 1);
    case 'ex_why': return R('Sorry. Forget it.', null, -2);
    case 'ex_bye': return R('...Okay. I get it.', null, 0);
  }
  return R(pick(['Haha.', 'lol', 'You\'re funny.']), null, 0);
}
